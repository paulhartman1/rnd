alter table public.leads
add column if not exists deleted_at timestamptz;

create index if not exists leads_active_created_at_idx
on public.leads (created_at desc)
where deleted_at is null;
