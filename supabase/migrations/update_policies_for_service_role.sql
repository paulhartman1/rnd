-- Migration: Update RLS policies to use service_role for admin operations
-- This script updates the RLS policies to allow only service_role for admin operations
-- and keeps public insert for leads (for the form submissions)

-- =====================
-- LEADS TABLE POLICIES
-- =====================

-- Drop existing policies
drop policy if exists "Public can insert leads" on public.leads;
drop policy if exists "Authenticated can read leads" on public.leads;
drop policy if exists "Authenticated can update leads" on public.leads;
drop policy if exists "Authenticated can delete leads" on public.leads;

-- Allow public (anon) to insert leads (for form submissions)
create policy "Public can insert leads"
on public.leads
for insert
to anon
with check (true);

-- Service role can read all leads
create policy "Service role can read leads"
on public.leads
for select
to service_role
using (true);

-- Service role can update leads
create policy "Service role can update leads"
on public.leads
for update
to service_role
using (true)
with check (true);

-- Service role can delete leads
create policy "Service role can delete leads"
on public.leads
for delete
to service_role
using (true);

-- ============================
-- APPOINTMENTS TABLE POLICIES
-- ============================

-- Drop existing policies
drop policy if exists "Authenticated can read appointments" on public.appointments;
drop policy if exists "Authenticated can insert appointments" on public.appointments;
drop policy if exists "Authenticated can update appointments" on public.appointments;
drop policy if exists "Authenticated can delete appointments" on public.appointments;

-- Service role can read all appointments
create policy "Service role can read appointments"
on public.appointments
for select
to service_role
using (true);

-- Service role can insert appointments
create policy "Service role can insert appointments"
on public.appointments
for insert
to service_role
with check (true);

-- Service role can update appointments
create policy "Service role can update appointments"
on public.appointments
for update
to service_role
using (true)
with check (true);

-- Service role can delete appointments
create policy "Service role can delete appointments"
on public.appointments
for delete
to service_role
using (true);
