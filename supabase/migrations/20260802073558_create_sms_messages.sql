-- Create sms_messages table to store inbound SMS/MMS from Twilio
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid text,
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text,
  num_media integer NOT NULL DEFAULT 0,
  media_urls text[],
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS sms_messages_set_updated_at ON public.sms_messages;
CREATE TRIGGER sms_messages_set_updated_at
BEFORE UPDATE ON public.sms_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS sms_messages_created_idx ON public.sms_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS sms_messages_from_idx ON public.sms_messages (from_number);
CREATE INDEX IF NOT EXISTS sms_messages_unread_idx ON public.sms_messages (is_read, created_at DESC) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_messages
DROP POLICY IF EXISTS "Service role can read sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can read sms_messages"
ON public.sms_messages
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can insert sms_messages"
ON public.sms_messages
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can update sms_messages"
ON public.sms_messages
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can delete sms_messages"
ON public.sms_messages
FOR DELETE
TO service_role
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.sms_messages IS 'Stores inbound SMS/MMS messages received from Twilio';