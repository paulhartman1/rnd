create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  listed_with_agent boolean not null,
  property_type text not null,
  owns_land boolean default null,
  repairs_needed text not null,
  close_timeline text not null,
  sell_reason text not null,
  acceptable_offer text not null,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  sms_consent boolean not null default false,
  source_id uuid not null references public.sources(id),
  status text not null default 'new' check (status in ('new', 'contacted', 'offer-sent', 'under-contract', 'closed', 'archived')),
  owner_notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads
add column if not exists deleted_at timestamptz;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
before update on public.sources
for each row
execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_source_id_idx on public.leads (source_id);
create index if not exists leads_active_created_at_idx on public.leads (created_at desc) where deleted_at is null;

alter table public.sources enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Service role can read sources" on public.sources;
create policy "Service role can read sources"
on public.sources
for select
to service_role
using (true);

drop policy if exists "Service role can insert sources" on public.sources;
create policy "Service role can insert sources"
on public.sources
for insert
to service_role
with check (true);

drop policy if exists "Service role can update sources" on public.sources;
create policy "Service role can update sources"
on public.sources
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete sources" on public.sources;
create policy "Service role can delete sources"
on public.sources
for delete
to service_role
using (true);

drop policy if exists "Public can insert leads" on public.leads;
create policy "Public can insert leads"
on public.leads
for insert
to anon
with check (true);

drop policy if exists "Service role can read leads" on public.leads;
create policy "Service role can read leads"
on public.leads
for select
to service_role
using (true);

drop policy if exists "Service role can update leads" on public.leads;
create policy "Service role can update leads"
on public.leads
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete leads" on public.leads;
create policy "Service role can delete leads"
on public.leads
for delete
to service_role
using (true);

