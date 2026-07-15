-- Add properties feature flag
-- This flag controls access to the Properties admin page with novation calculator

INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users) VALUES
  ('properties', 'Properties Management', 'Enable access to properties admin page with map and novation calculator', false, ARRAY['paulhartman.bassist@gmail.com']);
