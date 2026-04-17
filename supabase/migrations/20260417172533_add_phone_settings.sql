-- Create phone_settings table
CREATE TABLE IF NOT EXISTS public.phone_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forward_to_number text NOT NULL,
  is_forwarding_enabled boolean NOT NULL DEFAULT true,
  voicemail_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create phone_availability table
CREATE TABLE IF NOT EXISTS public.phone_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_phone_time_range CHECK (end_time > start_time)
);

-- Create voicemails table to store recordings
CREATE TABLE IF NOT EXISTS public.voicemails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number text NOT NULL,
  recording_url text,
  recording_duration integer,
  transcription text,
  transcription_status text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS phone_settings_set_updated_at ON public.phone_settings;
CREATE TRIGGER phone_settings_set_updated_at
BEFORE UPDATE ON public.phone_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS phone_availability_set_updated_at ON public.phone_availability;
CREATE TRIGGER phone_availability_set_updated_at
BEFORE UPDATE ON public.phone_availability
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS voicemails_set_updated_at ON public.voicemails;
CREATE TRIGGER voicemails_set_updated_at
BEFORE UPDATE ON public.voicemails
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS phone_availability_day_idx ON public.phone_availability (day_of_week) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS voicemails_created_idx ON public.voicemails (created_at DESC);
CREATE INDEX IF NOT EXISTS voicemails_unread_idx ON public.voicemails (is_read, created_at DESC) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.phone_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_settings
DROP POLICY IF EXISTS "Service role can read phone settings" ON public.phone_settings;
CREATE POLICY "Service role can read phone settings"
ON public.phone_settings
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert phone settings" ON public.phone_settings;
CREATE POLICY "Service role can insert phone settings"
ON public.phone_settings
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update phone settings" ON public.phone_settings;
CREATE POLICY "Service role can update phone settings"
ON public.phone_settings
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for phone_availability
DROP POLICY IF EXISTS "Service role can read phone availability" ON public.phone_availability;
CREATE POLICY "Service role can read phone availability"
ON public.phone_availability
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert phone availability" ON public.phone_availability;
CREATE POLICY "Service role can insert phone availability"
ON public.phone_availability
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update phone availability" ON public.phone_availability;
CREATE POLICY "Service role can update phone availability"
ON public.phone_availability
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete phone availability" ON public.phone_availability;
CREATE POLICY "Service role can delete phone availability"
ON public.phone_availability
FOR DELETE
TO service_role
USING (true);

-- RLS Policies for voicemails
DROP POLICY IF EXISTS "Service role can read voicemails" ON public.voicemails;
CREATE POLICY "Service role can read voicemails"
ON public.voicemails
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert voicemails" ON public.voicemails;
CREATE POLICY "Service role can insert voicemails"
ON public.voicemails
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update voicemails" ON public.voicemails;
CREATE POLICY "Service role can update voicemails"
ON public.voicemails
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete voicemails" ON public.voicemails;
CREATE POLICY "Service role can delete voicemails"
ON public.voicemails
FOR DELETE
TO service_role
USING (true);

-- Insert default phone settings if none exist
INSERT INTO public.phone_settings (forward_to_number, is_forwarding_enabled, voicemail_message)
VALUES (
  '',
  true,
  'Thank you for calling Rush N Dush Logistics. We are unable to take your call at this time. Please leave a detailed message with your name, phone number, and property address, and we will get back to you as soon as possible.'
)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.phone_settings IS 'Stores phone forwarding settings and voicemail message';
COMMENT ON TABLE public.phone_availability IS 'Defines when phone calls should be forwarded vs sent to voicemail';
COMMENT ON TABLE public.voicemails IS 'Stores voicemail recordings and transcriptions from Twilio';
