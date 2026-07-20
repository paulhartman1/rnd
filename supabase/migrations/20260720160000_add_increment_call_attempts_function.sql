-- Function to increment call attempts atomically
create or replace function increment_call_attempts(phone_id uuid)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update lead_phones
  set call_attempts = call_attempts + 1
  where id = phone_id
  returning call_attempts into new_count;
  
  return new_count;
end;
$$;
