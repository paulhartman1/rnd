-- Add assigned_user_id to leads table for lead ownership tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries by assigned user
CREATE INDEX IF NOT EXISTS leads_assigned_user_id_idx ON public.leads (assigned_user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.assigned_user_id IS 'The user who owns/is actively working this lead';
