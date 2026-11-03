-- Synthetic fixtures only; financial writes and reports all roll back.
begin;
set local lock_timeout='3s';
do $$
declare uid uuid; sid uuid; tid uuid:=gen_random_uuid(); rid uuid; aid uuid; tx_before bigint; n bigint; r jsonb;
begin
  select created_by,id into uid,sid from public.spaces where type='personal' and status='active' limit 1;
  if uid is null then raise exception 'Personal test scope needed'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into tx_before from public.transactions where space_id=sid;
  r:=jsonb_build_object('version',1,'reviewed',true,'image_hash',repeat('a',64),'merchant','SYNTHETIC TEST','date',current_date::text,'currency','USD','total','10.35','items',jsonb_build_array(jsonb_build_object('name','Tea','quantity',1,'amount','10.00')),'tax','0.35','tip',null,'discount',null,'uncertain','[]'::jsonb,'model','synthetic');
  insert into public.transactions(id,space_id,created_by,paid_by,type,amount,currency,base_amount,base_currency,exchange_rate,exchange_rate_date,conversion_status,category,description,transaction_date,split_type,payment_status,receipt_data)
    values(tid,sid,uid,uid,'expense',10.35,'USD',10.35,'USD',1,current_date,'converted','Other','SYNTHETIC AI receipt acceptance',current_date,'none','paid',r);
  if (select receipt_data->'items'->0->>'name' from public.transactions where id=tid)<>'Tea' then raise exception 'Receipt not persisted'; end if;
  begin
    update public.transactions set amount=12 where id=tid;
    raise exception 'Receipt mismatch accepted';
  exception when raise_exception then if sqlerrm not like '%RECEIPT_INVALID%' then raise; end if; end;
  if (select amount from public.transactions where id=tid)<>10.35 then raise exception 'Partial amount change'; end if;
  begin
    update public.transactions set receipt_data=receipt_data-'reviewed' where id=tid;
    raise exception 'Unreviewed receipt accepted';
  exception when raise_exception then if sqlerrm not like '%RECEIPT_INVALID%' then raise; end if; end;
  update public.transactions set receipt_data=jsonb_set(receipt_data,'{items,0,name}','"Edited tea"') where id=tid;
  if (select receipt_data->'items'->0->>'name' from public.transactions where id=tid)<>'Edited tea' then raise exception 'Line edit failed'; end if;
  insert into public.ai_weekly_reports(user_id,space_id,week_start,language,goal,facts_hash,facts,output,model,prompt_version)
    values(uid,sid,current_date,'en','understand',repeat('b',64),'{"version":1}', '{"observations":["scope"],"action":"track"}','synthetic','weekly-select-v1') returning id into rid;
  insert into public.ai_assistant_preferences(user_id,space_id,goal) values(uid,sid,'steady') on conflict(user_id,space_id) do update set goal=excluded.goal;
  insert into public.ai_assistant_actions(user_id,space_id,report_id,kind,feedback,review_date) values(uid,sid,rid,'track','accepted',current_date+7) returning id into aid;
  update public.ai_assistant_actions set feedback='helpful' where id=aid;
  if (select feedback from public.ai_assistant_actions where id=aid)<>'helpful' then raise exception 'Action feedback not saved'; end if;
  begin
    update public.ai_assistant_actions set kind='review_purchase' where id=aid;
    raise exception 'Invented action accepted';
  exception when insufficient_privilege then null; end;
  select count(*) into n from public.transactions where space_id=sid;
  if n<>tx_before+1 then raise exception 'Report or action wrote financial data'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  if exists(select 1 from public.transactions where id=tid) or exists(select 1 from public.ai_weekly_reports where id=rid) or exists(select 1 from public.ai_assistant_actions where id=aid) then raise exception 'Cross-user visibility'; end if;
  begin
    perform count(*) from public.ai_assistant_quotas;
    raise exception 'Client can read service quotas';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end $$;
rollback;
select not exists(select 1 from public.transactions where description='SYNTHETIC AI receipt acceptance') as synthetic_fixtures_remaining_false;
