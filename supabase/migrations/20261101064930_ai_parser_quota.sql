-- Applied remotely via MCP; filename matches the actual remote migration version.
begin;
create table public.ai_parse_quotas (
  quota_day date not null, scope_key text not null,
  requests integer not null default 0 check (requests >= 0),
  last_request_at timestamptz, primary key (quota_day, scope_key)
);
alter table public.ai_parse_quotas enable row level security;
revoke all on public.ai_parse_quotas from public, anon, authenticated;
grant select, insert, update, delete on public.ai_parse_quotas to service_role;
create function public.reserve_ai_parse_quota(p_user_id uuid, p_space_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  day_key date := (pg_catalog.clock_timestamp() at time zone 'UTC')::date;
  now_key timestamptz := pg_catalog.clock_timestamp();
  own public.ai_parse_quotas%rowtype;
  total_count integer;
begin
  if p_user_id is null or not exists (select 1 from public.spaces where id = p_space_id and created_by = p_user_id and type = 'personal') then return false; end if;
  insert into public.ai_parse_quotas (quota_day, scope_key) values (day_key, 'global') on conflict do nothing;
  select requests into total_count from public.ai_parse_quotas where quota_day = day_key and scope_key = 'global' for update;
  if total_count >= 50 then return false; end if;
  insert into public.ai_parse_quotas (quota_day, scope_key) values (day_key, p_user_id::text) on conflict do nothing;
  select * into own from public.ai_parse_quotas where quota_day = day_key and scope_key = p_user_id::text for update;
  if own.requests >= 10 or own.last_request_at > now_key - interval '20 seconds' then return false; end if;
  update public.ai_parse_quotas set requests = requests + 1, last_request_at = now_key where quota_day = day_key and scope_key in ('global', p_user_id::text);
  delete from public.ai_parse_quotas where quota_day < day_key - 7;
  return true;
end;
$$;
revoke all on function public.reserve_ai_parse_quota(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_parse_quota(uuid, uuid) to service_role;
commit;
-- Rollback disables AI: drop function public.reserve_ai_parse_quota(uuid, uuid); drop table public.ai_parse_quotas;
