-- Create sms_opt_outs table for tracking STOP/UNSUBSCRIBE opt-outs
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  message_sid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS sms_opt_outs_phone_idx ON public.sms_opt_outs (phone_number);

-- Enable RLS
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role can read sms_opt_outs" ON public.sms_opt_outs;
CREATE POLICY "Service role can read sms_opt_outs"
ON public.sms_opt_outs
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert sms_opt_outs" ON public.sms_opt_outs;
CREATE POLICY "Service role can insert sms_opt_outs"
ON public.sms_opt_outs
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update sms_opt_outs" ON public.sms_opt_outs;
CREATE POLICY "Service role can update sms_opt_outs"
ON public.sms_opt_outs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete sms_opt_outs" ON public.sms_opt_outs;
CREATE POLICY "Service role can delete sms_opt_outs"
ON public.sms_opt_outs
FOR DELETE
TO service_role
USING (true);

-- Comment for documentation
COMMENT ON TABLE public.sms_opt_outs IS 'Tracks phone numbers that have opted out of SMS via STOP/UNSUBSCRIBE keywords. Manual re-subscription requires admin action in Supabase.';