-- Feature Flags Table
-- Allows selective feature rollout with user-level restrictions

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_users TEXT[], -- Array of email addresses allowed to access this feature
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only super admins (paulhartman.bassist@gmail.com, christie.swoboda@gmail.com) can manage feature flags
CREATE POLICY "Super admins can view feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com')
  );

CREATE POLICY "Super admins can update feature flags"
  ON public.feature_flags
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com')
  );

CREATE POLICY "Super admins can insert feature flags"
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com')
  );

CREATE POLICY "Super admins can delete feature flags"
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com')
  );

-- Index for faster lookups
CREATE INDEX idx_feature_flags_key ON public.feature_flags(flag_key);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial feature flags
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users) VALUES
  ('facebook_integration', 'Facebook Integration', 'Enable Facebook posting and management features', false, ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']);
