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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.leads enable row level security;

drop policy if exists "Public can insert leads" on public.leads;
create policy "Public can insert leads"
on public.leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read leads" on public.leads;
create policy "Authenticated can read leads"
on public.leads
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update leads" on public.leads;
create policy "Authenticated can update leads"
on public.leads
for update
to authenticated
using (true)
with check (true);
