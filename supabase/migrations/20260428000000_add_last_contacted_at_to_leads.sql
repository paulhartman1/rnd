-- Add last_contacted_at to leads table for tracking when a lead was last contacted
-- This enables filtering campaigns by contact recency (e.g., "contacted 2-4 weeks ago")

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Create index for efficient filtering by last contact date
CREATE INDEX IF NOT EXISTS leads_last_contacted_at_idx ON public.leads (last_contacted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.last_contacted_at IS 'Timestamp when the lead was last successfully contacted via phone or other means';
