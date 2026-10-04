-- Query name: Multi-Currency Phase 1 — Live Schema and Data Audit
-- Read-only. This query does not change any data or database objects.

with relevant_columns as (
  select
    table_name,
    ordinal_position,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (
      'profiles',
      'spaces',
      'transactions',
      'transaction_splits',
      'settlements',
      'monthly_budgets',
      'fixed_expenses'
    )
),
data_checks as (
  select jsonb_build_object(
    'space_count', (select count(*) from public.spaces),
    'transaction_count', (select count(*) from public.transactions),
    'transaction_currency_mismatches', (
      select count(*)
      from public.transactions t
      join public.spaces s on s.id = t.space_id
      where upper(t.currency) <> upper(s.currency)
    ),
    'invalid_transaction_currency_codes', (
      select count(*)
      from public.transactions
      where currency is null
         or currency !~ '^[A-Z]{3}$'
    ),
    'invalid_space_currency_codes', (
      select count(*)
      from public.spaces
      where currency is null
         or currency !~ '^[A-Z]{3}$'
    ),
    'split_total_mismatches', (
      select count(*)
      from (
        select
          t.id,
          t.amount,
          coalesce(sum(ts.amount), 0) as split_total
        from public.transactions t
        left join public.transaction_splits ts
          on ts.transaction_id = t.id
        where t.split_type in ('equal', 'custom')
        group by t.id, t.amount
        having abs(coalesce(sum(ts.amount), 0) - t.amount) > 0.009
      ) mismatches
    ),
    'settlement_currency_mismatches', (
      select count(*)
      from public.settlements st
      join public.spaces s on s.id = st.space_id
      where upper(st.currency) <> upper(s.currency)
    )
  ) as summary
)
select jsonb_build_object(
  'columns', (
    select jsonb_agg(
      to_jsonb(relevant_columns)
      order by table_name, ordinal_position
    )
    from relevant_columns
  ),
  'data_checks', (select summary from data_checks)
) as multi_currency_audit;
