-- Query name: Multi-Currency Phase 5 — Integrity and Permission Audit
-- Read-only: verifies transaction invariants and V2 RPC permissions.

select
  count(*) filter (
    where t.conversion_status = 'converted'
      and (t.base_amount is null or t.exchange_rate is null or t.exchange_rate <= 0)
  ) = 0 as converted_rows_complete,
  count(*) filter (
    where t.base_currency <> upper(s.currency)
  ) = 0 as base_currency_matches_space,
  count(*) filter (
    where t.currency = t.base_currency
      and (t.exchange_rate <> 1 or t.base_amount <> t.amount)
  ) = 0 as same_currency_identity_valid,
  has_function_privilege(
    'authenticated',
    'public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)',
    'EXECUTE'
  ) as create_v2_authenticated,
  has_function_privilege(
    'authenticated',
    'public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)',
    'EXECUTE'
  ) as update_v2_authenticated,
  not has_function_privilege(
    'anon',
    'public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)',
    'EXECUTE'
  ) as create_v2_anon_blocked,
  not has_function_privilege(
    'anon',
    'public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)',
    'EXECUTE'
  ) as update_v2_anon_blocked
from public.transactions t
join public.spaces s on s.id = t.space_id;
