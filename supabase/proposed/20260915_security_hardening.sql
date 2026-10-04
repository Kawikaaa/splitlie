-- APPLIED MANUALLY TO THE LINKED SUPABASE PROJECT ON 2026-09-15.
-- The matching frontend RPC change is present in src/components/SettlementModal.jsx.
--
-- Purpose:
--   1. Prevent expired/revoked/accepted invitation replay.
--   2. Restrict invitation creation to an active owner.
--   3. Require active payers and split participants.
--   4. Create settlements through a validated, atomic RPC.
--
-- This migration does not delete or rewrite existing business data.

begin;

create or replace function public.create_space_invitation(
  target_space_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1
    from public.spaces
    where id = target_space_id
      and type = 'shared'
  ) then
    raise exception 'Shared space not found.';
  end if;

  if not public.is_space_owner(target_space_id) then
    raise exception 'Only the active space owner can invite members.';
  end if;

  new_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.space_invitations (
    space_id,
    invited_email,
    invited_by,
    token,
    status,
    expires_at
  )
  values (
    target_space_id,
    null,
    auth.uid(),
    new_token,
    'pending',
    now() + interval '7 days'
  );

  return new_token;
end;
$$;

create or replace function public.accept_space_invitation(
  invitation_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.space_invitations%rowtype;
  joined_space_id uuid;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select *
  into invitation_record
  from public.space_invitations
  where token = invitation_token
  for update;

  if not found then
    raise exception 'This invitation is invalid or no longer exists.';
  end if;

  if invitation_record.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked.';
  end if;

  if invitation_record.expires_at <= now() then
    raise exception 'This invitation has expired.';
  end if;

  joined_space_id := invitation_record.space_id;

  if not exists (
    select 1
    from public.spaces
    where id = joined_space_id
      and type = 'shared'
  ) then
    raise exception 'This shared space no longer exists.';
  end if;

  if invitation_record.invited_email is not null then
    select lower(email)
    into current_email
    from auth.users
    where id = auth.uid();

    if current_email is distinct from lower(invitation_record.invited_email) then
      raise exception 'This invitation belongs to another email address.';
    end if;
  end if;

  insert into public.space_members (
    space_id,
    user_id,
    role,
    status,
    left_at
  )
  values (
    joined_space_id,
    auth.uid(),
    'member',
    'active',
    null
  )
  on conflict (space_id, user_id)
  do update
  set
    status = 'active',
    left_at = null;

  update public.space_invitations
  set status = 'accepted'
  where id = invitation_record.id;

  return joined_space_id;
end;
$$;

-- Server-side settlement creation. Positive outstanding means from_user owes
-- to_user. The RPC rejects cross-space users, unrelated callers, and overpayment.
create or replace function public.create_settlement(
  p_space_id uuid,
  p_from_user uuid,
  p_to_user uuid,
  p_amount numeric,
  p_currency text,
  p_settlement_date date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_settlement_id uuid;
  pair_transaction_balance numeric := 0;
  pair_settlement_balance numeric := 0;
  outstanding numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_from_user = p_to_user then
    raise exception 'Settlement users must be different.';
  end if;

  if auth.uid() not in (p_from_user, p_to_user) then
    raise exception 'Only a participant can record this settlement.';
  end if;

  if not exists (
    select 1
    from public.spaces
    where id = p_space_id
      and type = 'shared'
  ) then
    raise exception 'Shared space not found.';
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'You are not an active member of this space.';
  end if;

  if not exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = p_from_user
      and status = 'active'
  ) or not exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = p_to_user
      and status = 'active'
  ) then
    raise exception 'Both settlement users must be active members.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Settlement amount must be greater than zero.';
  end if;

  select coalesce(sum(
    case
      when t.paid_by = p_to_user and ts.user_id = p_from_user then ts.amount
      when t.paid_by = p_from_user and ts.user_id = p_to_user then -ts.amount
      else 0
    end
  ), 0)
  into pair_transaction_balance
  from public.transactions t
  join public.transaction_splits ts on ts.transaction_id = t.id
  where t.space_id = p_space_id
    and t.type = 'expense';

  select coalesce(sum(
    case
      when s.from_user = p_from_user and s.to_user = p_to_user then -s.amount
      when s.from_user = p_to_user and s.to_user = p_from_user then s.amount
      else 0
    end
  ), 0)
  into pair_settlement_balance
  from public.settlements s
  where s.space_id = p_space_id;

  outstanding := round(pair_transaction_balance + pair_settlement_balance, 2);

  if outstanding <= 0 then
    raise exception 'No amount is currently owed in this direction.';
  end if;

  if round(p_amount, 2) > outstanding then
    raise exception 'Settlement amount exceeds the outstanding balance.';
  end if;

  insert into public.settlements (
    space_id,
    from_user,
    to_user,
    amount,
    currency,
    settlement_date,
    note,
    created_by
  )
  values (
    p_space_id,
    p_from_user,
    p_to_user,
    round(p_amount, 2),
    upper(coalesce(nullif(trim(p_currency), ''), 'USD')),
    coalesce(p_settlement_date, current_date),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning id into new_settlement_id;

  return new_settlement_id;
end;
$$;

-- Direct client inserts are removed after the frontend switches to
-- create_settlement(). SECURITY DEFINER is the only settlement write path.
drop policy if exists "Members can create settlements" on public.settlements;

grant execute on function public.create_space_invitation(uuid) to authenticated;
grant execute on function public.accept_space_invitation(text) to authenticated;
grant execute on function public.create_settlement(
  uuid, uuid, uuid, numeric, text, date, text
) to authenticated;

revoke all on function public.create_space_invitation(uuid) from public, anon;
revoke all on function public.accept_space_invitation(text) from public, anon;
revoke all on function public.create_settlement(
  uuid, uuid, uuid, numeric, text, date, text
) from public, anon;

commit;

-- The active-member checks in create_shared_transaction and
-- update_shared_transaction will be added after their exact live definitions are
-- captured into version control, so this proposal never replaces those functions
-- with an incomplete reconstruction.
