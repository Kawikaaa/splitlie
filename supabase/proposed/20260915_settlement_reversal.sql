-- Query name: Phase 2 - Auditable Settlement Reversal

alter table public.settlements
  add column if not exists entry_type text not null default 'payment',
  add column if not exists reversal_of uuid,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid,
  add column if not exists reversal_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_entry_type_check'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint settlements_entry_type_check
      check (entry_type in ('payment', 'reversal'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_reversal_of_fkey'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint settlements_reversal_of_fkey
      foreign key (reversal_of)
      references public.settlements(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_reversed_by_fkey'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint settlements_reversed_by_fkey
      foreign key (reversed_by)
      references public.profiles(id);
  end if;
end;
$$;

create unique index if not exists settlements_one_reversal_per_payment
on public.settlements(reversal_of)
where reversal_of is not null;

create or replace function public.reverse_settlement(
  p_settlement_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original public.settlements%rowtype;
  reversal_id uuid;
  normalized_reason text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  normalized_reason := trim(coalesce(p_reason, ''));

  if length(normalized_reason) < 3 then
    raise exception 'Enter a short reason for reversing this settlement.';
  end if;

  select *
  into original
  from public.settlements
  where id = p_settlement_id
  for update;

  if not found then
    raise exception 'Settlement not found.';
  end if;

  if original.entry_type <> 'payment' then
    raise exception 'A reversal entry cannot be reversed.';
  end if;

  if original.reversed_at is not null
    or exists (
      select 1 from public.settlements
      where reversal_of = original.id
    )
  then
    raise exception 'This settlement has already been reversed.';
  end if;

  if auth.uid() not in (original.from_user, original.to_user) then
    raise exception 'Only a participant in this settlement can reverse it.';
  end if;

  if not public.is_space_member(original.space_id) then
    raise exception 'You must be an active member of this space.';
  end if;

  insert into public.settlements (
    space_id,
    from_user,
    to_user,
    amount,
    currency,
    settlement_date,
    note,
    created_by,
    entry_type,
    reversal_of,
    reversal_reason
  )
  values (
    original.space_id,
    original.to_user,
    original.from_user,
    original.amount,
    original.currency,
    current_date,
    'Reversal of settlement dated ' || original.settlement_date::text,
    auth.uid(),
    'reversal',
    original.id,
    normalized_reason
  )
  returning id into reversal_id;

  update public.settlements
  set
    reversed_at = now(),
    reversed_by = auth.uid(),
    reversal_reason = normalized_reason
  where id = original.id;

  return reversal_id;
end;
$$;

drop policy if exists "Settlement creator or owner can update"
on public.settlements;

drop policy if exists "Settlement creator or owner can delete"
on public.settlements;

grant execute on function public.reverse_settlement(uuid, text)
to authenticated;

revoke all on function public.reverse_settlement(uuid, text)
from public, anon;

select
  to_regprocedure(
    'public.reverse_settlement(uuid,text)'
  ) is not null as reversal_function_ready,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'settlements'
      and column_name = 'entry_type'
  ) as reversal_columns_ready,
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'settlements'
      and cmd in ('UPDATE', 'DELETE')
  ) as direct_changes_disabled;
