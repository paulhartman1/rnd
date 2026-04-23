-- Update bulk import feature flag to be available to all admin users
-- Setting allowed_users to NULL means all authenticated users can use it when enabled
UPDATE public.feature_flags 
SET 
  allowed_users = NULL,
  description = 'Enable bulk import of leads from CSV/Excel files for all admin users',
  updated_at = NOW()
WHERE flag_key = 'bulk_import_leads';
