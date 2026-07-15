-- Add novation calculator fields to properties table
-- These fields support the LeadSharks novation calculation for property valuation

-- Market value and percentages
alter table public.properties add column if not exists as_is_market_value numeric(15, 2);
alter table public.properties add column if not exists percent_of_market_value numeric(5, 2) default 95.00;
alter table public.properties add column if not exists realtor_fee_percent numeric(5, 2) default 3.00;
alter table public.properties add column if not exists double_close_fee_percent numeric(5, 2) default 0.75;

-- Fixed costs
alter table public.properties add column if not exists closing_attorney_fee numeric(15, 2) default 0;
alter table public.properties add column if not exists title_insurance numeric(15, 2) default 0;
alter table public.properties add column if not exists efile_fee numeric(15, 2) default 0;
alter table public.properties add column if not exists recording_fee numeric(15, 2) default 0;
alter table public.properties add column if not exists transfer_tax numeric(15, 2) default 0;
alter table public.properties add column if not exists flat_fee_listing numeric(15, 2) default 0;
alter table public.properties add column if not exists photographer_fee numeric(15, 2) default 0;
alter table public.properties add column if not exists other_expenses numeric(15, 2) default 0;

-- Variable costs
alter table public.properties add column if not exists repair_costs numeric(15, 2) default 0;
alter table public.properties add column if not exists interest_costs numeric(15, 2) default 0;
alter table public.properties add column if not exists months_held integer default 0;

-- Desired profit targets
alter table public.properties add column if not exists desired_profit_access numeric(15, 2) default 30000.00;
alter table public.properties add column if not exists desired_profit_no_access numeric(15, 2) default 35000.00;

-- Add indexes for commonly queried fields
create index if not exists idx_properties_as_is_market_value on public.properties (as_is_market_value) where as_is_market_value is not null;

-- Add comments explaining the novation fields
comment on column public.properties.as_is_market_value is 'Property''s current market value for novation calculation';
comment on column public.properties.percent_of_market_value is 'Sale percentage of market value (default 95%)';
comment on column public.properties.realtor_fee_percent is 'Realtor commission percentage (default 3%)';
comment on column public.properties.double_close_fee_percent is 'Double close cost percentage (default 0.75%)';
comment on column public.properties.desired_profit_access is 'Profit target for MLS deals with ACCESS (default $30k)';
comment on column public.properties.desired_profit_no_access is 'Profit target for wholesale deals with NO ACCESS (default $35k)';
comment on column public.properties.months_held is 'Holding period in months for interest calculation';
