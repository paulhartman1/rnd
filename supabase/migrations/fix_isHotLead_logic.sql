alter table public.leads
add column if not exists "isHotLead" boolean;

create or replace function public.compute_is_hot_lead(
  p_close_timeline text,
  p_sell_reason text
)
returns boolean
language sql
immutable
as $$
  select (
    p_close_timeline in ('As soon as possible', 'Within 2 weeks', 'Within 1 month')
    and coalesce(p_sell_reason, '') ~* '(inherit|foreclos)'
  );
$$;

create or replace function public.set_is_hot_lead()
returns trigger
language plpgsql
as $$
begin
  new."isHotLead" := public.compute_is_hot_lead(new.close_timeline, new.sell_reason);
  return new;
end;
$$;

drop trigger if exists leads_set_is_hot_lead on public.leads;
create trigger leads_set_is_hot_lead
before insert or update of close_timeline, sell_reason
on public.leads
for each row
execute function public.set_is_hot_lead();

update public.leads
set "isHotLead" = public.compute_is_hot_lead(close_timeline, sell_reason)
where "isHotLead" is distinct from public.compute_is_hot_lead(close_timeline, sell_reason);
