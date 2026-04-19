-- Add BatchLeads source
insert into public.sources (name, description, is_active)
values ('BatchLeads', 'Lead imported from BatchLeads', true)
on conflict (name) do nothing;