create table if not exists public.intake_questions (
  id uuid primary key default gen_random_uuid(),
  field_name text unique,
  question_type text not null check (question_type in ('choice', 'text', 'address', 'contact')),
  question_text text not null,
  helper_text text,
  placeholder text,
  options jsonb,
  is_active boolean not null default true,
  display_order integer not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_mappings (
  id uuid primary key default gen_random_uuid(),
  from_question_id uuid not null references public.intake_questions(id) on delete cascade,
  answer_value text,
  to_question_id uuid references public.intake_questions(id) on delete set null,
  redirect_url text,
  priority integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists intake_questions_set_updated_at on public.intake_questions;
create trigger intake_questions_set_updated_at
before update on public.intake_questions
for each row
execute function public.set_updated_at();

drop trigger if exists question_mappings_set_updated_at on public.question_mappings;
create trigger question_mappings_set_updated_at
before update on public.question_mappings
for each row
execute function public.set_updated_at();

create index if not exists intake_questions_display_order_idx on public.intake_questions (display_order);
create index if not exists intake_questions_active_idx on public.intake_questions (is_active) where deleted_at is null;
create index if not exists question_mappings_from_question_idx on public.question_mappings (from_question_id);
create index if not exists question_mappings_to_question_idx on public.question_mappings (to_question_id);
create index if not exists question_mappings_active_idx on public.question_mappings (is_active) where deleted_at is null;

alter table public.intake_questions enable row level security;
alter table public.question_mappings enable row level security;

drop policy if exists "Public can read active questions" on public.intake_questions;
create policy "Public can read active questions"
on public.intake_questions
for select
to anon
using (is_active = true and deleted_at is null);

drop policy if exists "Public can read active mappings" on public.question_mappings;
create policy "Public can read active mappings"
on public.question_mappings
for select
to anon
using (is_active = true and deleted_at is null);

drop policy if exists "Service role can read questions" on public.intake_questions;
create policy "Service role can read questions"
on public.intake_questions
for select
to service_role
using (true);

drop policy if exists "Service role can insert questions" on public.intake_questions;
create policy "Service role can insert questions"
on public.intake_questions
for insert
to service_role
with check (true);

drop policy if exists "Service role can update questions" on public.intake_questions;
create policy "Service role can update questions"
on public.intake_questions
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete questions" on public.intake_questions;
create policy "Service role can delete questions"
on public.intake_questions
for delete
to service_role
using (true);

drop policy if exists "Service role can read mappings" on public.question_mappings;
create policy "Service role can read mappings"
on public.question_mappings
for select
to service_role
using (true);

drop policy if exists "Service role can insert mappings" on public.question_mappings;
create policy "Service role can insert mappings"
on public.question_mappings
for insert
to service_role
with check (true);

drop policy if exists "Service role can update mappings" on public.question_mappings;
create policy "Service role can update mappings"
on public.question_mappings
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete mappings" on public.question_mappings;
create policy "Service role can delete mappings"
on public.question_mappings
for delete
to service_role
using (true);

-- Seed data for intake questions
do $$
declare
  q1_id uuid;
  q2_id uuid;
  q3_id uuid;
  q4_id uuid;
  q5_id uuid;
  q6_id uuid;
  q7_id uuid;
  q8_id uuid;
  q9_id uuid;
begin
  -- Only insert if table is empty
  if not exists (select 1 from public.intake_questions limit 1) then
    -- Insert questions and capture their IDs
    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('listedWithAgent', 'choice', 'Is your property listed with an agent?', null, '["Yes", "No"]', 1)
    returning id into q1_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('propertyType', 'choice', 'What type of property is it?', null, '["Single Family", "Multi Family", "Townhouse / Row House", "Vacant Land", "Mobile / Manufactured Home", "Apartment / Condo"]', 2)
    returning id into q2_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('ownsLand', 'choice', 'Do you also own the land?', null, '["Yes", "No"]', 3)
    returning id into q3_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('repairsNeeded', 'choice', 'What''s the current condition of the property?', 'Don''t worry—we buy houses in any condition.', '["Needs major work (foundation, structural, full renovation)", "Needs some repairs (roof, kitchen, bathroom)", "Needs minor updates (paint, flooring, cosmetic)", "Move-in ready (recently renovated)"]', 4)
    returning id into q4_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('closeTimeline', 'choice', 'When do you need to close?', null, '["As soon as possible", "Within 2 weeks", "Within 1 month", "1-2 months", "2-3 months", "I''m flexible"]', 5)
    returning id into q5_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('sellReason', 'choice', 'What''s prompting you to sell?', null, '["Inherited property", "Divorce or separation", "Can''t afford repairs", "Done being a landlord", "Facing foreclosure", "Job relocation", "Just exploring my options"]', 6)
    returning id into q6_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, placeholder, display_order)
    values ('acceptableOffer', 'text', 'What''s the lowest cash offer you''d accept?', null, 'e.g., $250,000', 7)
    returning id into q7_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('address', 'address', 'What is the address of the property?', null, null, 8)
    returning id into q8_id;

    insert into public.intake_questions (field_name, question_type, question_text, helper_text, options, display_order)
    values ('contact', 'contact', 'Where should we send your cash offer?', 'We''ll send you a no-obligation offer within 24 hours.', null, 9)
    returning id into q9_id;

    -- Insert question mappings for flow control
    -- listedWithAgent: "Yes" redirects to bye-felicia, "No" goes to propertyType
    insert into public.question_mappings (from_question_id, answer_value, to_question_id, redirect_url, priority)
    values (q1_id, 'Yes', null, '/get-cash-offer/bye-felicia', 100);

    insert into public.question_mappings (from_question_id, answer_value, to_question_id, redirect_url, priority)
    values (q1_id, 'No', q2_id, null, 0);

    -- Default sequential flow (any answer goes to next question)
    insert into public.question_mappings (from_question_id, answer_value, to_question_id, redirect_url, priority)
    values 
      (q2_id, null, q3_id, null, 0),
      (q3_id, null, q4_id, null, 0),
      (q4_id, null, q5_id, null, 0),
      (q5_id, null, q6_id, null, 0),
      (q6_id, null, q7_id, null, 0),
      (q7_id, null, q8_id, null, 0),
      (q8_id, null, q9_id, null, 0),
      -- Last question (contact) has no next question (null = submit/end)
      (q9_id, null, null, null, 0);
  end if;
end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no-show')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

create index if not exists appointments_lead_id_idx on public.appointments (lead_id);
create index if not exists appointments_start_time_idx on public.appointments (start_time);
create index if not exists appointments_status_idx on public.appointments (status);

alter table public.appointments enable row level security;

drop policy if exists "Service role can read appointments" on public.appointments;
create policy "Service role can read appointments"
on public.appointments
for select
to service_role
using (true);

drop policy if exists "Service role can insert appointments" on public.appointments;
create policy "Service role can insert appointments"
on public.appointments
for insert
to service_role
with check (true);

drop policy if exists "Service role can update appointments" on public.appointments;
create policy "Service role can update appointments"
on public.appointments
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete appointments" on public.appointments;
create policy "Service role can delete appointments"
on public.appointments
for delete
to service_role
using (true);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null,
  role text not null,
  is_active boolean not null default true,
  display_order integer not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create index if not exists reviews_display_order_idx on public.reviews (display_order);
create index if not exists reviews_active_idx on public.reviews (is_active) where deleted_at is null;

alter table public.reviews enable row level security;

drop policy if exists "Public can read active reviews" on public.reviews;
create policy "Public can read active reviews"
on public.reviews
for select
to anon
using (is_active = true and deleted_at is null);

drop policy if exists "Service role can read reviews" on public.reviews;
create policy "Service role can read reviews"
on public.reviews
for select
to service_role
using (true);

drop policy if exists "Service role can insert reviews" on public.reviews;
create policy "Service role can insert reviews"
on public.reviews
for insert
to service_role
with check (true);

drop policy if exists "Service role can update reviews" on public.reviews;
create policy "Service role can update reviews"
on public.reviews
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can delete reviews" on public.reviews;
create policy "Service role can delete reviews"
on public.reviews
for delete
to service_role
using (true);

-- Seed reviews data
do $$
begin
  if not exists (select 1 from public.reviews limit 1) then
    insert into public.reviews (quote, author, role, is_active, display_order)
    values
      ('Rush N Dush made a stressful sale feel straightforward. The process was fast, the offer was clear, and communication stayed simple the entire way.', 'Sarah M.', 'Inherited Property', true, 1),
      ('After dealing with multiple agents and countless showings, Rush N Dush gave us an offer in 24 hours and closed in two weeks. Exactly what we needed during a difficult time.', 'James & Patricia R.', 'Downsizing Homeowners', true, 2),
      ('I was worried about selling my house with all the repairs it needed. They took it as-is, no questions asked. The whole process was incredibly simple.', 'Michael T.', 'As-Is Sale', true, 3),
      ('We were facing foreclosure and didn''t know what to do. Rush N Dush helped us close quickly and move on with our lives. Forever grateful for their professionalism.', 'Linda K.', 'Time-Sensitive Sale', true, 4);
  end if;
end $$;

-- Lead answers table to store question/answer pairs for each lead
create table if not exists public.lead_answers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  question_id uuid not null references public.intake_questions(id) on delete cascade,
  question_text text not null,
  answer_value text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_answers_lead_id_idx on public.lead_answers (lead_id);

alter table public.lead_answers enable row level security;

drop policy if exists "Public can insert lead answers" on public.lead_answers;
create policy "Public can insert lead answers"
on public.lead_answers
for insert
to anon
with check (true);

drop policy if exists "Service role can read lead answers" on public.lead_answers;
create policy "Service role can read lead answers"
on public.lead_answers
for select
to service_role
using (true);
