-- Add bulk import feature flag
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users) 
VALUES (
  'bulk_import_leads', 
  'Bulk Import Leads', 
  'Enable bulk import of leads from CSV/Excel files', 
  true, 
  ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']
)
ON CONFLICT (flag_key) DO UPDATE
SET 
  flag_name = EXCLUDED.flag_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  allowed_users = EXCLUDED.allowed_users,
  updated_at = NOW();
