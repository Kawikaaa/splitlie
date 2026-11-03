-- Rollback-only acceptance. No real account or transaction is changed.
begin;
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub',(select created_by::text from public.spaces where type='personal' and status='active' and currency='USD' order by id limit 1),true);
set local role authenticated;
do $test$
declare owner_id uuid:=auth.uid(); personal_id uuid; a uuid; b uuid; card uuid; original uuid; first_refund uuid; second_refund uuid; rejected boolean;
begin
  select id into personal_id from public.spaces where type='personal' and status='active' and currency='USD' and created_by=owner_id limit 1;
  if personal_id is null then raise exception 'USD test space required'; end if;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'__refund_rollback_A__','checking','USD',200) returning id into a;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'__refund_rollback_FX__','cash','CNY',700) returning id into b;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'__refund_rollback_card__','credit_card','USD',100) returning id into card;
  insert into public.transactions(space_id,created_by,paid_by,type,amount,currency,category,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,financial_account_id,account_exchange_rate,account_rate_date)
  values(personal_id,owner_id,owner_id,'expense',100,'USD','Food',current_date-35,'none','paid',100,'USD',1,current_date-35,'converted',a,1,current_date-35) returning id into original;
  insert into public.transactions(space_id,created_by,paid_by,type,parent_transaction_id,amount,currency,category,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,financial_account_id,account_exchange_rate,account_rate_date)
  values(personal_id,owner_id,owner_id,'refund',original,20,'USD','Income',current_date,'none','paid',20,'USD',1,current_date,'converted',b,7,current_date) returning id into first_refund;
  if (select category from public.transactions where id=first_refund)<>'Food' or (select balance from public.financial_accounts where id=b)<>840 then raise exception 'Refund inheritance or FX movement failed'; end if;
  if (select transaction_date from public.transactions where id=original)<>current_date-35 then raise exception 'Original date rewritten'; end if;
  update public.transactions set amount=25,base_amount=25,financial_account_id=a,account_exchange_rate=1 where id=first_refund;
  if (select balance from public.financial_accounts where id=b)<>700 or (select balance from public.financial_accounts where id=a)<>125 then raise exception 'Refund edit or account switch failed'; end if;
  update public.transactions set description='metadata only' where id=first_refund;
  if (select balance from public.financial_accounts where id=a)<>125 then raise exception 'Duplicate refund credit'; end if;
  insert into public.transactions(space_id,created_by,paid_by,type,parent_transaction_id,amount,currency,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,financial_account_id,account_exchange_rate,account_rate_date)
  values(personal_id,owner_id,owner_id,'refund',original,30,'USD',current_date,'none','paid',30,'USD',1,current_date,'converted',card,1,current_date) returning id into second_refund;
  if (select balance from public.financial_accounts where id=card)<>70 then raise exception 'Card debt refund failed'; end if;
  rejected:=false;
  begin update public.transactions set amount=80,base_amount=80 where id=first_refund;
  exception when others then if sqlerrm not like '%REFUND_LIMIT%' then raise; end if; rejected:=true; end;
  if not rejected or (select balance from public.financial_accounts where id=a)<>125 then raise exception 'Refund cap atomicity failed'; end if;
  rejected:=false;
  begin update public.transactions set currency='CNY' where id=first_refund;
  exception when others then if sqlerrm not like '%REFUND_CURRENCY%' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'Wrong currency accepted'; end if;
  rejected:=false;
  begin update public.transactions set transaction_date=current_date-36 where id=first_refund;
  exception when others then if sqlerrm not like '%REFUND_DATE%' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'Early refund accepted'; end if;
  rejected:=false;
  begin update public.transactions set transaction_date=current_date+1 where id=first_refund;
  exception when others then if sqlerrm not like '%REFUND_DATE%' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'Future refund accepted'; end if;
  rejected:=false;
  begin update public.transactions set amount=90,base_amount=90 where id=original;
  exception when others then if sqlerrm not like '%REFUND_LINKED%' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'Original mutation accepted'; end if;
  rejected:=false;
  begin delete from public.transactions where id=original;
  exception when others then if sqlerrm not like '%REFUND_LINKED%' then raise; end if; rejected:=true; end;
  if not rejected then raise exception 'Original deletion accepted'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  update public.transactions set amount=1 where id=first_refund;
  if found then raise exception 'Foreign refund update accepted'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  delete from public.transactions where id=second_refund;
  if (select balance from public.financial_accounts where id=card)<>100 then raise exception 'Refund delete reversal failed'; end if;
  -- An unlinked refund affects spending without changing account balances.
  insert into public.transactions(space_id,created_by,paid_by,type,parent_transaction_id,amount,currency,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status)
  values(personal_id,owner_id,owner_id,'refund',original,75,'USD',current_date,'none','paid',75,'USD',1,current_date,'converted') returning id into second_refund;
  if (select balance from public.financial_accounts where id=a)<>125 then raise exception 'Unlinked refund mutated account'; end if;
  delete from public.transactions where id=second_refund;
  delete from public.transactions where id=first_refund;
  if (select balance from public.financial_accounts where id=a)<>100 then raise exception 'Final refund reversal failed'; end if;
  delete from public.transactions where id=original;
  if (select balance from public.financial_accounts where id=a)<>200 then raise exception 'Original delete after refunds failed'; end if;
end;
$test$;
select 'PASS: partial refunds, original-currency cap, FX credit, card debt, received date, original protection, owner isolation, edits, unlinked and delete reversal' as result;
rollback;
