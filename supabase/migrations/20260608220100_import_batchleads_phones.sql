-- Import phone numbers from batchleads into lead_phones for mapped leads
-- This populates all 5 phone numbers from batchleads for leads that have been imported

do $$
declare
  mapping_record record;
  batchlead_record record;
  lead_record record;
  phone_order integer;
  phone_num text;
  phone_tp text;
  phone_dnc boolean;
  primary_phone_id uuid;
begin
  -- Loop through all batchlead mappings
  for mapping_record in 
    select batchlead_id, lead_id 
    from public.batchleads_mapping
  loop
    -- Get the batchlead data
    select * into batchlead_record
    from public.batchleads
    where id = mapping_record.batchlead_id;
    
    -- Get the lead data
    select * into lead_record
    from public.leads
    where id = mapping_record.lead_id;
    
    if batchlead_record.id is not null and lead_record.id is not null then
      raise notice 'Processing lead % (%)', lead_record.full_name, lead_record.id;
      
      -- Check if phones already exist for this lead
      if exists (select 1 from public.lead_phones where lead_id = lead_record.id) then
        raise notice 'Phones already exist for lead %, skipping', lead_record.id;
        continue;
      end if;
      
      -- Insert phone_1 through phone_5 if they exist
      for phone_order in 1..5 loop
        -- Dynamically get phone number, type, and dnc flag
        execute format('select $1.phone_%s, $1.phone_%s_type, $1.phone_%s_dnc', 
                      phone_order, phone_order, phone_order)
        into phone_num, phone_tp, phone_dnc
        using batchlead_record;
        
        -- Only insert if phone number exists and is not empty
        if phone_num is not null and trim(phone_num) != '' then
          raise notice '  Inserting phone %: % (type: %, dnc: %)', 
                      phone_order, phone_num, coalesce(phone_tp, 'unknown'), coalesce(phone_dnc, false);
          
          -- Insert the phone
          insert into public.lead_phones (
            lead_id,
            phone_number,
            phone_type,
            is_primary,
            is_dnc,
            display_order,
            validation_status
          ) values (
            lead_record.id,
            phone_num,
            phone_tp,
            phone_order = 1, -- First phone is primary
            coalesce(phone_dnc, false),
            phone_order - 1, -- 0-indexed display order
            'unknown'
          ) returning id into primary_phone_id;
          
          -- If this is the first phone and it doesn't match the lead's phone, update lead
          if phone_order = 1 and lead_record.phone != phone_num then
            raise notice '  Updating lead primary phone from % to %', lead_record.phone, phone_num;
            update public.leads
            set phone = phone_num
            where id = lead_record.id;
          end if;
        end if;
      end loop;
    end if;
  end loop;
  
  raise notice 'Import complete!';
end;
$$;
