-- Property Valuation Domain Migration
-- Creates property_valuations table and supporting infrastructure
-- Keeps properties.estimated_value as denormalized cache for backwards compatibility

-- ============================================================================
-- Create property_valuations table
-- ============================================================================

create table if not exists public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  
  -- Valuation amount and purpose
  value numeric(15, 2) not null,
  valuation_purpose text not null check (
    valuation_purpose in (
      'as_is_market_value',
      'after_repair_value',
      'underwriting_value',
      'other'
    )
  ),
  
  -- Valuation metadata
  valuation_method text check (
    valuation_method in (
      'automated_provider',
      'manual_entry',
      'comp_analysis',
      'broker_price_opinion',
      'appraisal',
      'other'
    )
  ),
  valuation_source text,
  valuation_date date not null default current_date,
  
  -- Confidence and quality metrics
  confidence_score integer check (confidence_score between 0 and 100),
  comparable_count integer check (comparable_count >= 0),
  
  -- Additional context
  notes text,
  provider_metadata jsonb default '{}'::jsonb,
  
  -- Audit fields
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Add indexes for performance
-- ============================================================================

create index idx_property_valuations_property_id 
  on public.property_valuations (property_id);

create index idx_property_valuations_valuation_date 
  on public.property_valuations (valuation_date desc);

create index idx_property_valuations_purpose 
  on public.property_valuations (valuation_purpose);

create index idx_property_valuations_source 
  on public.property_valuations (valuation_source);

-- ============================================================================
-- Add current_valuation_id to properties
-- ============================================================================

alter table public.properties 
  add column if not exists current_valuation_id uuid 
  references public.property_valuations(id) on delete set null;

create index idx_properties_current_valuation 
  on public.properties (current_valuation_id);

-- ============================================================================
-- Trigger to sync estimated_value when current_valuation_id changes
-- ============================================================================

create or replace function sync_estimated_value()
returns trigger as $$
begin
  if new.current_valuation_id is not null then
    new.estimated_value := (
      select value 
      from property_valuations 
      where id = new.current_valuation_id
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger sync_estimated_value_trigger
  before update of current_valuation_id on properties
  for each row
  execute function sync_estimated_value();

-- ============================================================================
-- Trigger for updated_at timestamp
-- ============================================================================

create trigger property_valuations_set_updated_at
  before update on public.property_valuations
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

alter table public.property_valuations enable row level security;

-- Authenticated users can read all property valuations
drop policy if exists "Authenticated users can read valuations" on public.property_valuations;
create policy "Authenticated users can read valuations"
  on public.property_valuations for select
  to authenticated
  using (true);

-- Authenticated users can insert valuations
drop policy if exists "Authenticated users can create valuations" on public.property_valuations;
create policy "Authenticated users can create valuations"
  on public.property_valuations for insert
  to authenticated
  with check (true);

-- Users can update their own valuations (notes only - enforced at app level)
drop policy if exists "Users can update valuation notes" on public.property_valuations;
create policy "Users can update valuation notes"
  on public.property_valuations for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Service role has full access (for provider integrations)
drop policy if exists "Service role has full access" on public.property_valuations;
create policy "Service role has full access"
  on public.property_valuations for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

comment on table public.property_valuations is 
  'Historical valuations for properties. Tracks value, purpose (as-is, ARV, etc), source, and metadata.';

comment on column public.property_valuations.property_id is 
  'Foreign key to properties table';

comment on column public.property_valuations.value is 
  'Valuation amount in dollars';

comment on column public.property_valuations.valuation_purpose is 
  'Purpose of valuation: as_is_market_value, after_repair_value, underwriting_value, or other';

comment on column public.property_valuations.valuation_method is 
  'How valuation was obtained: automated_provider, manual_entry, comp_analysis, broker_price_opinion, appraisal, other';

comment on column public.property_valuations.valuation_source is 
  'Source of valuation (e.g., "RentCast", "Manual", "BPO from Smith Realty")';

comment on column public.property_valuations.confidence_score is 
  'Confidence score 0-100, typically provided by automated valuation models';

comment on column public.property_valuations.comparable_count is 
  'Number of comparable properties used in valuation';

comment on column public.property_valuations.provider_metadata is 
  'JSONB field for provider-specific data (raw API responses, comparable addresses, etc)';

comment on column public.properties.current_valuation_id is 
  'Foreign key to currently-selected valuation for this property';
