-- Run only while the pilot is disabled. All quota changes roll back.
-- Reads an existing personal-space scope; never edits financial data.
begin;
set local lock_timeout = '3s';
lock table public.ai_parse_quotas in exclusive mode nowait;
do $$
declare
  owner_id uuid;
  space_id uuid;
  today_utc date := (clock_timestamp() at time zone 'UTC')::date;
  accepted boolean;
  n integer;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.ai_parse_quotas'::regclass) then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon', 'public.ai_parse_quotas', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.ai_parse_quotas', 'SELECT,INSERT,UPDATE,DELETE')
    or has_function_privilege('anon', 'public.reserve_ai_parse_quota(uuid,uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.reserve_ai_parse_quota(uuid,uuid)', 'EXECUTE') then raise exception 'public access allowed'; end if;
  select id, created_by into space_id, owner_id from public.spaces where type='personal' and created_by is not null limit 1;
  if space_id is null then raise exception 'personal scope fixture required'; end if;
  if public.reserve_ai_parse_quota(null, space_id)
    or public.reserve_ai_parse_quota('00000000-0000-0000-0000-000000000000', space_id)
    or public.reserve_ai_parse_quota(owner_id, '00000000-0000-0000-0000-000000000000') then raise exception 'foreign scope accepted'; end if;
  delete from public.ai_parse_quotas;
  insert into public.ai_parse_quotas (quota_day,scope_key,requests,last_request_at) values
    (today_utc-1,'global',50,clock_timestamp()),(today_utc-1,owner_id::text,10,clock_timestamp());
  if not public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'first reservation or day isolation failed'; end if;
  if public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'cooldown bypassed'; end if;
  select requests into n from public.ai_parse_quotas where quota_day=today_utc and scope_key='global';
  if n <> 1 then raise exception 'denial charged quota'; end if;
  update public.ai_parse_quotas set requests=9,last_request_at=clock_timestamp()-interval '21 seconds' where quota_day=today_utc and scope_key=owner_id::text;
  if not public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'tenth reservation denied'; end if;
  update public.ai_parse_quotas set last_request_at=clock_timestamp()-interval '21 seconds' where quota_day=today_utc;
  if public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'user cap bypassed'; end if;
  update public.ai_parse_quotas set requests=0 where quota_day=today_utc and scope_key=owner_id::text;
  update public.ai_parse_quotas set requests=49 where quota_day=today_utc and scope_key='global';
  if not public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'fiftieth reservation denied'; end if;
  update public.ai_parse_quotas set last_request_at=clock_timestamp()-interval '21 seconds' where quota_day=today_utc;
  if public.reserve_ai_parse_quota(owner_id,space_id) then raise exception 'global cap bypassed'; end if;
  -- Repeat the successful path with the role used by the deployed function.
  update public.ai_parse_quotas set requests=0,last_request_at=null where quota_day=today_utc;
  execute 'set local role service_role';
  accepted := public.reserve_ai_parse_quota(owner_id,space_id);
  execute 'reset role';
  if not accepted then raise exception 'service role failed'; end if;
end $$;
rollback;
select 'PASS: RLS, grants, scope, cooldown, caps, UTC-day isolation, service role; changes rolled back' as result;
