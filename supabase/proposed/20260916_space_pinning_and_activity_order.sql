-- Query name: Space Management - Pinning and Activity Order

alter table public.space_members
  add column if not exists pinned_at timestamptz;

create index if not exists idx_space_members_user_pinned
  on public.space_members (user_id, pinned_at desc)
  where pinned_at is not null;

drop policy if exists "Members can update own space preferences" on public.space_members;
create policy "Members can update own space preferences"
on public.space_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.touch_related_space_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_space_id uuid;
begin
  target_space_id := coalesce(new.space_id, old.space_id);
  update public.spaces set updated_at = now() where id = target_space_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists touch_space_from_transactions on public.transactions;
create trigger touch_space_from_transactions
after insert or update or delete on public.transactions
for each row execute function public.touch_related_space_updated_at();

drop trigger if exists touch_space_from_settlements on public.settlements;
create trigger touch_space_from_settlements
after insert or update or delete on public.settlements
for each row execute function public.touch_related_space_updated_at();

drop trigger if exists touch_space_from_monthly_budgets on public.monthly_budgets;
create trigger touch_space_from_monthly_budgets
after insert or update or delete on public.monthly_budgets
for each row execute function public.touch_related_space_updated_at();

drop trigger if exists touch_space_from_fixed_expenses on public.fixed_expenses;
create trigger touch_space_from_fixed_expenses
after insert or update or delete on public.fixed_expenses
for each row execute function public.touch_related_space_updated_at();

drop trigger if exists touch_space_from_invitations on public.space_invitations;
create trigger touch_space_from_invitations
after insert or update or delete on public.space_invitations
for each row execute function public.touch_related_space_updated_at();

grant select, update (pinned_at) on public.space_members to authenticated;
