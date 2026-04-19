-- Create sources table
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add updated_at trigger for sources
drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
before update on public.sources
for each row
execute function public.set_updated_at();

-- Enable RLS on sources
alter table public.sources enable row level security;

-- RLS policies for sources
drop policy if exists "Service role can read sources" on public.sources;
create policy "Service role can read sources"
on public.sources
for select
to service_role
using (true);

drop policy if exists "Service role can insert sources" on public.sources;
create policy "Service role can insert sources"
on public.sources
for insert
to service_role
with check (true);

drop policy if exists "Service role can update sources" on public.sources;
create policy "Service role can update sources"
on public.sources
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete sources" on public.sources;
create policy "Service role can delete sources"
on public.sources
for delete
to service_role
using (true);

-- Seed default sources
do $$
begin
  if not exists (select 1 from public.sources limit 1) then
    insert into public.sources (name, description, is_active)
    values
      ('web', 'Lead submitted through website form', true),
      ('referral', 'Lead received through referral', true),
      ('direct-mail', 'Lead from direct mail campaign', true),
      ('phone', 'Lead received via phone call', true),
      ('social-media', 'Lead from social media channels', true);
  end if;
end $$;

-- Add source_id column to leads table with default to 'web' source
do $$
declare
  web_source_id uuid;
begin
  -- Get the web source ID
  select id into web_source_id from public.sources where name = 'web' limit 1;
  
  -- Add column with default
  execute format(
    'alter table public.leads add column if not exists source_id uuid not null references public.sources(id) default %L',
    web_source_id
  );
end $$;

-- Create index on source_id
create index if not exists leads_source_id_idx on public.leads (source_id);
