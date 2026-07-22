-- Add transport tracking to call logs
ALTER TABLE public.dialer_call_logs 
ADD COLUMN IF NOT EXISTS transport TEXT DEFAULT 'browser' 
CHECK (transport IN ('browser', 'phone'));

-- Add index for analytics
CREATE INDEX IF NOT EXISTS dialer_call_logs_transport_idx 
ON public.dialer_call_logs(transport);

COMMENT ON COLUMN public.dialer_call_logs.transport IS 
'Call transport method: browser (WebRTC) or phone (iOS bridge)';
