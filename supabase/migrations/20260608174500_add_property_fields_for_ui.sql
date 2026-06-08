-- Add comprehensive property fields for lead management UI
-- Properties belong to leads (one property -> one lead via lead_id FK)
-- Multiple owners supported via owner2_* fields

-- Owner fields (owner 1 is the lead, owner 2 is additional)
alter table public.properties add column if not exists owner2_first_name text;
alter table public.properties add column if not exists owner2_last_name text;

-- Contact fields
alter table public.properties add column if not exists email text;
alter table public.properties add column if not exists email2 text;

-- Property status/flags
alter table public.properties add column if not exists is_vacant boolean default false;
alter table public.properties add column if not exists opt_out boolean default false;
alter table public.properties add column if not exists owner_occupied boolean default false;
alter table public.properties add column if not exists self_managed boolean default false;

-- Property details
alter table public.properties add column if not exists parcel_count integer;
alter table public.properties add column if not exists property_type_detail text;
alter table public.properties add column if not exists bedroom_count integer;
alter table public.properties add column if not exists bathroom_count numeric(3, 1);
alter table public.properties add column if not exists total_building_area_sqft integer;
alter table public.properties add column if not exists lot_size_sqft integer;
alter table public.properties add column if not exists year_built integer;
alter table public.properties add column if not exists county text;

-- Financial fields
alter table public.properties add column if not exists total_assessed_value numeric(15, 2);
alter table public.properties add column if not exists estimated_value numeric(15, 2);
alter table public.properties add column if not exists total_loan_balance numeric(15, 2);
alter table public.properties add column if not exists equity_current_estimated_balance numeric(15, 2);
alter table public.properties add column if not exists ltv_current_estimated_combined numeric(5, 2);

-- Zoning
alter table public.properties add column if not exists zoning_code text;

-- Sale history
alter table public.properties add column if not exists last_sale_date date;
alter table public.properties add column if not exists last_sale_price numeric(15, 2);

-- MLS
alter table public.properties add column if not exists mls_status text;

-- Foreclosure fields
alter table public.properties add column if not exists foreclosure_document_type text;
alter table public.properties add column if not exists foreclosure_status text;
alter table public.properties add column if not exists foreclosure_auction_date date;
alter table public.properties add column if not exists foreclosure_loan_default_date date;

-- Add indexes for commonly queried fields
create index if not exists idx_properties_is_vacant on public.properties (is_vacant);
create index if not exists idx_properties_owner_occupied on public.properties (owner_occupied);
create index if not exists idx_properties_foreclosure_status on public.properties (foreclosure_status) where foreclosure_status is not null;
create index if not exists idx_properties_last_sale_date on public.properties (last_sale_date desc) where last_sale_date is not null;

-- Add comment explaining the owner structure
comment on column public.properties.lead_id is 'Primary owner/lead who this property belongs to';
comment on column public.properties.owner2_first_name is 'Second owner first name (if property has multiple owners)';
comment on column public.properties.owner2_last_name is 'Second owner last name (if property has multiple owners)';
