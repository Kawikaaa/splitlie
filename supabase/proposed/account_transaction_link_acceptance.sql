-- Rollback-only acceptance. Fixtures are never committed.
begin;
select set_config('request.jwt.claim.sub', 'ad26515e-1462-404f-87d0-0c609a971918', true);
set local role authenticated;
do $$
declare
  owner_id uuid := 'ad26515e-1462-404f-87d0-0c609a971918';
  personal_id uuid := '6b6f8993-23c4-44ca-b6a6-8ccd59a3d40b';
  a uuid; b uuid; card uuid; foreign_currency uuid; tx uuid; rejected boolean;
begin
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'QA rollback A','checking','USD',100) returning id into a;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'QA rollback B','checking','USD',50) returning id into b;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'QA rollback card','credit_card','USD',20) returning id into card;
  insert into public.financial_accounts(user_id,space_id,name,type,currency,balance) values(owner_id,personal_id,'QA rollback FX','cash','CNY',1000) returning id into foreign_currency;
  insert into public.transactions(space_id,created_by,paid_by,type,amount,currency,category,transaction_date,split_type,payment_status,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,financial_account_id,account_exchange_rate,account_rate_date)
  values(personal_id,owner_id,owner_id,'expense',10,'USD','Food',current_date,'none','paid',10,'USD',1,current_date,'converted',a,1,current_date) returning id into tx;
  if (select balance from public.financial_accounts where id=a) <> 90 then raise exception 'Deduction failed'; end if;
  update public.transactions set description='QA metadata' where id=tx;
  if (select balance from public.financial_accounts where id=a) <> 90 then raise exception 'Duplicate deduction'; end if;
  update public.transactions set amount=20,base_amount=20 where id=tx;
  if (select balance from public.financial_accounts where id=a) <> 80 then raise exception 'Amount edit failed'; end if;
  update public.transactions set financial_account_id=b where id=tx;
  if (select balance from public.financial_accounts where id=a) <> 100 or (select balance from public.financial_accounts where id=b) <> 30 then raise exception 'Account switch failed'; end if;
  update public.transactions set payment_status='upcoming' where id=tx;
  if (select balance from public.financial_accounts where id=b) <> 50 then raise exception 'Upcoming reversal failed'; end if;
  update public.transactions set payment_status='paid' where id=tx;
  update public.transactions set financial_account_id=null where id=tx;
  if (select balance from public.financial_accounts where id=b) <> 50 then raise exception 'Unlink reversal failed'; end if;
  update public.transactions set type='income',financial_account_id=a,account_exchange_rate=1,account_rate_date=current_date where id=tx;
  if (select balance from public.financial_accounts where id=a) <> 120 then raise exception 'Income failed'; end if;
  update public.transactions set type='expense',financial_account_id=card where id=tx;
  if (select balance from public.financial_accounts where id=a) <> 100 or (select balance from public.financial_accounts where id=card) <> 40 then raise exception 'Card debt failed'; end if;
  update public.transactions set financial_account_id=foreign_currency,account_exchange_rate=7 where id=tx;
  if (select balance from public.financial_accounts where id=foreign_currency) <> 860 then raise exception 'FX failed'; end if;
  if (select balance from public.financial_accounts where id=card) <> 20 then raise exception 'Card reversal failed'; end if;
  rejected := false;
  begin
    update public.transactions set amount=200,base_amount=200,financial_account_id=b,account_exchange_rate=1 where id=tx;
  exception when others then
    if sqlerrm not like '%ACCOUNT_INSUFFICIENT%' then raise; end if;
    rejected:=true;
  end;
  if not rejected or (select balance from public.financial_accounts where id=foreign_currency) <> 860 then raise exception 'Insufficiency atomicity failed'; end if;
  rejected := false;
  begin
    update public.financial_accounts set currency='USD' where id=foreign_currency;
  exception when others then
    if sqlerrm not like '%ACCOUNT_LINKED%' then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Linked identity guard failed'; end if;
  rejected := false;
  begin
    update public.transactions set account_exchange_rate=-1 where id=tx;
  exception when others then
    if sqlerrm not like '%ACCOUNT_RATE%' then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Invalid rate accepted'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  if exists(select 1 from public.financial_accounts where id=foreign_currency) then raise exception 'Foreign account visible'; end if;
  update public.transactions set description='Unauthorized' where id=tx;
  if found then raise exception 'Foreign transaction write allowed'; end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update public.financial_accounts set archived_at=clock_timestamp() where id=foreign_currency;
  update public.transactions set description='Archived metadata edit' where id=tx;
  rejected := false;
  begin
    update public.transactions set amount=21,base_amount=21 where id=tx;
  exception when others then
    if sqlerrm not like '%ACCOUNT_ARCHIVED%' then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Archived movement accepted'; end if;
  delete from public.transactions where id=tx;
  if (select balance from public.financial_accounts where id=foreign_currency) <> 1000 then raise exception 'Delete reversal failed'; end if;
end;$$;
rollback;
