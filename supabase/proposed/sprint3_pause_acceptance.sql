begin;
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub',(select user_id::text from public.fixed_expenses order by id limit 1),true);
set local role authenticated;
do $test$
declare owner_id uuid := auth.uid(); personal_id uuid; curr text; series_id uuid; first_due date := current_date;
begin
 select id,currency into personal_id,curr from public.spaces where type='personal' and created_by=owner_id and status='active' limit 1;
 insert into public.fixed_expenses(space_id,user_id,name,amount,currency,frequency,anchor_date,starts_on)
 values(personal_id,owner_id,'__pause_rolled_back__',1,curr,'weekly',first_due,first_due) returning id into series_id;
 perform public.set_fixed_expense_paused(series_id,true,current_date);
 perform public.set_fixed_expense_paused(series_id,true,current_date);
 if (select active or jsonb_array_length(pause_periods)<>1 from public.fixed_expenses where id=series_id) then raise exception 'Pause or idempotency failed'; end if;
 perform public.resolve_fixed_expense_occurrence_v2(series_id,first_due,'skipped',null);
 begin
  perform public.resolve_fixed_expense_occurrence_v2(series_id,first_due+7,'skipped',null);
  raise exception 'Paused future accepted';
 exception when raise_exception then if sqlerrm not like '%paused interval%' then raise; end if; end;
 perform public.set_fixed_expense_paused(series_id,false,current_date);
 if (select not active or pause_periods->0->>'resumed_on' is null from public.fixed_expenses where id=series_id) then raise exception 'Resume failed'; end if;
 update public.fixed_expenses set pause_periods=jsonb_build_array(jsonb_build_object('paused_after',first_due,'resumed_on',first_due+14)) where id=series_id;
 begin
  perform public.resolve_fixed_expense_occurrence_v2(series_id,first_due+7,'skipped',null);
  raise exception 'Catch-up accepted';
 exception when raise_exception then if sqlerrm not like '%paused interval%' then raise; end if; end;
 perform public.resolve_fixed_expense_occurrence_v2(series_id,first_due+14,'skipped',null);
 if (select count(*) from public.fixed_expense_occurrences where fixed_expense_id=series_id)<>2 then raise exception 'Resume boundary failed'; end if;
 begin
  update public.fixed_expenses set pause_periods='[{"paused_after":"invalid"}]' where id=series_id;
  raise exception 'Invalid chronology accepted';
 exception when check_violation then null; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin
  perform public.set_fixed_expense_paused(series_id,true,current_date);
  raise exception 'Foreign owner accepted';
 exception when insufficient_privilege then null; end;
end;
$test$;
select 'PASS: pause, resume, preserved due bill, no catch-up, chronology and ownership' as result;
rollback;
