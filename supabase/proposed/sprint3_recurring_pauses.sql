set lock_timeout='5s';
create function recurring_private.valid_pauses(periods jsonb) returns boolean
language plpgsql immutable security invoker set search_path=''
as $$
declare item jsonb; start_day date; end_day date; previous_end date; open_seen boolean := false;
begin
  if periods is null or jsonb_typeof(periods)<>'array' then return false; end if;
  for item in select value from jsonb_array_elements(periods) loop
    if jsonb_typeof(item)<>'object' or not(item ? 'paused_after') then return false; end if;
    start_day := (item->>'paused_after')::date;
    end_day := (item->>'resumed_on')::date;
    if start_day is null or not isfinite(start_day) or open_seen
      or (end_day is not null and (not isfinite(end_day) or end_day<start_day))
      or (previous_end is not null and start_day<previous_end) then return false; end if;
    previous_end := end_day;
    open_seen := end_day is null;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function recurring_private.valid_pauses(jsonb) from public,anon;
grant execute on function recurring_private.valid_pauses(jsonb) to authenticated;
alter table public.fixed_expenses add column pause_periods jsonb not null default '[]'::jsonb,
 add constraint fixed_expenses_pause_periods_check check (recurring_private.valid_pauses(pause_periods));
create function recurring_private.set_paused(p_id uuid,p_paused boolean,p_today date) returns uuid
language plpgsql security definer set search_path=''
as $$
declare expense public.fixed_expenses%rowtype; periods jsonb; last_index integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if p_paused is null or p_today is null or not isfinite(p_today)
    or p_today not between current_date-1 and current_date+1 then raise exception 'Use your current local calendar date.'; end if;
  select f.* into expense from public.fixed_expenses f join public.spaces s on s.id=f.space_id
  where f.id=p_id and f.user_id=auth.uid() and s.created_by=auth.uid() and s.type='personal' and s.status='active'
  for update of f;
  if expense.id is null then raise exception 'Recurring expense unavailable.' using errcode='42501'; end if;
  periods := expense.pause_periods;
  last_index := jsonb_array_length(periods)-1;
  if p_paused then
    if last_index>=0 and periods->last_index->>'resumed_on' is null then return expense.id; end if;
    if not expense.active then raise exception 'Inactive legacy rule cannot be paused.'; end if;
    periods := periods || jsonb_build_array(jsonb_build_object('paused_after',p_today,'resumed_on',null));
  else
    if last_index<0 or periods->last_index->>'resumed_on' is not null then
      if expense.active then return expense.id; end if;
      raise exception 'Inactive legacy rule has no pause history.';
    end if;
    periods := jsonb_set(periods,array[last_index::text,'resumed_on'],to_jsonb(p_today));
  end if;
  if not recurring_private.valid_pauses(periods) then raise exception 'Invalid pause chronology.'; end if;
  update public.fixed_expenses set active=not p_paused,pause_periods=periods,updated_at=now() where id=expense.id;
  return expense.id;
