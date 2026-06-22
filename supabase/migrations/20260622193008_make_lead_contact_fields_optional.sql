-- Allow vendor API imports to submit leads even when phone and email are blank.
-- Contact completeness is handled operationally in the CRM rather than at insert time.
alter table public.leads
  drop constraint if exists leads_contact_required;
