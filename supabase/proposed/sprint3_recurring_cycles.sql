-- Sprint 3 storage upgrade. SQL snapshot of the remote migration; no historical re-dating.
-- Old monthly RPC stays callable by the deployed client.
set lock_timeout = '5s';
set statement_timeout = '30s';

alter table public.fixed_expenses
  add column frequency text not null default 'monthly',
  add column anchor_date date,
  add constraint fixed_expenses_frequency_check check (frequency in ('weekly','monthly','yearly')),
  add constraint fixed_expenses_anchor_check check (
    (frequency = 'monthly' or anchor_date is not null)
    and (anchor_date is null or (isfinite(anchor_date) and extract(year from anchor_date) between 1 and 9999))
  );

alter table public.fixed_expenses add constraint fixed_expenses_identity_key unique(id,space_id,user_id);
alter table public.fixed_expense_occurrences
  add constraint fixed_occurrences_series_owner_fkey foreign key(fixed_expense_id,space_id,user_id)
    references public.fixed_expenses(id,space_id,user_id) on delete cascade,
  add constraint fixed_occurrences_due_date_key unique(fixed_expense_id,due_date),
  add constraint fixed_occurrences_month_check check (occurrence_month = date_trunc('month',due_date)::date);
alter table public.fixed_expense_occurrences
  drop constraint fixed_expense_occurrences_fixed_expense_id_occurrence_month_key;
create index fixed_occurrences_owner_due_idx on public.fixed_expense_occurrences(user_id,space_id,due_date);

-- Resolution evidence is writable only via an authorized, atomic resolver.
-- This prevents callers from inventing skipped/paid evidence directly.
revoke all on public.fixed_expense_occurrences from anon, authenticated;
grant select on public.fixed_expense_occurrences to authenticated;
drop policy "Users manage their recurring occurrences" on public.fixed_expense_occurrences;
create policy "Owners read personal recurring occurrences" on public.fixed_expense_occurrences
for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.spaces s
    where s.id = fixed_expense_occurrences.space_id and s.type='personal' and s.created_by=(select auth.uid())
  )
);

drop policy "Users can update personal fixed expenses" on public.fixed_expenses;
create policy "Users can update personal fixed expenses" on public.fixed_expenses
for update to authenticated using (
  user_id=(select auth.uid()) and exists(select 1 from public.spaces s
    where s.id=fixed_expenses.space_id and s.type='personal' and s.created_by=(select auth.uid()))
) with check (
  user_id=(select auth.uid()) and exists(select 1 from public.spaces s
    where s.id=fixed_expenses.space_id and s.type='personal' and s.created_by=(select auth.uid()))
);

-- Privileged implementation is outside the exposed public API schema.
create schema recurring_private;
revoke all on schema recurring_private from public, anon;
grant usage on schema recurring_private to authenticated;
create function recurring_private.resolve_occurrence(
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
  where f.id=p_fixed_expense_id and f.user_id=auth.uid() and f.active
    and s.created_by=auth.uid() and s.type='personal' and s.status='active'
  for update of f,s;
  if expense.id is null then raise exception 'Recurring expense unavailable.' using errcode='42501'; end if;
  select s.currency into space_currency from public.spaces s where s.id=expense.space_id;
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
revoke all on function recurring_private.resolve_occurrence(uuid,date,text,date,boolean) from public,anon;
grant execute on function recurring_private.resolve_occurrence(uuid,date,text,date,boolean) to authenticated;

create function public.resolve_fixed_expense_occurrence_v2(
  p_fixed_expense_id uuid,p_due_date date,p_action text,p_paid_on date default null
) returns uuid language sql security invoker set search_path=''
as $$ select recurring_private.resolve_occurrence(p_fixed_expense_id,p_due_date,p_action,p_paid_on,false); $$;
revoke all on function public.resolve_fixed_expense_occurrence_v2(uuid,date,text,date) from public,anon;
grant execute on function public.resolve_fixed_expense_occurrence_v2(uuid,date,text,date) to authenticated;

create or replace function public.resolve_fixed_expense_occurrence(
  p_fixed_expense_id uuid,p_occurrence_month date,p_action text
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare expense public.fixed_expenses%rowtype; expected date;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if p_occurrence_month is null or not isfinite(p_occurrence_month)
    or p_occurrence_month<>date_trunc('month',p_occurrence_month)::date then raise exception 'Month must be the first day.'; end if;
  select * into expense from public.fixed_expenses f where f.id=p_fixed_expense_id and f.user_id=auth.uid();
  if expense.id is null then raise exception 'Recurring expense unavailable.' using errcode='42501'; end if;
  if expense.frequency<>'monthly' then raise exception 'This cycle requires the new recurring interface.'; end if;
  expected := p_occurrence_month+
    least(expense.due_day,extract(day from (p_occurrence_month+interval '1 month - 1 day'))::integer)-1;
  return recurring_private.resolve_occurrence(p_fixed_expense_id,expected,p_action,expected,true);
end;
$$;
revoke all on function public.resolve_fixed_expense_occurrence(uuid,date,text) from public,anon;
grant execute on function public.resolve_fixed_expense_occurrence(uuid,date,text) to authenticated;
notify pgrst,'reload schema';
