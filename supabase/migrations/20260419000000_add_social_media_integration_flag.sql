-- Add social_media_integration feature flag
-- This flag controls access to the Social Media Integration settings page

INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users) VALUES
  ('social_media_integration', 'Social Media Integration', 'Enable access to social media integration settings and management', false, ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']);
