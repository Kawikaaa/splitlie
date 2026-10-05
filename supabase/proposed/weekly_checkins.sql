create table public.weekly_checkins (
 user_id uuid not null references public.profiles(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade,
 week_start date not null check (extract(isodow from week_start)=1),
 feeling text check (feeling in ('comfortable','aboutRight','higherThanLiked')),
 tags text[] not null default '{}' check (tags <@ array['diningOut','socialActivities','shoppingReason','transportationReason','travelReason','unexpectedExpense','otherReason']::text[] and cardinality(tags)<=7),
 completed_at timestamptz,
 completed_date date,
 primary key (user_id,space_id,week_start),
 check ((completed_at is null) = (completed_date is null))
);
create index weekly_checkins_space_idx on public.weekly_checkins(space_id);
alter table public.weekly_checkins enable row level security;
revoke all on public.weekly_checkins from anon,authenticated;
grant select,insert,update on public.weekly_checkins to authenticated;
create policy "Read own personal checkins" on public.weekly_checkins for select to authenticated
 using ((select auth.uid())=user_id and exists (select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.created_by=(select auth.uid())));
create policy "Insert own personal checkins" on public.weekly_checkins for insert to authenticated
 with check ((select auth.uid())=user_id and exists (select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.created_by=(select auth.uid())));
create policy "Update own personal checkins" on public.weekly_checkins for update to authenticated
 using ((select auth.uid())=user_id and exists (select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.created_by=(select auth.uid())))
 with check ((select auth.uid())=user_id and exists (select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.created_by=(select auth.uid())));
