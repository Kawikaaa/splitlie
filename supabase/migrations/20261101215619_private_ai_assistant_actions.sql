begin;create table public.ai_assistant_actions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade, report_id uuid not null references public.ai_weekly_reports(id) on delete cascade,
  kind text not null check(kind in ('track','review_category','review_purchase')),
  feedback text not null check(feedback in ('accepted','ignored','one_off','necessary','helpful','not_helpful','completed')),
  review_date date not null, created_at timestamptz not null default now(), unique(user_id,report_id)
);
create index ai_assistant_actions_scope on public.ai_assistant_actions(user_id,space_id,review_date);
alter table public.ai_assistant_actions enable row level security;
create policy own_assistant_actions on public.ai_assistant_actions for all to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.ai_weekly_reports r where r.id=report_id and r.user_id=(select auth.uid()) and r.space_id=ai_assistant_actions.space_id))
  with check(user_id=(select auth.uid()) and exists(select 1 from public.ai_weekly_reports r where r.id=report_id and r.user_id=(select auth.uid()) and r.space_id=ai_assistant_actions.space_id and r.output->>'action'=kind));
revoke all on public.ai_assistant_actions from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_actions to authenticated;

commit;
