-- Track when and against which disclosure SMS consent was captured.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_disclosure_version text;

COMMENT ON COLUMN public.leads.sms_consent_at IS 'Timestamp when SMS consent was captured.';
COMMENT ON COLUMN public.leads.sms_consent_disclosure_version IS 'Version of the SMS consent disclosure shown to the consumer.';
