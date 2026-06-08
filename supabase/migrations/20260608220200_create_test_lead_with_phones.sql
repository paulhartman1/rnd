-- Create a test lead with two phone numbers for autodialer testing
-- Phone 1: +15005550000 (Twilio test number that will fail)
-- Phone 2: 720-684-8593 (Paul's cell - will work)

do $$
declare
  test_source_id uuid;
  test_lead_id uuid;
  phone1_id uuid;
  phone2_id uuid;
begin
  -- Get or create a test source
  select id into test_source_id
  from public.sources
  where name = 'test-autodialer'
  limit 1;
  
  if test_source_id is null then
    insert into public.sources (name, description, is_active)
    values ('test-autodialer', 'Test source for autodialer phone testing', true)
    returning id into test_source_id;
    raise notice 'Created test source: %', test_source_id;
  else
    raise notice 'Using existing test source: %', test_source_id;
  end if;
  
  -- Check if test lead already exists
  select id into test_lead_id
  from public.leads
  where full_name = 'TEST - Multi Phone Lead'
    and deleted_at is null
  limit 1;
  
  if test_lead_id is not null then
    raise notice 'Test lead already exists: %', test_lead_id;
    raise notice 'To recreate, manually delete the lead first or run: DELETE FROM leads WHERE full_name = ''TEST - Multi Phone Lead'';';
    return;
  end if;
  
  -- Create test lead
  insert into public.leads (
    full_name,
    email,
    phone,
    street_address,
    city,
    state,
    postal_code,
    source_id,
    status,
    owner_notes,
    listed_with_agent,
    property_type,
    repairs_needed,
    close_timeline,
    sell_reason,
    acceptable_offer,
    sms_consent
  ) values (
    'TEST - Multi Phone Lead',
    'test@example.com',
    '+15005550000', -- Will be primary initially
    '123 Test Street',
    'Denver',
    'CO',
    '80202',
    test_source_id,
    'new',
    'Test lead for multi-phone autodialer feature. Phone 1 will fail (Twilio test number), Phone 2 is real.',
    false,
    'Single Family',
    'Minor',
    '30-60 days',
    'Testing',
    'Market Value',
    false
  ) returning id into test_lead_id;
  
  raise notice 'Created test lead: % (%)', test_lead_id, 'TEST - Multi Phone Lead';
  
  -- Insert Phone 1: +15005550000 (Twilio test number that will fail)
  insert into public.lead_phones (
    lead_id,
    phone_number,
    phone_type,
    is_primary,
    is_dnc,
    display_order,
    validation_status,
    validation_notes
  ) values (
    test_lead_id,
    '+15005550000',
    'mobile',
    true, -- Primary
    false,
    0,
    'unknown',
    'Twilio test number - will fail validation'
  ) returning id into phone1_id;
  
  raise notice 'Created phone 1: % (+15005550000 - will fail)', phone1_id;
  
  -- Insert Phone 2: 720-684-8593 (Paul's real cell)
  insert into public.lead_phones (
    lead_id,
    phone_number,
    phone_type,
    is_primary,
    is_dnc,
    display_order,
    validation_status,
    validation_notes
  ) values (
    test_lead_id,
    '+17206848593', -- Normalized format
    'mobile',
    false,
    false,
    1,
    'unknown',
    'Paul''s cell phone - should work'
  ) returning id into phone2_id;
  
  raise notice 'Created phone 2: % (+17206848593 - Paul''s cell)', phone2_id;
  
  raise notice '';
  raise notice '=== TEST LEAD CREATED SUCCESSFULLY ===';
  raise notice 'Lead ID: %', test_lead_id;
  raise notice 'Lead Name: TEST - Multi Phone Lead';
  raise notice 'Phone 1: +15005550000 (PRIMARY - will fail)';
  raise notice 'Phone 2: +17206848593 (Paul''s cell - will work)';
  raise notice '';
  raise notice 'To test:';
  raise notice '1. Create a dialer campaign including this lead';
  raise notice '2. Start the dialer';
  raise notice '3. Try calling Phone 1 (should fail)';
  raise notice '4. Mark Phone 1 as invalid/disconnected';
  raise notice '5. Call Phone 2 (should connect to Paul''s cell)';
  raise notice '6. Mark Phone 2 as valid and set as primary';
  raise notice '';
end;
$$;
