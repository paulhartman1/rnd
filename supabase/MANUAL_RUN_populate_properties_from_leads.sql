-- ============================================================================
-- POPULATE PROPERTIES TABLE FROM EXISTING LEADS
-- ============================================================================
-- This script creates a property record for each lead that has address data
-- Only creates properties for leads that don't already have one
-- ============================================================================

BEGIN;

-- Insert properties for all leads that have address information
-- and don't already have a property
INSERT INTO public.properties (
  lead_id,
  street_address,
  city,
  state,
  postal_code,
  property_type,
  notes,
  created_at,
  updated_at
)
SELECT 
  l.id as lead_id,
  l.street_address,
  l.city,
  l.state,
  l.postal_code,
  l.property_type,
  CASE 
    WHEN l.owner_notes IS NOT NULL 
    THEN 'Migrated from lead. Original notes: ' || l.owner_notes
    ELSE 'Migrated from lead'
  END as notes,
  l.created_at,
  l.updated_at
FROM public.leads l
WHERE 
  -- Only leads with address data
  l.street_address IS NOT NULL 
  AND l.city IS NOT NULL 
  AND l.state IS NOT NULL 
  AND l.postal_code IS NOT NULL
  -- Only non-deleted leads
  AND l.deleted_at IS NULL
  -- Only leads that don't already have a property
  AND NOT EXISTS (
    SELECT 1 
    FROM public.properties p 
    WHERE p.lead_id = l.id
  );

-- Log how many were inserted
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Created % property records from existing leads', inserted_count;
END $$;

COMMIT;

-- ============================================================================
-- DONE! Properties have been created for all leads with address information
-- ============================================================================

-- To verify, run this query:
-- SELECT 
--   COUNT(*) as total_leads,
--   COUNT(p.id) as leads_with_properties,
--   COUNT(*) - COUNT(p.id) as leads_without_properties
-- FROM public.leads l
-- LEFT JOIN public.properties p ON p.lead_id = l.id
-- WHERE l.deleted_at IS NULL;
