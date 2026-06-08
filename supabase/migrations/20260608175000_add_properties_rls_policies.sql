-- Enable RLS on properties table
alter table public.properties enable row level security;

-- Allow service role to read properties
drop policy if exists "Service role can read properties" on public.properties;
create policy "Service role can read properties"
on public.properties
for select
to service_role
using (true);

-- Allow service role to insert properties
drop policy if exists "Service role can insert properties" on public.properties;
create policy "Service role can insert properties"
on public.properties
for insert
to service_role
with check (true);

-- Allow service role to update properties
drop policy if exists "Service role can update properties" on public.properties;
create policy "Service role can update properties"
on public.properties
for update
to service_role
using (true)
with check (true);

-- Allow service role to delete properties
drop policy if exists "Service role can delete properties" on public.properties;
create policy "Service role can delete properties"
on public.properties
for delete
to service_role
using (true);

-- If you want authenticated users to also read (for future use)
drop policy if exists "Authenticated users can read properties" on public.properties;
create policy "Authenticated users can read properties"
on public.properties
for select
to authenticated
using (true);
