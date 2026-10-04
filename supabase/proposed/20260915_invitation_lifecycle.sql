-- Query name: Phase 2 - Invitation Lifecycle and Email Binding
-- Purpose:
--   1. Bind new invitations to the intended email address.
--   2. Return an explicit seven-day expiry time to the frontend.
--   3. Let owners revoke pending invitations safely.
--   4. Let a signed-in recipient inspect a token before accepting it.

create or replace function public.create_email_space_invitation(
  target_space_id uuid,
  target_email text
)
returns table (
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  new_token text;
  new_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_space_owner(target_space_id) then
    raise exception 'Only the active space owner can invite members.';
  end if;

  normalized_email := lower(trim(target_email));

  if normalized_email = ''
    or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  then
    raise exception 'Enter a valid email address.';
  end if;

  update public.space_invitations
  set status = 'expired'
  where space_id = target_space_id
    and status = 'pending'
    and expires_at <= now();

  update public.space_invitations
  set status = 'revoked'
  where space_id = target_space_id
    and status = 'pending'
    and lower(invited_email) = normalized_email;

  new_token := replace(gen_random_uuid()::text, '-', '');
  new_expiry := now() + interval '7 days';

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
    normalized_email,
    auth.uid(),
    new_token,
    'pending',
    new_expiry
  );

  return query select new_token, new_expiry;
end;
$$;

create or replace function public.revoke_space_invitation(
  invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_space_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select space_id
  into invitation_space_id
  from public.space_invitations
  where id = invitation_id
  for update;

  if invitation_space_id is null then
    raise exception 'Invitation not found.';
  end if;

  if not public.is_space_owner(invitation_space_id) then
    raise exception 'Only the active space owner can revoke invitations.';
  end if;

  update public.space_invitations
  set status = 'revoked'
  where id = invitation_id
    and status = 'pending';
end;
$$;

create or replace function public.get_space_invitation_details(
  invitation_token text
)
returns table (
  space_name text,
  invited_email text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  return query
  select
    spaces.name,
    invitations.invited_email,
    case
      when invitations.status = 'pending'
        and invitations.expires_at <= now()
      then 'expired'::text
      else invitations.status
    end,
    invitations.expires_at
  from public.space_invitations invitations
  join public.spaces spaces
    on spaces.id = invitations.space_id
  where invitations.token = invitation_token
    and (
      invitations.invited_email is null
      or lower(invitations.invited_email)
        = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
end;
$$;

grant execute on function public.create_email_space_invitation(uuid, text)
to authenticated;

grant execute on function public.revoke_space_invitation(uuid)
to authenticated;

grant execute on function public.get_space_invitation_details(text)
to authenticated;

revoke all on function public.create_email_space_invitation(uuid, text)
from public, anon;

revoke all on function public.revoke_space_invitation(uuid)
from public, anon;

revoke all on function public.get_space_invitation_details(text)
from public, anon;

-- Verification result should be one row with all values = true.
select
  to_regprocedure(
    'public.create_email_space_invitation(uuid,text)'
  ) is not null as create_email_invitation_ready,
  to_regprocedure(
    'public.revoke_space_invitation(uuid)'
  ) is not null as revoke_invitation_ready,
  to_regprocedure(
    'public.get_space_invitation_details(text)'
  ) is not null as invitation_details_ready;
