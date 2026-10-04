-- Query name: Multi-Currency Phase 6 — Rebase Space Currency
begin;

create table if not exists public.space_currency_changes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  old_currency text not null,
  new_currency text not null,
  conversion_rate numeric(20,10) not null check (conversion_rate > 0),
  changed_by uuid not null references public.profiles(id) on delete cascade,
  changed_at timestamptz not null default now()
);

alter table public.space_currency_changes enable row level security;

drop policy if exists "Space members can view currency changes" on public.space_currency_changes;
create policy "Space members can view currency changes"
on public.space_currency_changes for select to authenticated
using (public.is_space_member(space_id));

create or replace function public.prevent_unsafe_space_currency_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.currency := upper(trim(new.currency));

  if new.currency !~ '^[A-Z]{3}$' then
    raise exception 'Space currency must be a three-letter ISO code.';
  end if;

  if upper(old.currency) <> new.currency
     and coalesce(current_setting('app.rebasing_space_currency', true), '') <> 'on'
     and (
       exists (select 1 from public.transactions where space_id = old.id)
       or exists (select 1 from public.settlements where space_id = old.id)
       or exists (select 1 from public.monthly_budgets where space_id = old.id)
       or exists (select 1 from public.fixed_expenses where space_id = old.id)
     )
  then
    raise exception 'Use rebase_space_currency to change a Space currency after financial data exists.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unsafe_space_currency_change() from public, anon, authenticated;

create or replace function public.rebase_space_currency(
  p_space_id uuid,
  p_new_currency text,
  p_conversion_rate numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_currency text;
  new_currency text := upper(trim(p_new_currency));
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.is_space_owner(p_space_id) then
    raise exception 'Only the Space owner can change its base currency.';
  end if;

  if new_currency !~ '^[A-Z]{3}$' then
    raise exception 'Space currency must be a three-letter ISO code.';
  end if;

  if p_conversion_rate is null or p_conversion_rate <= 0 then
    raise exception 'A positive conversion rate is required.';
  end if;

  select upper(currency) into old_currency
  from public.spaces
  where id = p_space_id
  for update;

  if old_currency is null then
    raise exception 'Space not found.';
  end if;

  if old_currency = new_currency then
    return;
  end if;

  perform set_config('app.rebasing_space_currency', 'on', true);

  update public.spaces
  set currency = new_currency
  where id = p_space_id;

  update public.transactions
  set base_amount = case when base_amount is null then null else round(base_amount * p_conversion_rate, 2) end,
      base_currency = new_currency,
      exchange_rate = case when exchange_rate is null then null else round(exchange_rate * p_conversion_rate, 10) end,
      exchange_rate_date = case when exchange_rate is null then exchange_rate_date else current_date end
  where space_id = p_space_id;

  update public.transaction_splits split
  set amount = round(split.amount * p_conversion_rate, 2)
  from public.transactions transaction
  where transaction.id = split.transaction_id
    and transaction.space_id = p_space_id;

  with split_totals as (
    select transaction_id, sum(amount) as total
    from public.transaction_splits
    group by transaction_id
  ), first_splits as (
    select distinct on (transaction_id) id, transaction_id
    from public.transaction_splits
    order by transaction_id, id
  )
  update public.transaction_splits split
  set amount = split.amount + (transaction.base_amount - totals.total)
  from first_splits first_split
  join split_totals totals on totals.transaction_id = first_split.transaction_id
  join public.transactions transaction on transaction.id = first_split.transaction_id
  where split.id = first_split.id
    and transaction.space_id = p_space_id
    and transaction.base_amount <> totals.total;

  update public.settlements
  set amount = round(amount * p_conversion_rate, 2),
      currency = new_currency
  where space_id = p_space_id;

  update public.monthly_budgets
  set amount = round(amount * p_conversion_rate, 2),
      currency = new_currency
  where space_id = p_space_id;

  update public.fixed_expenses
  set amount = round(amount * p_conversion_rate, 2),
      currency = new_currency
  where space_id = p_space_id;

  insert into public.space_currency_changes (
    space_id, old_currency, new_currency, conversion_rate, changed_by
  ) values (
    p_space_id, old_currency, new_currency, p_conversion_rate, auth.uid()
  );
end;
$$;

revoke all on function public.rebase_space_currency(uuid, text, numeric) from public, anon;
grant execute on function public.rebase_space_currency(uuid, text, numeric) to authenticated;

commit;

select
  to_regprocedure('public.rebase_space_currency(uuid,text,numeric)') is not null as rebase_ready,
  to_regclass('public.space_currency_changes') is not null as audit_ready;
