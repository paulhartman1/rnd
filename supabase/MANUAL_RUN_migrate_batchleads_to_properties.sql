-- ============================================================================
-- MIGRATE BATCHLEADS DATA TO PROPERTIES TABLE
-- ============================================================================
-- This script updates existing properties with data from their source batchlead
-- Uses the batchleads_mapping table to link properties to their batchlead source
-- ============================================================================

BEGIN;

-- Update properties with batchleads data via the mapping table
UPDATE public.properties p
SET
  -- Owner 2 information
  owner2_first_name = COALESCE(p.owner2_first_name, bl.owner_2_first_name),
  owner2_last_name = COALESCE(p.owner2_last_name, bl.owner_2_last_name),
  
  -- Contact information
  email = COALESCE(p.email, bl.email),
  email2 = COALESCE(p.email2, bl.email_2),
  
  -- Property details (only update if currently null)
  apn = COALESCE(p.apn, bl.apn),
  county = COALESCE(p.county, bl.property_county),
  parcel_count = COALESCE(p.parcel_count, bl.parcel_count),
  property_type_detail = COALESCE(p.property_type_detail, bl.property_type_detail),
  bedroom_count = COALESCE(p.bedroom_count, bl.bedroom_count),
  bathroom_count = COALESCE(p.bathroom_count, bl.bathroom_count::numeric(3,1)),
  total_building_area_sqft = COALESCE(p.total_building_area_sqft, bl.total_building_area_sqft),
  lot_size_sqft = COALESCE(p.lot_size_sqft, bl.lot_size_sqft),
  year_built = COALESCE(p.year_built, bl.year_built),
  zoning_code = COALESCE(p.zoning_code, bl.zoning_code),
  
  -- Property flags
  owner_occupied = COALESCE(p.owner_occupied, bl.owner_occupied),
  is_vacant = COALESCE(p.is_vacant, bl.is_vacant),
  self_managed = COALESCE(p.self_managed, bl.self_managed),
  opt_out = COALESCE(p.opt_out, bl.opt_out),
  
  -- Financial information
  total_assessed_value = COALESCE(p.total_assessed_value, bl.total_assessed_value),
  estimated_value = COALESCE(p.estimated_value, bl.estimated_value),
  last_sale_date = COALESCE(p.last_sale_date, bl.last_sale_date),
  last_sale_price = COALESCE(p.last_sale_price, bl.last_sale_price),
  total_loan_balance = COALESCE(p.total_loan_balance, bl.total_loan_balance),
  equity_current_estimated_balance = COALESCE(p.equity_current_estimated_balance, bl.equity_current_estimated_balance),
  ltv_current_estimated_combined = COALESCE(p.ltv_current_estimated_combined, bl.ltv_current_estimated_combined),
  
  -- MLS information
  mls_status = COALESCE(p.mls_status, bl.mls_status),
  
  -- Foreclosure information
  foreclosure_document_type = COALESCE(p.foreclosure_document_type, bl.foreclosure_document_type),
  foreclosure_status = COALESCE(p.foreclosure_status, bl.foreclosure_status),
  foreclosure_auction_date = COALESCE(p.foreclosure_auction_date, bl.foreclosure_auction_date),
  foreclosure_loan_default_date = COALESCE(p.foreclosure_loan_default_date, bl.foreclosure_loan_default_date),
  
  -- Update timestamp
  updated_at = NOW()
FROM public.batchleads_mapping m
JOIN public.batchleads bl ON bl.id = m.batchlead_id
WHERE p.lead_id = m.lead_id;

-- Log how many were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % property records with batchleads data', updated_count;
END $$;

COMMIT;

-- ============================================================================
-- DONE! Properties have been enriched with batchleads data
-- ============================================================================

-- To verify the migration, run this query:
-- SELECT 
--   COUNT(*) as total_properties,
--   COUNT(p.apn) as properties_with_apn,
--   COUNT(p.owner2_first_name) as properties_with_owner2,
--   COUNT(p.total_assessed_value) as properties_with_value,
--   COUNT(p.foreclosure_status) as properties_with_foreclosure
-- FROM public.properties p;
