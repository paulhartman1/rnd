-- Add priority_score to leads for campaign filtering
-- Priority score is calculated during import based on:
-- Spread × 0.4 + Equity × 0.3 + Distress signals × 0.3

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS priority_score INTEGER;

-- Index for fast filtering by score
CREATE INDEX IF NOT EXISTS leads_priority_score_idx 
ON public.leads (priority_score DESC NULLS LAST);

-- Add tags column for flexible categorization
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS computed_tags TEXT[];

-- Index for tag searches
CREATE INDEX IF NOT EXISTS leads_computed_tags_idx 
ON public.leads USING GIN (computed_tags);
