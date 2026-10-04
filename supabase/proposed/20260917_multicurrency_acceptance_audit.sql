-- Query name: Multi-Currency Phase 7 — Final Acceptance Audit
with split_totals as (
  select transaction_id, round(sum(amount), 2) as split_total
  from public.transaction_splits
  group by transaction_id
), checks as (
  select 'transactions_match_space_currency' as check_name,
    not exists (
      select 1 from public.transactions t
      join public.spaces s on s.id = t.space_id
      where t.base_currency <> s.currency
    ) as passed
  union all
  select 'same_currency_identity_conversion',
    not exists (
      select 1 from public.transactions
      where currency = base_currency
        and (exchange_rate <> 1 or base_amount <> amount or conversion_status <> 'converted')
    )
  union all
  select 'cross_currency_has_valid_conversion',
    not exists (
      select 1 from public.transactions
      where currency <> base_currency
        and conversion_status in ('converted', 'manual')
        and (exchange_rate is null or exchange_rate <= 0 or base_amount is null or base_amount <= 0)
    )
  union all
  select 'no_invalid_currency_codes',
    not exists (
      select 1 from public.transactions
      where currency !~ '^[A-Z]{3}$' or base_currency !~ '^[A-Z]{3}$'
    )
  union all
  select 'shared_splits_equal_accounting_amount',
    not exists (
      select 1 from public.transactions t
      join split_totals st on st.transaction_id = t.id
      where t.split_type <> 'none' and st.split_total <> round(t.base_amount, 2)
    )
  union all
  select 'settlements_match_space_currency',
    not exists (
      select 1 from public.settlements settlement
      join public.spaces space on space.id = settlement.space_id
      where settlement.currency <> space.currency
    )
  union all
  select 'budgets_match_space_currency',
    not exists (
      select 1 from public.monthly_budgets budget
      join public.spaces space on space.id = budget.space_id
      where budget.currency <> space.currency
    )
  union all
  select 'fixed_expenses_match_space_currency',
    not exists (
      select 1 from public.fixed_expenses expense
      join public.spaces space on space.id = expense.space_id
      where expense.currency <> space.currency
    )
  union all
  select 'shared_create_v2_ready',
    to_regprocedure('public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null
  union all
  select 'shared_update_v2_ready',
    to_regprocedure('public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null
  union all
  select 'space_rebase_ready',
    to_regprocedure('public.rebase_space_currency(uuid,text,numeric)') is not null
  union all
  select 'currency_change_audit_ready',
    to_regclass('public.space_currency_changes') is not null
)
select check_name, passed
from checks
order by check_name;
