begin;create table public.ai_weekly_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade, week_start date not null,
  language text not null check (language in ('en','zh','ja','ko','es')),
  goal text not null check (goal in ('understand','flexible','subscriptions','steady')),
  facts_hash text not null check (facts_hash ~ '^[a-f0-9]{64}$'), facts jsonb not null check (jsonb_typeof(facts)='object' and pg_column_size(facts)<20000),
  output jsonb not null check (jsonb_typeof(output)='object' and pg_column_size(output)<2000), model text not null, prompt_version text not null,
  created_at timestamptz not null default now(), unique(user_id,space_id,facts_hash)
);
create index ai_weekly_reports_scope on public.ai_weekly_reports(user_id,space_id,week_start,language,created_at desc);
alter table public.ai_weekly_reports enable row level security;
create policy own_reports on public.ai_weekly_reports for all to authenticated
  using (user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'))
  with check (user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'));
revoke all on public.ai_weekly_reports from public,anon,authenticated;
grant select,insert,delete on public.ai_weekly_reports to authenticated;

commit;
