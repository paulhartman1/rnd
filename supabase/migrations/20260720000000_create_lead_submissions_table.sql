-- Create lead_submissions table for rate limiting and abuse detection
-- This table tracks all lead submission attempts (accepted and rejected)
-- without polluting the main leads table with spam/rejected entries

create table if not exists public.lead_submissions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  ip_address text not null,
  user_agent text,
  email text,
  phone text,
  accepted boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- Indexes for efficient rate limit queries
create index if not exists lead_submissions_ip_address_idx on public.lead_submissions (ip_address);
create index if not exists lead_submissions_created_at_idx on public.lead_submissions (created_at desc);
create index if not exists lead_submissions_source_id_idx on public.lead_submissions (source_id);
create index if not exists lead_submissions_ip_created_at_idx on public.lead_submissions (ip_address, created_at desc);

-- Enable RLS
alter table public.lead_submissions enable row level security;

-- RLS Policies - only service role can interact with this table
drop policy if exists "Service role can read lead_submissions" on public.lead_submissions;
create policy "Service role can read lead_submissions"
on public.lead_submissions
for select
to service_role
using (true);

drop policy if exists "Service role can insert lead_submissions" on public.lead_submissions;
create policy "Service role can insert lead_submissions"
on public.lead_submissions
for insert
to service_role
with check (true);

drop policy if exists "Service role can update lead_submissions" on public.lead_submissions;
create policy "Service role can update lead_submissions"
on public.lead_submissions
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete lead_submissions" on public.lead_submissions;
create policy "Service role can delete lead_submissions"
on public.lead_submissions
for delete
to service_role
using (true);
