-- Add soft delete to sms_messages
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Refresh indexes to exclude soft-deleted rows
DROP INDEX IF EXISTS sms_messages_created_idx;
DROP INDEX IF EXISTS sms_messages_from_idx;
DROP INDEX IF EXISTS sms_messages_unread_idx;

CREATE INDEX IF NOT EXISTS sms_messages_created_idx ON public.sms_messages (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS sms_messages_from_idx ON public.sms_messages (from_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS sms_messages_unread_idx ON public.sms_messages (direction, is_read, created_at DESC) WHERE is_read = false AND deleted_at IS NULL;

-- Update RLS policies to filter out soft-deleted rows
DROP POLICY IF EXISTS "Service role can read sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can read sms_messages"
ON public.sms_messages
FOR SELECT
TO service_role
USING (deleted_at IS NULL);

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
USING (deleted_at IS NULL)
WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role can delete sms_messages" ON public.sms_messages;
CREATE POLICY "Service role can delete sms_messages"
ON public.sms_messages
FOR DELETE
TO service_role
USING (deleted_at IS NULL);

-- Trigger to soft-delete SMS messages when a lead is soft-deleted
-- Matches by phone number against lead_phones
CREATE OR REPLACE FUNCTION public.soft_delete_sms_for_lead()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Soft delete inbound messages from this lead's phone numbers
    UPDATE public.sms_messages
    SET deleted_at = now()
    WHERE deleted_at IS NULL
      AND direction = 'inbound'
      AND from_number IN (
        SELECT phone_number FROM public.lead_phones WHERE lead_id = NEW.id
      );

    -- Soft delete outbound messages to this lead's phone numbers
    UPDATE public.sms_messages
    SET deleted_at = now()
    WHERE deleted_at IS NULL
      AND direction = 'outbound'
      AND to_number IN (
        SELECT phone_number FROM public.lead_phones WHERE lead_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS soft_delete_sms_for_lead_trigger ON public.leads;
CREATE TRIGGER soft_delete_sms_for_lead_trigger
AFTER UPDATE ON public.leads
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
EXECUTE FUNCTION public.soft_delete_sms_for_lead();