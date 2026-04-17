-- Create appointment_types table
create table if not exists public.appointment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_duration_minutes integer not null default 60,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create availability_windows table
create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

-- Create blackout_periods table
create table if not exists public.blackout_periods (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_blackout_range check (end_time > start_time)
);

-- Create appointment_requests table
create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_type_id uuid references public.appointment_types(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  requested_start_time timestamptz not null,
  requested_end_time timestamptz not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend appointments table with new columns
alter table public.appointments
add column if not exists appointment_type_id uuid references public.appointment_types(id) on delete set null;

alter table public.appointments
add column if not exists travel_time_minutes integer;

-- Create triggers for updated_at
drop trigger if exists appointment_types_set_updated_at on public.appointment_types;
create trigger appointment_types_set_updated_at
before update on public.appointment_types
for each row
execute function public.set_updated_at();

drop trigger if exists availability_windows_set_updated_at on public.availability_windows;
create trigger availability_windows_set_updated_at
before update on public.availability_windows
for each row
execute function public.set_updated_at();

drop trigger if exists blackout_periods_set_updated_at on public.blackout_periods;
create trigger blackout_periods_set_updated_at
before update on public.blackout_periods
for each row
execute function public.set_updated_at();

drop trigger if exists appointment_requests_set_updated_at on public.appointment_requests;
create trigger appointment_requests_set_updated_at
before update on public.appointment_requests
for each row
execute function public.set_updated_at();

-- Create indexes
create index if not exists appointment_types_active_idx on public.appointment_types (is_active, display_order) where is_active = true;
create index if not exists availability_windows_day_idx on public.availability_windows (day_of_week) where is_active = true;
create index if not exists blackout_periods_time_idx on public.blackout_periods (start_time, end_time);
create index if not exists appointment_requests_status_idx on public.appointment_requests (status, created_at desc);
create index if not exists appointment_requests_type_idx on public.appointment_requests (appointment_type_id);
create index if not exists appointments_type_idx on public.appointments (appointment_type_id);

-- Enable RLS
alter table public.appointment_types enable row level security;
alter table public.availability_windows enable row level security;
alter table public.blackout_periods enable row level security;
alter table public.appointment_requests enable row level security;

-- RLS Policies for appointment_types
drop policy if exists "Public can read active appointment types" on public.appointment_types;
create policy "Public can read active appointment types"
on public.appointment_types
for select
to anon
using (is_active = true);

drop policy if exists "Service role can read appointment types" on public.appointment_types;
create policy "Service role can read appointment types"
on public.appointment_types
for select
to service_role
using (true);

drop policy if exists "Service role can insert appointment types" on public.appointment_types;
create policy "Service role can insert appointment types"
on public.appointment_types
for insert
to service_role
with check (true);

drop policy if exists "Service role can update appointment types" on public.appointment_types;
create policy "Service role can update appointment types"
on public.appointment_types
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete appointment types" on public.appointment_types;
create policy "Service role can delete appointment types"
on public.appointment_types
for delete
to service_role
using (true);

-- RLS Policies for availability_windows
drop policy if exists "Public can read active availability windows" on public.availability_windows;
create policy "Public can read active availability windows"
on public.availability_windows
for select
to anon
using (is_active = true);

drop policy if exists "Service role can read availability windows" on public.availability_windows;
create policy "Service role can read availability windows"
on public.availability_windows
for select
to service_role
using (true);

drop policy if exists "Service role can insert availability windows" on public.availability_windows;
create policy "Service role can insert availability windows"
on public.availability_windows
for insert
to service_role
with check (true);

drop policy if exists "Service role can update availability windows" on public.availability_windows;
create policy "Service role can update availability windows"
on public.availability_windows
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete availability windows" on public.availability_windows;
create policy "Service role can delete availability windows"
on public.availability_windows
for delete
to service_role
using (true);

-- RLS Policies for blackout_periods
drop policy if exists "Public can read blackout periods" on public.blackout_periods;
create policy "Public can read blackout periods"
on public.blackout_periods
for select
to anon
using (true);

drop policy if exists "Service role can read blackout periods" on public.blackout_periods;
create policy "Service role can read blackout periods"
on public.blackout_periods
for select
to service_role
using (true);

drop policy if exists "Service role can insert blackout periods" on public.blackout_periods;
create policy "Service role can insert blackout periods"
on public.blackout_periods
for insert
to service_role
with check (true);

drop policy if exists "Service role can update blackout periods" on public.blackout_periods;
create policy "Service role can update blackout periods"
on public.blackout_periods
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete blackout periods" on public.blackout_periods;
create policy "Service role can delete blackout periods"
on public.blackout_periods
for delete
to service_role
using (true);

-- RLS Policies for appointment_requests
drop policy if exists "Public can insert appointment requests" on public.appointment_requests;
create policy "Public can insert appointment requests"
on public.appointment_requests
for insert
to anon
with check (true);

drop policy if exists "Service role can read appointment requests" on public.appointment_requests;
create policy "Service role can read appointment requests"
on public.appointment_requests
for select
to service_role
using (true);

drop policy if exists "Service role can insert appointment requests" on public.appointment_requests;
create policy "Service role can insert appointment requests"
on public.appointment_requests
for insert
to service_role
with check (true);

drop policy if exists "Service role can update appointment requests" on public.appointment_requests;
create policy "Service role can update appointment requests"
on public.appointment_requests
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete appointment requests" on public.appointment_requests;
create policy "Service role can delete appointment requests"
on public.appointment_requests
for delete
to service_role
using (true);

-- Insert default appointment types
insert into public.appointment_types (name, description, default_duration_minutes, display_order)
values 
  ('Property Visit', 'In-person visit to view and assess the property', 90, 1),
  ('Initial Consultation', 'First meeting to discuss your property and needs', 45, 2),
  ('Follow-up Meeting', 'Follow-up discussion or additional visit', 60, 3)
on conflict do nothing;

-- Insert default availability windows (Monday-Friday, 9 AM - 5 PM)
insert into public.availability_windows (day_of_week, start_time, end_time, is_active)
values 
  (1, '09:00:00', '17:00:00', true), -- Monday
  (2, '09:00:00', '17:00:00', true), -- Tuesday
  (3, '09:00:00', '17:00:00', true), -- Wednesday
  (4, '09:00:00', '17:00:00', true), -- Thursday
  (5, '09:00:00', '17:00:00', true)  -- Friday
on conflict do nothing;