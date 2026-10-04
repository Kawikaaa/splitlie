-- Query name: Multi-Currency Phase 2 — Accounting Data Model
-- Compatible with the current single-currency application.
-- Existing original transaction amounts and currencies are never overwritten.

begin;

-- 1. Add the minimum accounting conversion fields.
alter table public.transactions
  add column if not exists base_amount numeric(18,4),
  add column if not exists base_currency text,
  add column if not exists exchange_rate numeric(20,10),
  add column if not exists exchange_rate_date date,
  add column if not exists conversion_status text;

-- 2. Backfill the audited legacy data.
-- The Phase 1 audit confirmed every existing transaction uses its Space currency.
update public.transactions t
set
  base_amount = t.amount,
  base_currency = upper(s.currency),
  exchange_rate = 1,
  exchange_rate_date = t.transaction_date,
  conversion_status = 'converted'
from public.spaces s
where s.id = t.space_id
  and (
    t.base_amount is null
    or t.base_currency is null
    or t.exchange_rate is null
    or t.exchange_rate_date is null
    or t.conversion_status is null
  );

alter table public.transactions
  alter column base_currency set not null,
  alter column exchange_rate_date set not null,
  alter column conversion_status set not null,
  alter column conversion_status set default 'converted';

-- 3. Add explicit validation without changing the meaning of existing columns.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_currency_iso_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_currency_iso_check
      check (currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_base_currency_iso_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_base_currency_iso_check
      check (base_currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_conversion_status_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_conversion_status_check
      check (conversion_status in ('converted', 'manual', 'pending', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_conversion_values_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_conversion_values_check
      check (
        (
          conversion_status in ('converted', 'manual')
          and base_amount is not null
          and base_amount > 0
          and exchange_rate is not null
          and exchange_rate > 0
        )
        or
        (
          conversion_status in ('pending', 'failed')
          and base_amount is null
          and exchange_rate is null
        )
      );
  end if;
end $$;

-- 4. Central transaction invariant enforcement.
-- This also keeps the current app working after this migration:
-- same-currency inserts automatically receive rate 1 and base_amount = amount.
create or replace function public.enforce_transaction_currency_accounting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  space_currency text;
begin
  select upper(currency)
  into space_currency
  from public.spaces
  where id = new.space_id;

  if space_currency is null then
    raise exception 'Transaction space not found.';
  end if;

  new.currency := upper(trim(new.currency));
  new.base_currency := upper(coalesce(nullif(trim(new.base_currency), ''), space_currency));
  new.exchange_rate_date := coalesce(new.exchange_rate_date, new.transaction_date);
  new.conversion_status := lower(coalesce(nullif(trim(new.conversion_status), ''), 'converted'));

  if new.currency !~ '^[A-Z]{3}$' then
    raise exception 'Transaction currency must be a three-letter ISO code.';
  end if;

  if new.base_currency <> space_currency then
    raise exception 'Transaction base currency must match the Space currency.';
  end if;

  if new.currency = space_currency then
    new.base_amount := new.amount;
    new.exchange_rate := 1;
    new.conversion_status := 'converted';
  elsif new.conversion_status in ('converted', 'manual') then
    if new.base_amount is null or new.base_amount <= 0 then
      raise exception 'Converted transactions require a positive base amount.';
    end if;

    if new.exchange_rate is null or new.exchange_rate <= 0 then
      raise exception 'Converted transactions require a positive exchange rate.';
    end if;
  elsif new.conversion_status in ('pending', 'failed') then
    new.base_amount := null;
    new.exchange_rate := null;
  else
    raise exception 'Invalid currency conversion status.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_transaction_currency_accounting()
from public, anon, authenticated;

drop trigger if exists enforce_transaction_currency_accounting_trigger
on public.transactions;

create trigger enforce_transaction_currency_accounting_trigger
before insert or update of
  space_id,
  amount,
  currency,
  base_amount,
  base_currency,
  exchange_rate,
  exchange_rate_date,
  conversion_status,
  transaction_date
on public.transactions
for each row
execute function public.enforce_transaction_currency_accounting();

-- 5. Prevent changing a Space base currency after financial history exists.
-- A future dedicated migration/recalculation workflow may intentionally bypass
-- this guard after recalculating all historical accounting values.
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
     and (
       exists (select 1 from public.transactions where space_id = old.id)
       or exists (select 1 from public.settlements where space_id = old.id)
       or exists (select 1 from public.monthly_budgets where space_id = old.id)
       or exists (select 1 from public.fixed_expenses where space_id = old.id)
     )
  then
    raise exception 'Base currency cannot be changed after financial data exists.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unsafe_space_currency_change()
from public, anon, authenticated;

drop trigger if exists prevent_unsafe_space_currency_change_trigger
on public.spaces;

create trigger prevent_unsafe_space_currency_change_trigger
before update of currency
on public.spaces
for each row
execute function public.prevent_unsafe_space_currency_change();

comment on column public.spaces.currency is
  'Authoritative accounting/base currency for this Personal or Shared Space.';

comment on column public.transactions.amount is
  'Original transaction amount in transactions.currency. Never overwritten by FX conversion.';

comment on column public.transactions.currency is
  'Original transaction currency as an ISO 4217 code.';

comment on column public.transactions.base_amount is
  'Locked accounting amount in transactions.base_currency.';

comment on column public.transactions.base_currency is
  'Space accounting currency captured for this transaction.';

comment on column public.transactions.exchange_rate is
  'Locked multiplier from original amount to base amount.';

comment on column public.transactions.exchange_rate_date is
  'Date associated with the historical or manual FX rate.';

comment on column public.transactions.conversion_status is
  'converted, manual, pending, or failed. Pending/failed values are excluded from accounting totals.';

commit;

-- Verification result: every row should return true.
select
  count(*) > 0 as has_transactions,
  count(*) filter (
    where currency = base_currency
      and exchange_rate = 1
      and base_amount = amount
      and conversion_status = 'converted'
  ) = count(*) as legacy_backfill_valid,
  count(*) filter (
    where conversion_status in ('converted', 'manual')
      and (base_amount is null or exchange_rate is null)
  ) = 0 as no_incomplete_converted_rows,
  count(*) filter (
    where conversion_status in ('pending', 'failed')
      and (base_amount is not null or exchange_rate is not null)
  ) = 0 as pending_rows_excluded_cleanly
from public.transactions;
