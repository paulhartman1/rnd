-- Create user_activity table for tracking PWA vs web usage
CREATE TABLE IF NOT EXISTS public.user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_pwa_use_at TIMESTAMPTZ,
  last_web_use_at TIMESTAMPTZ,
  pwa_session_count INTEGER NOT NULL DEFAULT 0,
  web_session_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS user_activity_set_updated_at ON public.user_activity;
CREATE TRIGGER user_activity_set_updated_at
BEFORE UPDATE ON public.user_activity
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read their own activity
DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity;
CREATE POLICY "Users can view their own activity"
ON public.user_activity FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role has full access for API endpoints
DROP POLICY IF EXISTS "Service role can read user_activity" ON public.user_activity;
CREATE POLICY "Service role can read user_activity"
ON public.user_activity FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert user_activity" ON public.user_activity;
CREATE POLICY "Service role can insert user_activity"
ON public.user_activity FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update user_activity" ON public.user_activity;
CREATE POLICY "Service role can update user_activity"
ON public.user_activity FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete user_activity" ON public.user_activity;
CREATE POLICY "Service role can delete user_activity"
ON public.user_activity FOR DELETE
TO service_role
USING (true);

-- Create index for querying active users
CREATE INDEX IF NOT EXISTS user_activity_last_pwa_use_idx ON public.user_activity (last_pwa_use_at);
CREATE INDEX IF NOT EXISTS user_activity_last_web_use_idx ON public.user_activity (last_web_use_at);
