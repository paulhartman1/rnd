create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop policy if exists "Authenticated can read appointments" on public.appointments;
create policy "Authenticated can read appointments"
on public.appointments
for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert appointments" on public.appointments;
create policy "Authenticated can insert appointments"
on public.appointments
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update appointments" on public.appointments;
create policy "Authenticated can update appointments"
on public.appointments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete appointments" on public.appointments;
create policy "Authenticated can delete appointments"
on public.appointments
for delete
to authenticated
using (true);
