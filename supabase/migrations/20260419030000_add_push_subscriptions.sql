-- Create push_subscriptions table for storing admin device push subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add updated_at trigger
drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- RLS policies for push_subscriptions (service role only)
drop policy if exists "Service role can read push_subscriptions" on public.push_subscriptions;
create policy "Service role can read push_subscriptions"
on public.push_subscriptions
for select
to service_role
using (true);

drop policy if exists "Service role can insert push_subscriptions" on public.push_subscriptions;
create policy "Service role can insert push_subscriptions"
on public.push_subscriptions
for insert
to service_role
with check (true);

drop policy if exists "Service role can update push_subscriptions" on public.push_subscriptions;
create policy "Service role can update push_subscriptions"
on public.push_subscriptions
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete push_subscriptions" on public.push_subscriptions;
create policy "Service role can delete push_subscriptions"
on public.push_subscriptions
for delete
to service_role
using (true);

-- Create index on endpoint for faster lookups
create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);
create index if not exists push_subscriptions_is_active_idx on public.push_subscriptions (is_active);
