-- Query name: Fix Invitation Expiry Column Ambiguity
-- Purpose: Qualify invitation columns so the expires_at return field does not
-- conflict with the space_invitations.expires_at table column.

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

  update public.space_invitations as invitations
  set status = 'expired'
  where invitations.space_id = target_space_id
    and invitations.status = 'pending'
    and invitations.expires_at <= now();

  update public.space_invitations as invitations
  set status = 'revoked'
  where invitations.space_id = target_space_id
    and invitations.status = 'pending'
    and lower(invitations.invited_email) = normalized_email;

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

revoke all on function public.create_email_space_invitation(uuid, text)
from public, anon;

grant execute on function public.create_email_space_invitation(uuid, text)
to authenticated;
