-- Make repairs_needed column nullable
alter table public.leads
alter column repairs_needed drop not null;