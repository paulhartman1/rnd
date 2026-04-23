-- Add autodialer feature flag
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users)
VALUES (
  'autodialer',
  'Autodialer',
  'Enable automated outbound dialing campaigns with multiple agents',
  false,
  ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']
)
ON CONFLICT (flag_key) DO NOTHING;
