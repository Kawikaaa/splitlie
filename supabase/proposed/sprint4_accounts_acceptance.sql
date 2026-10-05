begin;
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub',(select user_id::text from public.fixed_expenses order by id limit 1),true);
set local role authenticated;
do $test$
declare owner_id uuid:=auth.uid(); personal_id uuid; shared_id uuid; fixture uuid; stamp timestamptz; updated_stamp timestamptz;
begin
 select id into personal_id from public.spaces where type='personal' and created_by=owner_id and status='active' limit 1;
 select id into shared_id from public.spaces where type='shared' limit 1;
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance)
 values(owner_id,personal_id,'__sprint4_rolled_back__','checking','USD',100) returning id,balance_updated_at into fixture,stamp;
 update public.financial_accounts set name='__renamed_fixture__' where id=fixture;
 if (select balance_updated_at<>stamp from public.financial_accounts where id=fixture) then raise exception 'Rename refreshed balance'; end if;
 update public.financial_accounts set balance=100 where id=fixture returning balance_updated_at into updated_stamp;
 if updated_stamp<=stamp then raise exception 'Balance confirmation failed'; end if;
 begin
  update public.financial_accounts set user_id=gen_random_uuid() where id=fixture;
  raise exception 'Owner reassignment accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.financial_accounts set balance_updated_at=now() where id=fixture;
  raise exception 'Timestamp spoof accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.financial_accounts set balance=-1 where id=fixture;
  raise exception 'Negative balance accepted';
 exception when check_violation then null; end;
 begin
  update public.financial_accounts set balance='NaN'::numeric where id=fixture;
  raise exception 'NaN balance accepted';
 exception when check_violation then null; end;
 if shared_id is not null then
  begin
   insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,shared_id,'__not_shared__','cash','USD',1);
   raise exception 'Shared insertion accepted';
  exception when insufficient_privilege then null; end;
 end if;
 update public.financial_accounts set archived_at=now() where id=fixture;
 if not exists(select 1 from public.financial_accounts where id=fixture and archived_at is not null) then raise exception 'Archive failed'; end if;
 update public.financial_accounts set archived_at=null where id=fixture;
 begin
  delete from public.financial_accounts where id=fixture;
  raise exception 'Permanent deletion accepted';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if exists(select 1 from public.financial_accounts where id=fixture) then raise exception 'Foreign read accepted'; end if;
 update public.financial_accounts set balance=999 where id=fixture;
 if found then raise exception 'Foreign write accepted'; end if;
 begin
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'__spoofed_owner__','cash','USD',1);
  raise exception 'Foreign insertion accepted';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 if (select balance<>100 from public.financial_accounts where id=fixture) then raise exception 'Foreign mutation persisted'; end if;
end;
$test$;
reset role;
select not has_table_privilege('anon','public.financial_accounts','SELECT')
 and not has_table_privilege('anon','public.financial_accounts','INSERT') as anon_denied;
select 'PASS: CRUD scope, archive/restore, manual timestamps, malformed balance, owner isolation' as result;
rollback;
