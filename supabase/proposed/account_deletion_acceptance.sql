-- Rollback-only acceptance: creates temporary fixtures, never deletes real accounts.
begin;
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub', (select created_by::text from public.spaces where type='personal' and status='active' order by id limit 1), true);
set local role authenticated;
do $test$
declare
  owner_id uuid := auth.uid(); personal_id uuid;
  unlinked uuid; linked uuid; tx uuid; stamp timestamptz; rejected boolean := false;
begin
  select id into personal_id from public.spaces where created_by=owner_id and type='personal' and status='active' limit 1;
  if personal_id is null then raise exception 'No test owner'; end if;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance)
  values(owner_id,personal_id,'__delete_rollback_unlinked__','checking','USD',100) returning id,updated_at into unlinked,stamp;
  delete from public.financial_accounts where id=unlinked and updated_at='1900-01-01'::timestamptz;
  if found then raise exception 'Stale deletion accepted'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  delete from public.financial_accounts where id=unlinked;
  if found then raise exception 'Foreign deletion accepted'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  delete from public.financial_accounts where id=unlinked and updated_at=stamp;
  if not found then raise exception 'Owner deletion denied'; end if;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance)
  values(owner_id,personal_id,'__delete_rollback_linked__','checking','USD',100) returning id into linked;
  insert into public.transactions(space_id,created_by,paid_by,type,amount,currency,category,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,financial_account_id,account_exchange_rate,account_rate_date)
  values(personal_id,owner_id,owner_id,'expense',10,'USD','Food',current_date,'none','paid',10,'USD',1,current_date,'converted',linked,1,current_date) returning id into tx;
  begin
    delete from public.financial_accounts where id=linked;
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'Linked deletion accepted'; end if;
  if (select balance from public.financial_accounts where id=linked) <> 90 or not exists(select 1 from public.transactions where id=tx) then raise exception 'Failed delete changed ledger'; end if;
  update public.financial_accounts set archived_at=clock_timestamp() where id=linked;
  rejected := false;
  begin
    delete from public.financial_accounts where id=linked;
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'Archived linked deletion accepted'; end if;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance)
  values(owner_id,personal_id,'__delete_rollback_archived__','checking','USD',100) returning id into unlinked;
  update public.financial_accounts set archived_at=clock_timestamp() where id=unlinked;
  delete from public.financial_accounts where id=unlinked;
  if not found then raise exception 'Unlinked archived deletion denied'; end if;
end;
$test$;
reset role;
do $test$ begin
  if has_table_privilege('anon','public.financial_accounts','DELETE') then raise exception 'Anonymous deletion permitted'; end if;
end; $test$;
select 'PASS: owner deletion, stale version, foreign owner, linked/archived protection, anonymous denial' as result;
rollback;
