-- Add PWA Push Notifications feature flag
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users)
VALUES (
  'pwa_push_notifications',
  'PWA Push Notifications',
  'Enable Progressive Web App push notifications for new lead alerts. Works on mobile browsers without an app store.',
  false,
  ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']
)
ON CONFLICT (flag_key) DO NOTHING;
