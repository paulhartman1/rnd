-- Rename title column to reason in blackout_periods table
alter table public.blackout_periods
rename column title to reason;

-- Make reason nullable (was not null as title)
alter table public.blackout_periods
alter column reason drop not null;

-- Add comment for documentation
comment on column public.blackout_periods.reason is 'Optional reason or note for why this time period is blocked out';
