-- Add soft delete support to dialer_campaigns
ALTER TABLE public.dialer_campaigns 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for filtering out deleted campaigns
CREATE INDEX IF NOT EXISTS dialer_campaigns_deleted_at_idx 
ON public.dialer_campaigns(deleted_at) 
WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN public.dialer_campaigns.deleted_at IS 'Soft delete timestamp. NULL means campaign is active.';
