-- Create attom_properties table for Attom API property data
create table if not exists public.attom_properties (
  id uuid primary key default gen_random_uuid(),
  
  -- Identifiers
  attom_id text unique,
  apn text,
  fips text,
  
  -- Property Address
  address1 text not null,
  address2 text,
  city text not null,
  state text not null,
  zip_code text not null,
  
  -- Property Details (from snapshot/detail)
  property_type text,
  property_indicator integer,
  bedrooms integer,
  bathrooms numeric(3, 1),
  square_feet integer,
  lot_size_sqft integer,
  lot_size_acres numeric(10, 4),
  year_built integer,
  
  -- Ownership (from detailowner)
  owner_first_name text,
  owner_last_name text,
  owner_full_name text,
  is_corporate_owned boolean default false,
  is_absentee_owner boolean default false,
  is_out_of_state_owner boolean default false,
  
  -- Mailing Address (from detailowner)
  mailing_address1 text,
  mailing_city text,
  mailing_state text,
  mailing_zip_code text,
  
  -- Valuation (from assessment/avm)
  assessed_value numeric(15, 2),
  market_value numeric(15, 2),
  avm_value numeric(15, 2),
  avm_confidence_score integer,
  avm_high numeric(15, 2),
  avm_low numeric(15, 2),
  tax_amount numeric(15, 2),
  
  -- Sale History (from sale/detail)
  last_sale_date date,
  last_sale_price numeric(15, 2),
  last_sale_type text,
  
  -- Mortgage (from detailmortgageowner, if needed later)
  mortgage_amount numeric(15, 2),
  mortgage_date date,
  mortgage_lender text,
  
  -- Calculated Fields
  estimated_equity_percent numeric(5, 2),
  import_score integer not null default 50,
  
  -- Lead Conversion
  imported_as_lead boolean not null default false,
  imported_lead_id uuid references public.leads(id) on delete set null,
  
  -- Raw Data & Metadata
  raw_data jsonb,
  enrichment_phase integer not null default 1, -- 1=snapshot, 2=owner, 3=valuation
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile schema if the table already existed from a partial/manual run
alter table public.attom_properties add column if not exists attom_id text;
alter table public.attom_properties add column if not exists apn text;
alter table public.attom_properties add column if not exists fips text;
alter table public.attom_properties add column if not exists address1 text;
alter table public.attom_properties add column if not exists address2 text;
alter table public.attom_properties add column if not exists city text;
alter table public.attom_properties add column if not exists state text;
alter table public.attom_properties add column if not exists zip_code text;
alter table public.attom_properties add column if not exists property_type text;
alter table public.attom_properties add column if not exists property_indicator integer;
alter table public.attom_properties add column if not exists bedrooms integer;
alter table public.attom_properties add column if not exists bathrooms numeric(3, 1);
alter table public.attom_properties add column if not exists square_feet integer;
alter table public.attom_properties add column if not exists lot_size_sqft integer;
alter table public.attom_properties add column if not exists lot_size_acres numeric(10, 4);
alter table public.attom_properties add column if not exists year_built integer;
alter table public.attom_properties add column if not exists owner_first_name text;
alter table public.attom_properties add column if not exists owner_last_name text;
alter table public.attom_properties add column if not exists owner_full_name text;
alter table public.attom_properties add column if not exists is_corporate_owned boolean default false;
alter table public.attom_properties add column if not exists is_absentee_owner boolean default false;
alter table public.attom_properties add column if not exists is_out_of_state_owner boolean default false;
alter table public.attom_properties add column if not exists mailing_address1 text;
alter table public.attom_properties add column if not exists mailing_city text;
alter table public.attom_properties add column if not exists mailing_state text;
alter table public.attom_properties add column if not exists mailing_zip_code text;
alter table public.attom_properties add column if not exists assessed_value numeric(15, 2);
alter table public.attom_properties add column if not exists market_value numeric(15, 2);
alter table public.attom_properties add column if not exists avm_value numeric(15, 2);
alter table public.attom_properties add column if not exists avm_confidence_score integer;
alter table public.attom_properties add column if not exists avm_high numeric(15, 2);
alter table public.attom_properties add column if not exists avm_low numeric(15, 2);
alter table public.attom_properties add column if not exists tax_amount numeric(15, 2);
alter table public.attom_properties add column if not exists last_sale_date date;
alter table public.attom_properties add column if not exists last_sale_price numeric(15, 2);
alter table public.attom_properties add column if not exists last_sale_type text;
alter table public.attom_properties add column if not exists mortgage_amount numeric(15, 2);
alter table public.attom_properties add column if not exists mortgage_date date;
alter table public.attom_properties add column if not exists mortgage_lender text;
alter table public.attom_properties add column if not exists estimated_equity_percent numeric(5, 2);
alter table public.attom_properties add column if not exists import_score integer not null default 50;
alter table public.attom_properties add column if not exists imported_as_lead boolean not null default false;
alter table public.attom_properties add column if not exists imported_lead_id uuid references public.leads(id) on delete set null;
alter table public.attom_properties add column if not exists raw_data jsonb;
alter table public.attom_properties add column if not exists enrichment_phase integer not null default 1;
alter table public.attom_properties add column if not exists created_at timestamptz not null default now();
alter table public.attom_properties add column if not exists updated_at timestamptz not null default now();

-- Indexes
create index if not exists attom_properties_attom_id_idx on public.attom_properties (attom_id);
create index if not exists attom_properties_address_zip_idx on public.attom_properties (address1, zip_code);
create index if not exists attom_properties_zip_code_idx on public.attom_properties (zip_code);
create index if not exists attom_properties_import_score_idx on public.attom_properties (import_score desc);
create index if not exists attom_properties_not_imported_idx on public.attom_properties (import_score desc) where imported_as_lead = false;
create index if not exists attom_properties_enrichment_phase_idx on public.attom_properties (enrichment_phase);

-- Trigger for updated_at
drop trigger if exists attom_properties_set_updated_at on public.attom_properties;
create trigger attom_properties_set_updated_at
before update on public.attom_properties
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.attom_properties enable row level security;

-- RLS Policies
drop policy if exists "Service role can read attom_properties" on public.attom_properties;
create policy "Service role can read attom_properties"
on public.attom_properties
for select
to service_role
using (true);

drop policy if exists "Service role can insert attom_properties" on public.attom_properties;
create policy "Service role can insert attom_properties"
on public.attom_properties
for insert
to service_role
with check (true);

drop policy if exists "Service role can update attom_properties" on public.attom_properties;
create policy "Service role can update attom_properties"
on public.attom_properties
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete attom_properties" on public.attom_properties;
create policy "Service role can delete attom_properties"
on public.attom_properties
for delete
to service_role
using (true);

-- Add Attom API source if it doesn't exist
do $$
begin
  if not exists (select 1 from public.sources where name = 'Attom API') then
    insert into public.sources (name, description, is_active)
    values ('Attom API', 'Properties imported from Attom Data API', true);
  end if;
end $$;
