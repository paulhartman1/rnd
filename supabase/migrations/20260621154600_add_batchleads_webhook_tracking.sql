-- Add webhook tracking columns to batchleads table for Zapier integration
-- This enables idempotency checks and tracks import source

ALTER TABLE public.batchleads
ADD COLUMN IF NOT EXISTS webhook_id TEXT,
ADD COLUMN IF NOT EXISTS imported_via TEXT DEFAULT 'manual' CHECK (imported_via IN ('manual', 'zapier', 'api'));

-- Create index for fast webhook_id lookups (idempotency checks)
CREATE INDEX IF NOT EXISTS idx_batchleads_webhook_id ON public.batchleads(webhook_id) 
WHERE webhook_id IS NOT NULL;

-- Create index for imported_via filtering
CREATE INDEX IF NOT EXISTS idx_batchleads_imported_via ON public.batchleads(imported_via);

-- Add comments for documentation
COMMENT ON COLUMN public.batchleads.webhook_id IS 'Zapier delivery/event ID for idempotency checking. Prevents duplicate imports from webhook retries.';
COMMENT ON COLUMN public.batchleads.imported_via IS 'Source of the import: manual (CSV upload), zapier (webhook), or api (direct API call)';
