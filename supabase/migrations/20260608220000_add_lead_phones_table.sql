-- Create table to store multiple phone numbers per lead
create table if not exists public.lead_phones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  phone_number text not null,
  phone_type text, -- e.g., 'mobile', 'landline', 'voip', etc.
  is_primary boolean not null default false,
  is_dnc boolean not null default false, -- Do Not Call flag
  validation_status text check (validation_status in ('unknown', 'valid', 'invalid', 'disconnected', 'wrong_number')) default 'unknown',
  validation_notes text, -- Notes about why it's invalid
  last_called_at timestamptz,
  call_attempts integer not null default 0,
  display_order integer not null default 0, -- Order to display/try phones
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add trigger for updated_at
drop trigger if exists lead_phones_set_updated_at on public.lead_phones;
create trigger lead_phones_set_updated_at
before update on public.lead_phones
for each row
execute function public.set_updated_at();

-- Create indexes
create index if not exists lead_phones_lead_id_idx on public.lead_phones (lead_id);
create index if not exists lead_phones_primary_idx on public.lead_phones (lead_id, is_primary) where is_primary = true;
create index if not exists lead_phones_display_order_idx on public.lead_phones (lead_id, display_order);

-- Enable RLS
alter table public.lead_phones enable row level security;

-- RLS Policies
drop policy if exists "Service role can read lead_phones" on public.lead_phones;
create policy "Service role can read lead_phones"
on public.lead_phones
for select
to service_role
using (true);

drop policy if exists "Service role can insert lead_phones" on public.lead_phones;
create policy "Service role can insert lead_phones"
on public.lead_phones
for insert
to service_role
with check (true);

drop policy if exists "Service role can update lead_phones" on public.lead_phones;
create policy "Service role can update lead_phones"
on public.lead_phones
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete lead_phones" on public.lead_phones;
create policy "Service role can delete lead_phones"
on public.lead_phones
for delete
to service_role
using (true);

-- Authenticated users can read lead_phones
drop policy if exists "Authenticated users can read lead_phones" on public.lead_phones;
create policy "Authenticated users can read lead_phones"
on public.lead_phones
for select
to authenticated
using (true);

-- Authenticated users can update lead_phones (for validation status)
drop policy if exists "Authenticated users can update lead_phones" on public.lead_phones;
create policy "Authenticated users can update lead_phones"
on public.lead_phones
for update
to authenticated
using (true)
with check (true);

-- Function to ensure only one primary phone per lead
create or replace function public.ensure_single_primary_phone()
returns trigger
language plpgsql
as $$
begin
  if new.is_primary = true then
    -- Unset all other primary flags for this lead
    update public.lead_phones
    set is_primary = false
    where lead_id = new.lead_id
      and id != new.id
      and is_primary = true;
  end if;
  
  return new;
end;
$$;

drop trigger if exists ensure_single_primary_phone_trigger on public.lead_phones;
create trigger ensure_single_primary_phone_trigger
before insert or update on public.lead_phones
for each row
when (new.is_primary = true)
execute function public.ensure_single_primary_phone();

-- Function to sync primary phone back to leads table
create or replace function public.sync_primary_phone_to_lead()
returns trigger
language plpgsql
as $$
begin
  if new.is_primary = true then
    -- Update the lead's phone column with the primary phone
    update public.leads
    set phone = new.phone_number
    where id = new.lead_id;
  end if;
  
  return new;
end;
$$;

drop trigger if exists sync_primary_phone_to_lead_trigger on public.lead_phones;
create trigger sync_primary_phone_to_lead_trigger
after insert or update on public.lead_phones
for each row
when (new.is_primary = true)
execute function public.sync_primary_phone_to_lead();

-- Migrate existing phone numbers from leads table to lead_phones
do $$
declare
  lead_record record;
begin
  for lead_record in 
    select id, phone 
    from public.leads 
    where phone is not null and phone != ''
      and not exists (
        select 1 from public.lead_phones 
        where lead_id = leads.id
      )
  loop
    insert into public.lead_phones (
      lead_id, 
      phone_number, 
      is_primary, 
      display_order
    ) values (
      lead_record.id,
      lead_record.phone,
      true,
      0
    );
  end loop;
end;
$$;

-- Helper function to import phones from batchleads
comment on table public.lead_phones is 'Stores multiple phone numbers per lead with validation status. Use this when importing from batchleads to preserve all phone_1 through phone_5 data.';
