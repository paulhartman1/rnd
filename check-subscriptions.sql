SELECT 
  id,
  substring(endpoint, 1, 50) as endpoint_preview,
  user_agent,
  is_active,
  created_at
FROM push_subscriptions
ORDER BY created_at DESC;
