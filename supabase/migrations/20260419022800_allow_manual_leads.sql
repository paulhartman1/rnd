-- Allow admin to create leads manually with minimal required fields
-- Phone OR email is required (enforced at application level)
-- Most other fields become nullable for manual entry

alter table public.leads
  alter column listed_with_agent drop not null,
  alter column property_type drop not null,
  alter column repairs_needed drop not null,
  alter column close_timeline drop not null,
  alter column sell_reason drop not null,
  alter column acceptable_offer drop not null,
  alter column street_address drop not null,
  alter column city drop not null,
  alter column state drop not null,
  alter column postal_code drop not null,
  alter column full_name drop not null,
  alter column email drop not null,
  alter column phone drop not null;

-- Add check constraint to ensure at least phone OR email is provided
alter table public.leads
  add constraint leads_contact_required
  check (phone is not null or email is not null);

-- Ensure 'manual' source exists for admin-created leads
insert into public.sources (name, description, is_active)
values ('manual', 'Lead created manually by admin', true)
on conflict (name) do nothing;
