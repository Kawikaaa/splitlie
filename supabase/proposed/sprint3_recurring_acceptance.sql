begin;
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub',(select user_id::text from public.fixed_expenses order by id limit 1),true);
set local role authenticated;
do $test$
declare
  owner_id uuid := auth.uid();
  personal_id uuid;
  curr text;
  weekly_id uuid;
  yearly_id uuid;
  monthly_id uuid;
  payment_id uuid;
  first_due date := date_trunc('month',current_date)::date;
  anchor date := (date_trunc('year',current_date)-interval '1 year')::date;
  paid_date date := current_date-3;
begin
  select id,currency into personal_id,curr from public.spaces where type='personal' and created_by=owner_id and status='active' limit 1;
  if personal_id is null then raise exception 'No eligible fixture space'; end if;
  insert into public.fixed_expenses(space_id,user_id,name,amount,currency,frequency,anchor_date,starts_on)
    values(personal_id,owner_id,'__sprint3_rolled_back_weekly__',1,curr,'weekly',first_due,first_due) returning id into weekly_id;
  payment_id := public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due,'paid',paid_date);
  if not exists(select 1 from public.transactions where id=payment_id and transaction_date=paid_date and amount=1) then raise exception 'Actual payment date failed'; end if;
  perform public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due+7,'skipped',null);
  if (select count(*) from public.fixed_expense_occurrences where fixed_expense_id=weekly_id)<>2 then raise exception 'Weekly independent resolutions failed'; end if;
  begin
    perform public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due,'paid',paid_date);
    raise exception 'Duplicate accepted';
  exception when raise_exception then
    if sqlerrm not like '%already been resolved%' then raise; end if;
  end;
  begin
    perform public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due+1,'skipped',null);
    raise exception 'Invalid schedule accepted';
  exception when raise_exception then
    if sqlerrm not like '%scheduled weekly%' then raise; end if;
  end;
  begin
    perform public.resolve_fixed_expense_occurrence(weekly_id,first_due,'paid');
    raise exception 'Old API accepted weekly rule';
  exception when raise_exception then
    if sqlerrm not like '%new recurring interface%' then raise; end if;
  end;
  begin
    insert into public.fixed_expense_occurrences(fixed_expense_id,space_id,user_id,occurrence_month,due_date,status)
      values(weekly_id,personal_id,owner_id,first_due,first_due+14,'skipped');
    raise exception 'Direct evidence forgery accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.fixed_expenses set user_id=gen_random_uuid() where id=weekly_id;
    raise exception 'Owner reassignment accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  if exists(select 1 from public.fixed_expenses where id=weekly_id) or exists(select 1 from public.fixed_expense_occurrences where fixed_expense_id=weekly_id) then raise exception 'Cross-user RLS read leaked'; end if;
  begin
    perform public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due+14,'skipped',null);
    raise exception 'Cross-user resolver accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.resolve_fixed_expense_occurrence_v2(weekly_id,first_due+14,'skipped',null);
    raise exception 'Unauthenticated resolver accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  insert into public.fixed_expenses(space_id,user_id,name,amount,currency,due_day,starts_on)
    values(personal_id,owner_id,'__sprint3_rolled_back_legacy__',1,curr,1,first_due) returning id into monthly_id;
  payment_id := public.resolve_fixed_expense_occurrence(monthly_id,first_due,'paid');
  if not exists(select 1 from public.transactions where id=payment_id and transaction_date=first_due) then raise exception 'Legacy payment-date compatibility failed'; end if;
  insert into public.fixed_expenses(space_id,user_id,name,amount,currency,frequency,anchor_date,starts_on)
    values(personal_id,owner_id,'__sprint3_rolled_back_yearly__',120,curr,'yearly',anchor,anchor) returning id into yearly_id;
  perform public.resolve_fixed_expense_occurrence_v2(yearly_id,date_trunc('year',current_date)::date,'paid',paid_date);
  if not exists(select 1 from public.fixed_expense_occurrences where fixed_expense_id=yearly_id and due_date=date_trunc('year',current_date)::date) then raise exception 'Yearly resolution failed'; end if;
  if has_function_privilege('anon','public.resolve_fixed_expense_occurrence_v2(uuid,date,text,date)','execute')
    or has_function_privilege('anon','public.resolve_fixed_expense_occurrence(uuid,date,text)','execute')
    or has_table_privilege('authenticated','public.fixed_expense_occurrences','insert') then raise exception 'Excess privileges'; end if;
end;
$test$;
rollback;
select 'PASS: weekly/yearly/legacy, actual paid date, duplicates, schedule validation, owner reassignment, cross-user RLS, anonymous denial; all fixtures rolled back' as result;
