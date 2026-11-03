-- Real trigger/RLS tests using synthetic accounts only. Everything rolls back.
begin;
set local lock_timeout='3s';
do $$
declare
 uid uuid; sid uuid; other_uid uuid:=gen_random_uuid();
 a public.financial_accounts%rowtype; b public.financial_accounts%rowtype;
 c public.financial_accounts%rowtype; d public.financial_accounts%rowtype; card public.financial_accounts%rowtype;
 tr public.account_transfers%rowtype; cross_tr public.account_transfers%rowtype;
 candidate uuid; n integer; tx_before bigint; tx_after bigint;
begin
 select created_by,id into uid,sid from public.spaces where type='personal' and status='active' and created_by is not null limit 1;
 if uid is null then raise exception 'Active personal scope required'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(uid,sid,'TEST transfer source','checking','USD',100) returning * into a;
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(uid,sid,'TEST transfer destination','savings','USD',20) returning * into b;
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(uid,sid,'TEST transfer CNY','digital_wallet','CNY',0) returning * into c;
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(uid,sid,'TEST transfer credit','credit_card','USD',0) returning * into card;
 insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(uid,sid,'TEST replacement destination','checking','USD',40) returning * into d;
 select count(*) into tx_before from public.transactions where space_id=sid;
 insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
 values(gen_random_uuid(),uid,sid,a.id,b.id,10,10,'USD','USD',a.updated_at,b.updated_at,current_date) returning * into tr;
 if (select balance from public.financial_accounts where id=a.id)<>90 or (select balance from public.financial_accounts where id=b.id)<>30 then raise exception 'create movement failed'; end if;
 -- Original snapshots must be rejected on a second new transfer.
 begin
  insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
  values(gen_random_uuid(),uid,sid,a.id,b.id,10,10,'USD','USD',a.updated_at,b.updated_at,current_date);
  raise exception 'stale version accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_CONFLICT%' then raise; end if; end;
 select * into a from public.financial_accounts where id=a.id;
 select * into b from public.financial_accounts where id=b.id;
 update public.account_transfers set source_amount=15,target_amount=15,source_version=a.updated_at,target_version=b.updated_at where id=tr.id and updated_at=tr.updated_at returning * into tr;
 if (select balance from public.financial_accounts where id=a.id)<>85 or (select balance from public.financial_accounts where id=b.id)<>35 then raise exception 'edit delta failed'; end if;
 select * into a from public.financial_accounts where id=a.id;
 select * into b from public.financial_accounts where id=b.id;
 -- A duplicate key with fresh versions must still roll back its BEFORE movement.
 begin
  insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
  values(tr.id,uid,sid,a.id,b.id,15,15,'USD','USD',a.updated_at,b.updated_at,current_date);
  raise exception 'duplicate accepted';
 exception when unique_violation then null; end;
 if (select balance from public.financial_accounts where id=a.id)<>85 or (select balance from public.financial_accounts where id=b.id)<>35 then raise exception 'duplicate changed balances'; end if;
 begin
  insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
  values(gen_random_uuid(),uid,sid,a.id,b.id,1000,1000,'USD','USD',a.updated_at,b.updated_at,current_date);
  raise exception 'overspend accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_INSUFFICIENT%' then raise; end if; end;
 if (select balance from public.financial_accounts where id=a.id)<>85 then raise exception 'failed operation was partial'; end if;
 -- Different currencies preserve the supplied actual receipt, without FX guessing.
 insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
 values(gen_random_uuid(),uid,sid,a.id,c.id,5,35.12,'USD','CNY',a.updated_at,c.updated_at,current_date) returning * into cross_tr;
 if (select balance from public.financial_accounts where id=a.id)<>80 or (select balance from public.financial_accounts where id=c.id)<>35.12 then raise exception 'cross currency failed'; end if;
 -- Replacing both ends must undo the old route and apply the new route atomically.
 select * into c from public.financial_accounts where id=c.id;
 update public.account_transfers set source_account_id=c.id,target_account_id=d.id,source_amount=10,target_amount=1.4,source_currency='CNY',target_currency='USD',source_version=c.updated_at,target_version=d.updated_at where id=tr.id returning * into tr;
 if (select balance from public.financial_accounts where id=a.id)<>95 or (select balance from public.financial_accounts where id=b.id)<>20 or (select balance from public.financial_accounts where id=c.id)<>25.12 or (select balance from public.financial_accounts where id=d.id)<>41.4 then raise exception 'four account edit failed'; end if;
 update public.account_transfers set status='cancelled' where id=tr.id;
 update public.account_transfers set status='cancelled' where id=cross_tr.id;
 if (select balance from public.financial_accounts where id=a.id)<>100 or (select balance from public.financial_accounts where id=b.id)<>20 or (select balance from public.financial_accounts where id=c.id)<>0 then raise exception 'reversal failed'; end if;
 begin update public.account_transfers set status='completed' where id=tr.id; raise exception 'reactivation accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_CANCELLED%' then raise; end if; end;
 select * into a from public.financial_accounts where id=a.id;
 select * into b from public.financial_accounts where id=b.id;
 insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
 values(gen_random_uuid(),uid,sid,a.id,b.id,10,10,'USD','USD',a.updated_at,b.updated_at,current_date) returning * into tr;
 update public.financial_accounts set balance=0 where id=b.id;
 begin update public.account_transfers set status='cancelled' where id=tr.id; raise exception 'unsupported reversal accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_INSUFFICIENT%' then raise; end if; end;
 if (select balance from public.financial_accounts where id=a.id)<>90 or (select status from public.account_transfers where id=tr.id)<>'completed' then raise exception 'reversal failure was partial'; end if;
 update public.financial_accounts set balance=30,archived_at=clock_timestamp() where id=b.id;
 update public.account_transfers set status='cancelled' where id=tr.id;
 if (select balance from public.financial_accounts where id=b.id)<>20 then raise exception 'archived reversal failed'; end if;
 begin update public.financial_accounts set currency='CAD' where id=a.id; raise exception 'identity changed';
 exception when raise_exception then if sqlerrm not like '%ACCOUNT_LINKED%' then raise; end if; end;
 begin delete from public.financial_accounts where id=a.id; raise exception 'linked account deleted'; exception when foreign_key_violation then null; end;
 select * into a from public.financial_accounts where id=a.id;
 begin
  insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
  values(gen_random_uuid(),uid,sid,a.id,card.id,1,1,'USD','USD',a.updated_at,card.updated_at,current_date);
  raise exception 'credit card accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_ASSET_ONLY%' then raise; end if; end;
 begin
  insert into public.account_transfers(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date)
  values(gen_random_uuid(),other_uid,sid,a.id,c.id,1,7,'USD','CNY',a.updated_at,c.updated_at,current_date);
  raise exception 'spoofed owner accepted';
 exception when raise_exception then if sqlerrm not like '%TRANSFER_SCOPE%' then raise; end if; end;
 select count(*) into tx_after from public.transactions where space_id=sid;
 if tx_before<>tx_after then raise exception 'ordinary transactions changed'; end if;
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',other_uid,'role','authenticated')::text,true);
 if exists(select 1 from public.account_transfers where id=tr.id) then raise exception 'foreign owner can read transfer'; end if;
 update public.account_transfers set status='completed' where id=tr.id;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'foreign owner can update transfer'; end if;
 execute 'reset role';
 if has_table_privilege('anon','public.account_transfers','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.account_transfers','DELETE') then raise exception 'grants too broad'; end if;
end $$;
rollback;
select 'PASS: real authenticated create/edit/cancel; atomic failure, retry, actual FX receipt, versions, archive, identity, FK, credit rejection, owner isolation; synthetic fixtures rolled back' as result;
