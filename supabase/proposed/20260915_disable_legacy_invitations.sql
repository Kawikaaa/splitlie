-- Query name: Phase 2 - Disable Legacy Open Invitations

revoke execute
on function public.create_space_invitation(uuid)
from authenticated;

update public.space_invitations
set status = 'revoked'
where status = 'pending'
  and invited_email is null;

select
  not has_function_privilege(
    'authenticated',
    'public.create_space_invitation(uuid)',
    'execute'
  ) as legacy_creator_disabled,
  not exists (
    select 1
    from public.space_invitations
    where status = 'pending'
      and invited_email is null
  ) as legacy_open_links_revoked;
