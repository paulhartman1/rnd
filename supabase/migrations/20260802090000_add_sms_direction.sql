-- Add direction to sms_messages to distinguish inbound vs outbound texts
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound';

-- Refresh the partial unread index to also cover outbound messages cleanly
DROP INDEX IF EXISTS sms_messages_unread_idx;
CREATE INDEX IF NOT EXISTS sms_messages_unread_idx
  ON public.sms_messages (direction, is_read, created_at DESC)
  WHERE is_read = false;