create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  listed_with_agent boolean not null,
  property_type text not null,
  owns_land boolean not null,
  repairs_needed text not null,
  close_timeline text not null,
  sell_reason text not null,
  acceptable_offer text not null,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  sms_consent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'offer-sent', 'under-contract', 'closed', 'archived')),
  owner_notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads
add column if not exists deleted_at timestamptz;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_active_created_at_idx on public.leads (created_at desc) where deleted_at is null;

alter table public.leads enable row level security;

drop policy if exists "Public can insert leads" on public.leads;
create policy "Public can insert leads"
on public.leads
for insert
to anon
with check (true);

drop policy if exists "Service role can read leads" on public.leads;
create policy "Service role can read leads"
on public.leads
for select
to service_role
using (true);

drop policy if exists "Service role can update leads" on public.leads;
create policy "Service role can update leads"
on public.leads
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete leads" on public.leads;
create policy "Service role can delete leads"
on public.leads
for delete
to service_role
using (true);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no-show')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

create index if not exists appointments_lead_id_idx on public.appointments (lead_id);
create index if not exists appointments_start_time_idx on public.appointments (start_time);
create index if not exists appointments_status_idx on public.appointments (status);

alter table public.appointments enable row level security;

drop policy if exists "Service role can read appointments" on public.appointments;
create policy "Service role can read appointments"
on public.appointments
for select
to service_role
using (true);

drop policy if exists "Service role can insert appointments" on public.appointments;
create policy "Service role can insert appointments"
on public.appointments
for insert
to service_role
with check (true);

drop policy if exists "Service role can update appointments" on public.appointments;
create policy "Service role can update appointments"
on public.appointments
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete appointments" on public.appointments;
create policy "Service role can delete appointments"
on public.appointments
for delete
to service_role
using (true);
