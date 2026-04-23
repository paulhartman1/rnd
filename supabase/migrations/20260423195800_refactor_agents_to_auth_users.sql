-- Refactor autodialer to use authenticated users as agents
-- Drop old dialer_agents table and create dialer_agent_settings

-- Drop old tables
DROP TABLE IF EXISTS public.dialer_call_logs CASCADE;
DROP TABLE IF EXISTS public.dialer_queue CASCADE;
DROP TABLE IF EXISTS public.dialer_agents CASCADE;

-- Create agent settings table linked to auth.users
CREATE TABLE IF NOT EXISTS public.dialer_agent_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recreate dialer_queue with user_id instead of agent_id
CREATE TABLE IF NOT EXISTS public.dialer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.dialer_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);

-- Recreate dialer_call_logs with user_id instead of agent_id
CREATE TABLE IF NOT EXISTS public.dialer_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.dialer_queue(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.dialer_campaigns(id) ON DELETE SET NULL,
  twilio_call_sid TEXT,
  call_status TEXT NOT NULL DEFAULT 'initiated' CHECK (call_status IN ('initiated', 'ringing', 'in-progress', 'answered', 'completed', 'failed', 'no-answer', 'busy', 'canceled')),
  call_duration INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS dialer_queue_status_campaign_idx ON public.dialer_queue(status, campaign_id, created_at);
CREATE INDEX IF NOT EXISTS dialer_queue_assigned_user_idx ON public.dialer_queue(assigned_user_id, status);
CREATE INDEX IF NOT EXISTS dialer_queue_campaign_idx ON public.dialer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_lead_idx ON public.dialer_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_user_idx ON public.dialer_call_logs(user_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_campaign_idx ON public.dialer_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_queue_idx ON public.dialer_call_logs(queue_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS dialer_agent_settings_set_updated_at ON public.dialer_agent_settings;
CREATE TRIGGER dialer_agent_settings_set_updated_at
BEFORE UPDATE ON public.dialer_agent_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS dialer_queue_set_updated_at ON public.dialer_queue;
CREATE TRIGGER dialer_queue_set_updated_at
BEFORE UPDATE ON public.dialer_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.dialer_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_settings: users can read/update their own settings
DROP POLICY IF EXISTS "Users can view their own agent settings" ON public.dialer_agent_settings;
CREATE POLICY "Users can view their own agent settings"
ON public.dialer_agent_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own agent settings" ON public.dialer_agent_settings;
CREATE POLICY "Users can upsert their own agent settings"
ON public.dialer_agent_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own agent settings" ON public.dialer_agent_settings;
CREATE POLICY "Users can update their own agent settings"
ON public.dialer_agent_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role has full access to all dialer tables
DROP POLICY IF EXISTS "Service role can read dialer_agent_settings" ON public.dialer_agent_settings;
CREATE POLICY "Service role can read dialer_agent_settings"
ON public.dialer_agent_settings FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert dialer_agent_settings" ON public.dialer_agent_settings;
CREATE POLICY "Service role can insert dialer_agent_settings"
ON public.dialer_agent_settings FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dialer_agent_settings" ON public.dialer_agent_settings;
CREATE POLICY "Service role can update dialer_agent_settings"
ON public.dialer_agent_settings FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete dialer_agent_settings" ON public.dialer_agent_settings;
CREATE POLICY "Service role can delete dialer_agent_settings"
ON public.dialer_agent_settings FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can read dialer_queue" ON public.dialer_queue;
CREATE POLICY "Service role can read dialer_queue"
ON public.dialer_queue FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert dialer_queue" ON public.dialer_queue;
CREATE POLICY "Service role can insert dialer_queue"
ON public.dialer_queue FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dialer_queue" ON public.dialer_queue;
CREATE POLICY "Service role can update dialer_queue"
ON public.dialer_queue FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete dialer_queue" ON public.dialer_queue;
CREATE POLICY "Service role can delete dialer_queue"
ON public.dialer_queue FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can read dialer_call_logs" ON public.dialer_call_logs;
CREATE POLICY "Service role can read dialer_call_logs"
ON public.dialer_call_logs FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert dialer_call_logs" ON public.dialer_call_logs;
CREATE POLICY "Service role can insert dialer_call_logs"
ON public.dialer_call_logs FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dialer_call_logs" ON public.dialer_call_logs;
CREATE POLICY "Service role can update dialer_call_logs"
ON public.dialer_call_logs FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete dialer_call_logs" ON public.dialer_call_logs;
CREATE POLICY "Service role can delete dialer_call_logs"
ON public.dialer_call_logs FOR DELETE TO service_role USING (true);
