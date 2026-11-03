begin;create table public.ai_assistant_preferences (
  user_id uuid not null references auth.users(id) on delete cascade, space_id uuid not null references public.spaces(id) on delete cascade,
  goal text not null check(goal in ('understand','flexible','subscriptions','steady')), primary key(user_id,space_id)
);
alter table public.ai_assistant_preferences enable row level security;
create policy own_assistant_preferences on public.ai_assistant_preferences for all to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'))
  with check(user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'));
revoke all on public.ai_assistant_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.ai_assistant_preferences to authenticated;

commit;
