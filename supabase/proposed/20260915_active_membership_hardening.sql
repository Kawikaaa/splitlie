-- APPLIED MANUALLY TO THE LINKED SUPABASE PROJECT ON 2026-09-15.
--
-- Purpose:
--   1. Require the payer of a shared transaction to be an active member.
--   2. Require every shared split participant to be an active member.
--   3. Force leave/remove operations through the history-preserving RPCs.
--
-- This migration does not rewrite or delete existing application data.

begin;

create or replace function public.validate_shared_transaction_payer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.spaces
    where id = new.space_id
      and type = 'shared'
  ) and not exists (
    select 1
    from public.space_members
    where space_id = new.space_id
      and user_id = new.paid_by
      and status = 'active'
  ) then
    raise exception 'The payer must be an active member of this shared space.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_shared_transaction_payer_trigger
on public.transactions;

create trigger validate_shared_transaction_payer_trigger
before insert or update of space_id, paid_by
on public.transactions
for each row
execute function public.validate_shared_transaction_payer();

create or replace function public.validate_shared_split_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_space_id uuid;
  target_space_type text;
begin
  select t.space_id, s.type
  into target_space_id, target_space_type
  from public.transactions t
  join public.spaces s on s.id = t.space_id
  where t.id = new.transaction_id;

  if target_space_id is null then
    raise exception 'Transaction not found.';
  end if;

  if target_space_type = 'shared' and not exists (
    select 1
    from public.space_members
    where space_id = target_space_id
      and user_id = new.user_id
      and status = 'active'
  ) then
    raise exception 'Every split participant must be an active member.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_shared_split_participant_trigger
on public.transaction_splits;

create trigger validate_shared_split_participant_trigger
before insert or update of transaction_id, user_id
on public.transaction_splits
for each row
execute function public.validate_shared_split_participant();

-- These policies physically delete membership history and bypass the validated
-- leave_shared_space/remove_space_member RPC workflows.
drop policy if exists "Members can leave shared spaces"
on public.space_members;

drop policy if exists "Owners can remove members"
on public.space_members;

revoke all on function public.validate_shared_transaction_payer()
from public, anon, authenticated;

revoke all on function public.validate_shared_split_participant()
from public, anon, authenticated;

commit;
