-- Query name: Space lifecycle — complete, history, and permanent delete
begin;

alter table public.spaces
  add column if not exists status text not null default 'active',
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'spaces_status_check'
  ) then
    alter table public.spaces add constraint spaces_status_check
      check (status in ('active', 'completed'));
  end if;
end $$;

create index if not exists idx_spaces_status on public.spaces(status);

create or replace function public.complete_shared_space(p_space_id uuid)
returns public.spaces
language plpgsql
security definer
set search_path = public
as $$
declare result public.spaces;
begin
  if not public.is_space_owner(p_space_id) then
    raise exception 'Only the space owner can complete this space.';
  end if;

  update public.space_invitations
  set status = 'revoked'
  where space_id = p_space_id and status = 'pending';

  update public.spaces
  set status = 'completed', completed_at = now(), completed_by = auth.uid()
  where id = p_space_id and type = 'shared' and status = 'active'
  returning * into result;

  if result.id is null then
    raise exception 'This shared space is already completed or does not exist.';
  end if;

  return result;
end;
$$;

create or replace function public.delete_shared_space_permanently(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_space_owner(p_space_id) then
    raise exception 'Only the space owner can permanently delete this space.';
  end if;

  if not exists (select 1 from public.spaces where id = p_space_id and type = 'shared') then
    raise exception 'Shared space not found.';
  end if;

  perform set_config('app.deleting_space_id', p_space_id::text, true);
  delete from public.spaces where id = p_space_id and type = 'shared';
end;
$$;

create or replace function public.guard_completed_space_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_space_id uuid;
  target_status text;
begin
  if tg_table_name = 'transaction_splits' then
    select t.space_id into target_space_id
    from public.transactions t
    where t.id = coalesce(new.transaction_id, old.transaction_id);
  else
    target_space_id := coalesce(new.space_id, old.space_id);
  end if;

  if target_space_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' and current_setting('app.deleting_space_id', true) = target_space_id::text then
    return old;
  end if;

  select status into target_status from public.spaces where id = target_space_id;
  if target_status = 'completed' then
    raise exception 'This space is completed and read only.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists guard_completed_transactions on public.transactions;
create trigger guard_completed_transactions before insert or update or delete on public.transactions
for each row execute function public.guard_completed_space_write();

drop trigger if exists guard_completed_splits on public.transaction_splits;
create trigger guard_completed_splits before insert or update or delete on public.transaction_splits
for each row execute function public.guard_completed_space_write();

drop trigger if exists guard_completed_settlements on public.settlements;
create trigger guard_completed_settlements before insert or update or delete on public.settlements
for each row execute function public.guard_completed_space_write();

drop trigger if exists guard_completed_invitations on public.space_invitations;
create trigger guard_completed_invitations before insert or update or delete on public.space_invitations
for each row execute function public.guard_completed_space_write();

drop trigger if exists guard_completed_members on public.space_members;
create trigger guard_completed_members before insert or update or delete on public.space_members
for each row execute function public.guard_completed_space_write();

revoke all on function public.complete_shared_space(uuid) from public;
revoke all on function public.delete_shared_space_permanently(uuid) from public;
grant execute on function public.complete_shared_space(uuid) to authenticated;
grant execute on function public.delete_shared_space_permanently(uuid) to authenticated;

commit;
