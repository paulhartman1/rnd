-- Fix RLS policies for appointment_types to match leads pattern
drop policy if exists "Service role can manage appointment types" on public.appointment_types;

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

-- Fix RLS policies for availability_windows
drop policy if exists "Service role can manage availability windows" on public.availability_windows;

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

-- Fix RLS policies for blackout_periods
drop policy if exists "Service role can manage blackout periods" on public.blackout_periods;

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

-- Fix RLS policies for appointment_requests
drop policy if exists "Service role can manage appointment requests" on public.appointment_requests;

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