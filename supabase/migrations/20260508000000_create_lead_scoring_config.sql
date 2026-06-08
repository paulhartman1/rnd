-- Create lead_scoring_config table for configurable lead scoring weights
create table if not exists public.lead_scoring_config (
  id uuid primary key default gen_random_uuid(),
  
  -- Configuration metadata
  config_name text unique not null,
  description text,
  is_active boolean not null default false,
  
  -- Base score (default starting point before applying criteria)
  base_score integer not null default 50,
  
  -- Scoring criteria as flexible JSONB structure
  -- This allows adding new criteria without schema changes
  criteria jsonb not null default '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure only one config can be active at a time
create unique index if not exists lead_scoring_config_single_active_idx 
on public.lead_scoring_config (is_active) 
where is_active = true;

-- Index for quick lookup of active config
create index if not exists lead_scoring_config_active_idx 
on public.lead_scoring_config (is_active) 
where is_active = true;

-- Trigger for updated_at
drop trigger if exists lead_scoring_config_set_updated_at on public.lead_scoring_config;
create trigger lead_scoring_config_set_updated_at
before update on public.lead_scoring_config
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.lead_scoring_config enable row level security;

-- RLS Policies
drop policy if exists "Service role can read lead_scoring_config" on public.lead_scoring_config;
create policy "Service role can read lead_scoring_config"
on public.lead_scoring_config
for select
to service_role
using (true);

drop policy if exists "Authenticated users can read lead_scoring_config" on public.lead_scoring_config;
create policy "Authenticated users can read lead_scoring_config"
on public.lead_scoring_config
for select
to authenticated
using (true);

drop policy if exists "Service role can insert lead_scoring_config" on public.lead_scoring_config;
create policy "Service role can insert lead_scoring_config"
on public.lead_scoring_config
for insert
to service_role
with check (true);

drop policy if exists "Service role can update lead_scoring_config" on public.lead_scoring_config;
create policy "Service role can update lead_scoring_config"
on public.lead_scoring_config
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete lead_scoring_config" on public.lead_scoring_config;
create policy "Service role can delete lead_scoring_config"
on public.lead_scoring_config
for delete
to service_role
using (true);

-- Seed default configuration with current hardcoded values
insert into public.lead_scoring_config (config_name, description, is_active, base_score, criteria)
values (
  'attom_import_default',
  'Default scoring configuration based on original hardcoded values',
  true,
  50,
  '{
    "absentee_owner": {
      "points": 15,
      "enabled": true,
      "description": "Owner does not live at the property address"
    },
    "corporate_owner": {
      "points": 10,
      "enabled": true,
      "description": "Property is owned by a corporate entity"
    },
    "out_of_state_owner": {
      "points": 10,
      "enabled": true,
      "description": "Owner mailing address is in a different state"
    },
    "equity_ranges": [
      {
        "min": 50,
        "max": 100,
        "points": 15,
        "enabled": true,
        "description": "High equity (50%+)"
      },
      {
        "min": 30,
        "max": 49,
        "points": 10,
        "enabled": true,
        "description": "Medium equity (30-49%)"
      },
      {
        "min": 0,
        "max": 19,
        "points": -10,
        "enabled": true,
        "description": "Low equity (<20%)"
      }
    ],
    "property_age": {
      "min_years": 40,
      "points": 5,
      "enabled": true,
      "description": "Property built 40+ years ago"
    }
  }'::jsonb
)
on conflict (config_name) do nothing;
