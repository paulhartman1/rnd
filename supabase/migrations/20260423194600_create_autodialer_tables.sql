-- Autodialer Tables
-- Enables multi-agent automated outbound calling campaigns

-- Dialer Agents: People who will receive bridged calls
CREATE TABLE IF NOT EXISTS public.dialer_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dialer Campaigns: Organized calling efforts with lead filters
CREATE TABLE IF NOT EXISTS public.dialer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  lead_filters JSONB DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dialer Queue: Work queue of leads to be called
CREATE TABLE IF NOT EXISTS public.dialer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.dialer_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  assigned_agent_id UUID REFERENCES public.dialer_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);

-- Dialer Call Logs: Historical record of all call attempts
CREATE TABLE IF NOT EXISTS public.dialer_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.dialer_queue(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.dialer_agents(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS dialer_queue_assigned_agent_idx ON public.dialer_queue(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS dialer_queue_campaign_idx ON public.dialer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_lead_idx ON public.dialer_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_agent_idx ON public.dialer_call_logs(agent_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_campaign_idx ON public.dialer_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS dialer_call_logs_queue_idx ON public.dialer_call_logs(queue_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS dialer_agents_set_updated_at ON public.dialer_agents;
CREATE TRIGGER dialer_agents_set_updated_at
BEFORE UPDATE ON public.dialer_agents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS dialer_campaigns_set_updated_at ON public.dialer_campaigns;
CREATE TRIGGER dialer_campaigns_set_updated_at
BEFORE UPDATE ON public.dialer_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS dialer_queue_set_updated_at ON public.dialer_queue;
CREATE TRIGGER dialer_queue_set_updated_at
BEFORE UPDATE ON public.dialer_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.dialer_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialer_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role has full access
DROP POLICY IF EXISTS "Service role can read dialer_agents" ON public.dialer_agents;
CREATE POLICY "Service role can read dialer_agents"
ON public.dialer_agents FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert dialer_agents" ON public.dialer_agents;
CREATE POLICY "Service role can insert dialer_agents"
ON public.dialer_agents FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dialer_agents" ON public.dialer_agents;
CREATE POLICY "Service role can update dialer_agents"
ON public.dialer_agents FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete dialer_agents" ON public.dialer_agents;
CREATE POLICY "Service role can delete dialer_agents"
ON public.dialer_agents FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can read dialer_campaigns" ON public.dialer_campaigns;
CREATE POLICY "Service role can read dialer_campaigns"
ON public.dialer_campaigns FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert dialer_campaigns" ON public.dialer_campaigns;
CREATE POLICY "Service role can insert dialer_campaigns"
ON public.dialer_campaigns FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dialer_campaigns" ON public.dialer_campaigns;
CREATE POLICY "Service role can update dialer_campaigns"
ON public.dialer_campaigns FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete dialer_campaigns" ON public.dialer_campaigns;
CREATE POLICY "Service role can delete dialer_campaigns"
ON public.dialer_campaigns FOR DELETE TO service_role USING (true);

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
