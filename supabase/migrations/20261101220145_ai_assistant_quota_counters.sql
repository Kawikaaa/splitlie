begin;create table public.ai_assistant_quotas(quota_day date not null, user_id uuid not null, task text not null check(task in ('receipt','weekly')), requests integer not null default 0 check(requests>=0), primary key(quota_day,user_id,task));
alter table public.ai_assistant_quotas enable row level security;
revoke all on public.ai_assistant_quotas from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_quotas to service_role;
commit;

