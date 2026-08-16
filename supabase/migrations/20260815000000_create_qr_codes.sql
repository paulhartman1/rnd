-- QR Codes
-- Stores generated QR codes with a uuid identifier and their storage path

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS qr_codes_set_updated_at ON public.qr_codes;
CREATE TRIGGER qr_codes_set_updated_at
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS qr_codes_uuid_idx ON public.qr_codes (uuid);
CREATE INDEX IF NOT EXISTS qr_codes_created_at_idx ON public.qr_codes (created_at DESC);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can read qr_codes" ON public.qr_codes;
CREATE POLICY "Service role can read qr_codes"
ON public.qr_codes FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert qr_codes" ON public.qr_codes;
CREATE POLICY "Service role can insert qr_codes"
ON public.qr_codes FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update qr_codes" ON public.qr_codes;
CREATE POLICY "Service role can update qr_codes"
ON public.qr_codes FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete qr_codes" ON public.qr_codes;
CREATE POLICY "Service role can delete qr_codes"
ON public.qr_codes FOR DELETE TO service_role USING (true);

-- Public storage bucket for generated QR code files
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read qr-codes bucket" ON storage.objects;
CREATE POLICY "Public can read qr-codes bucket"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Service role can upload qr-codes" ON storage.objects;
CREATE POLICY "Service role can upload qr-codes"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Service role can delete qr-codes" ON storage.objects;
CREATE POLICY "Service role can delete qr-codes"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'qr-codes');