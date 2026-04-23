-- Create batchleads table to store raw imported data
create table if not exists public.batchleads (
  id uuid primary key default gen_random_uuid(),
  
  -- Lead Status & Identifiers
  lead_status text,
  
  -- Owner Information
  first_name text,
  last_name text,
  owner_2_first_name text,
  owner_2_last_name text,
  
  -- Mailing Address
  mailing_address text,
  mailing_city text,
  mailing_state text,
  mailing_zip text,
  mailing_county text,
  
  -- Property Address
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  property_county text,
  
  -- Contact Information
  email text,
  email_2 text,
  phone_1 text,
  phone_1_dnc boolean,
  phone_1_type text,
  phone_2 text,
  phone_2_dnc boolean,
  phone_2_type text,
  phone_3 text,
  phone_3_dnc boolean,
  phone_3_type text,
  phone_4 text,
  phone_4_dnc boolean,
  phone_4_type text,
  phone_5 text,
  phone_5_dnc boolean,
  phone_5_type text,
  office text,
  
  -- Flags
  litigator boolean,
  is_vacant boolean,
  is_mailing_vacant boolean,
  opt_out boolean,
  contact_obtained boolean,
  
  -- Counts
  list_count integer,
  tag_count integer,
  parcel_count integer,
  unit_count integer,
  commercial_unit_count integer,
  residential_unit_count integer,
  
  -- Property Details
  apn text,
  property_type_detail text,
  owner_occupied boolean,
  bedroom_count integer,
  bathroom_count integer,
  total_building_area_sqft integer,
  lot_size_sqft integer,
  year_built integer,
  zoning_code text,
  
  -- Financial Information
  total_assessed_value numeric(15, 2),
  last_sale_date date,
  last_sale_price numeric(15, 2),
  total_loan_balance numeric(15, 2),
  equity_current_estimated_balance numeric(15, 2),
  estimated_value numeric(15, 2),
  ltv_current_estimated_combined numeric(5, 2),
  arv numeric(15, 2),
  spread numeric(15, 2),
  pct_arv numeric(5, 2),
  
  -- MLS Information
  mls_status text,
  mls_listing_date date,
  mls_listing_amount numeric(15, 2),
  mls_listing_agent_fullname text,
  mls_agent_primary_phone text,
  mls_agent_email text,
  mls_agent_brokerage_name text,
  mls_agent_brokerage_phone text,
  
  -- Loan Information
  loan_recording_date date,
  loan_type text,
  loan_amount numeric(15, 2),
  loan_lender_name text,
  loan_due_date date,
  loan_est_payment numeric(15, 2),
  loan_est_interest_rate numeric(5, 2),
  loan_est_balance numeric(15, 2),
  loan_term_months integer,
  
  -- Foreclosure Information
  foreclosure_document_type text,
  foreclosure_status text,
  foreclosure_auction_date date,
  foreclosure_loan_default_date date,
  foreclosure_loan_recording_date date,
  foreclosure_case_number text,
  foreclosure_trustee_attorney_name text,
  
  -- Other
  self_managed boolean,
  pushed_to_batchdialer boolean,
  batchrank_score_category text,
  tag_names text,
  notes text,
  list text,
  
  -- Timestamps
  batch_created_date timestamptz,
  batch_updated_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create mapping table between batchleads and leads
create table if not exists public.batchleads_mapping (
  id uuid primary key default gen_random_uuid(),
  batchlead_id uuid not null references public.batchleads(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  mapping_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one-to-one mapping
  unique(batchlead_id),
  unique(lead_id)
);

-- Add trigger for batchleads updated_at
drop trigger if exists batchleads_set_updated_at on public.batchleads;
create trigger batchleads_set_updated_at
before update on public.batchleads
for each row
execute function public.set_updated_at();

-- Add trigger for batchleads_mapping updated_at
drop trigger if exists batchleads_mapping_set_updated_at on public.batchleads_mapping;
create trigger batchleads_mapping_set_updated_at
before update on public.batchleads_mapping
for each row
execute function public.set_updated_at();

-- Create indexes
create index if not exists batchleads_email_idx on public.batchleads (email);
create index if not exists batchleads_phone_1_idx on public.batchleads (phone_1);
create index if not exists batchleads_property_address_idx on public.batchleads (property_address);
create index if not exists batchleads_created_at_idx on public.batchleads (created_at desc);
create index if not exists batchleads_mapping_batchlead_idx on public.batchleads_mapping (batchlead_id);
create index if not exists batchleads_mapping_lead_idx on public.batchleads_mapping (lead_id);

-- Enable RLS
alter table public.batchleads enable row level security;
alter table public.batchleads_mapping enable row level security;

-- RLS Policies for batchleads
drop policy if exists "Service role can read batchleads" on public.batchleads;
create policy "Service role can read batchleads"
on public.batchleads
for select
to service_role
using (true);

drop policy if exists "Service role can insert batchleads" on public.batchleads;
create policy "Service role can insert batchleads"
on public.batchleads
for insert
to service_role
with check (true);

drop policy if exists "Service role can update batchleads" on public.batchleads;
create policy "Service role can update batchleads"
on public.batchleads
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete batchleads" on public.batchleads;
create policy "Service role can delete batchleads"
on public.batchleads
for delete
to service_role
using (true);

-- RLS Policies for batchleads_mapping
drop policy if exists "Service role can read batchleads_mapping" on public.batchleads_mapping;
create policy "Service role can read batchleads_mapping"
on public.batchleads_mapping
for select
to service_role
using (true);

drop policy if exists "Service role can insert batchleads_mapping" on public.batchleads_mapping;
create policy "Service role can insert batchleads_mapping"
on public.batchleads_mapping
for insert
to service_role
with check (true);

drop policy if exists "Service role can update batchleads_mapping" on public.batchleads_mapping;
create policy "Service role can update batchleads_mapping"
on public.batchleads_mapping
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete batchleads_mapping" on public.batchleads_mapping;
create policy "Service role can delete batchleads_mapping"
on public.batchleads_mapping
for delete
to service_role
using (true);