end;
$$;
revoke all on function recurring_private.set_paused(uuid,boolean,date) from public,anon;
grant execute on function recurring_private.set_paused(uuid,boolean,date) to authenticated;
create function public.set_fixed_expense_paused(p_id uuid,p_paused boolean,p_today date) returns uuid
language sql security invoker set search_path=''
as $$select recurring_private.set_paused(p_id,p_paused,p_today);$$;
revoke all on function public.set_fixed_expense_paused(uuid,boolean,date) from public,anon;
grant execute on function public.set_fixed_expense_paused(uuid,boolean,date) to authenticated;
create or replace function recurring_private.resolve_occurrence(
  p_fixed_expense_id uuid, p_due_date date, p_action text, p_paid_on date, p_legacy boolean default false
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
  expense public.fixed_expenses%rowtype;
  expected date;
  payment_date date;
  transaction_value uuid;
  space_currency text;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if p_action is null or p_action not in ('paid','skipped') then raise exception 'Invalid action.'; end if;
  if p_due_date is null or not isfinite(p_due_date) or extract(year from p_due_date) not between 1 and 9999 then
    raise exception 'Invalid due date.';
  end if;
  select f.* into expense
  from public.fixed_expenses f join public.spaces s on s.id=f.space_id
  where f.id=p_fixed_expense_id and f.user_id=auth.uid() and (f.active or jsonb_array_length(f.pause_periods)>0)
    and s.created_by=auth.uid() and s.type='personal' and s.status='active'
  for update of f,s;
  if expense.id is null then raise exception 'Recurring expense unavailable.' using errcode='42501'; end if;
  select s.currency into space_currency from public.spaces s where s.id=expense.space_id;
  if exists(select 1 from jsonb_array_elements(expense.pause_periods) p
    where p_due_date>(p->>'paused_after')::date and
      (p->>'resumed_on' is null or p_due_date<(p->>'resumed_on')::date)) then
    raise exception 'This due date is inside a paused interval.';
  end if;
  if expense.currency<>space_currency then raise exception 'Recurring currency needs review.'; end if;
  if p_legacy and expense.frequency<>'monthly' then raise exception 'This cycle requires the new recurring interface.'; end if;
  if expense.anchor_date is not null and p_due_date<expense.anchor_date then raise exception 'Due date precedes anchor.'; end if;
  if p_due_date<expense.starts_on and
    not(expense.frequency='monthly' and expense.anchor_date is null
      and date_trunc('month',p_due_date)=date_trunc('month',expense.starts_on)) then
    raise exception 'Due date precedes start.';
  end if;
  if expense.ends_on is not null and p_due_date>expense.ends_on and
    not(expense.frequency='monthly' and expense.anchor_date is null
      and date_trunc('month',p_due_date)=date_trunc('month',expense.ends_on)) then
    raise exception 'Due date is after end.';
  end if;
  if expense.frequency='weekly' then
    if (p_due_date-expense.anchor_date)%7<>0 then raise exception 'Not a scheduled weekly date.'; end if;
  elsif expense.frequency='monthly' then
    expected := date_trunc('month',p_due_date)::date +
      least(expense.due_day,extract(day from (date_trunc('month',p_due_date)+interval '1 month - 1 day'))::integer)-1;
    if p_due_date<>expected then raise exception 'Not a scheduled monthly date.'; end if;
  else
    expected := make_date(extract(year from p_due_date)::integer,extract(month from expense.anchor_date)::integer,1);
    expected := expected + least(extract(day from expense.anchor_date)::integer,
      extract(day from (expected+interval '1 month - 1 day'))::integer)-1;
    if p_due_date<>expected then raise exception 'Not a scheduled yearly date.'; end if;
  end if;

  if exists(select 1 from public.fixed_expense_occurrences o
    where o.fixed_expense_id=expense.id and (o.due_date=p_due_date or
      (expense.frequency='monthly' and o.occurrence_month=date_trunc('month',p_due_date)::date))) then
    raise exception 'This occurrence has already been resolved.';
  end if;

  if p_action='paid' then
    payment_date := case when p_legacy then p_due_date else p_paid_on end;
    if payment_date is null or not isfinite(payment_date) or extract(year from payment_date) not between 1 and 9999 then
      raise exception 'Actual payment date is required.';
    end if;
    -- +1 allows local calendars ahead of the database UTC date. New UI supplies its local today.
    if not p_legacy and payment_date>current_date+1 then raise exception 'Payment date cannot be in the future.'; end if;
    insert into public.transactions(
      space_id,created_by,paid_by,type,amount,currency,base_amount,base_currency,exchange_rate,
      exchange_rate_date,conversion_status,category,description,transaction_date,split_type,payment_status
    ) values(
      expense.space_id,auth.uid(),auth.uid(),'expense',expense.amount,expense.currency,expense.amount,
      expense.currency,1,payment_date,'converted',expense.category,expense.name,payment_date,'none','paid'
    ) returning id into transaction_value;
  end if;
  insert into public.fixed_expense_occurrences(
    fixed_expense_id,space_id,user_id,occurrence_month,due_date,status,transaction_id
  ) values(expense.id,expense.space_id,auth.uid(),date_trunc('month',p_due_date)::date,p_due_date,p_action,transaction_value);
  return transaction_value;
end;
$$;

notify pgrst,'reload schema';
