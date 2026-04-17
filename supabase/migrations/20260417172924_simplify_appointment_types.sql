-- Clear existing appointment types
delete from public.appointment_types;

-- Insert only the two types needed
insert into public.appointment_types (name, description, default_duration_minutes, display_order)
values 
  ('Phone Call', 'Quick phone call to discuss your property and answer questions', 30, 1),
  ('Property Visit', 'In-person meeting at the property to assess condition and discuss options', 90, 2);