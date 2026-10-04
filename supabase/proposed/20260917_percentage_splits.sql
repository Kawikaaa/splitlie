-- Query name: Shared Ledger Phase 8 — Percentage Splits
begin;
alter table public.transactions drop constraint transactions_split_type_check;
alter table public.transactions add constraint transactions_split_type_check
  check (split_type in ('none', 'equal', 'percentage', 'custom'));
alter function public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) rename to create_shared_transaction_v2_core;
alter function public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) rename to update_shared_transaction_v2_core;

create function public.create_shared_transaction_v2(
  p_space_id uuid, p_paid_by uuid, p_type text, p_amount numeric,
  p_currency text, p_base_amount numeric, p_base_currency text,
  p_exchange_rate numeric, p_exchange_rate_date date,
  p_category text, p_description text, p_transaction_date date,
  p_split_type text, p_splits jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $create_fn$
declare transaction_id uuid;
begin
  if p_split_type not in ('none','equal','percentage','custom') then raise exception 'Invalid split type.'; end if;
  transaction_id := public.create_shared_transaction_v2_core(
    p_space_id,p_paid_by,p_type,p_amount,p_currency,p_base_amount,p_base_currency,
    p_exchange_rate,p_exchange_rate_date,p_category,p_description,p_transaction_date,
    case when p_split_type='percentage' then 'custom' else p_split_type end,p_splits);
  if p_split_type='percentage' then update public.transactions set split_type='percentage' where id=transaction_id; end if;
  return transaction_id;
end; $create_fn$;

create function public.update_shared_transaction_v2(
  p_transaction_id uuid, p_paid_by uuid, p_type text, p_amount numeric,
  p_currency text, p_base_amount numeric, p_base_currency text,
  p_exchange_rate numeric, p_exchange_rate_date date,
  p_category text, p_description text, p_transaction_date date,
  p_split_type text, p_splits jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $update_fn$
declare transaction_id uuid;
begin
  if p_split_type not in ('none','equal','percentage','custom') then raise exception 'Invalid split type.'; end if;
  transaction_id := public.update_shared_transaction_v2_core(
    p_transaction_id,p_paid_by,p_type,p_amount,p_currency,p_base_amount,p_base_currency,
    p_exchange_rate,p_exchange_rate_date,p_category,p_description,p_transaction_date,
    case when p_split_type='percentage' then 'custom' else p_split_type end,p_splits);
  if p_split_type='percentage' then update public.transactions set split_type='percentage' where id=transaction_id; end if;
  return transaction_id;
end; $update_fn$;

revoke all on function public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) from public, anon;
revoke all on function public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) from public, anon;
grant execute on function public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) to authenticated;
grant execute on function public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) to authenticated;
commit;
select
  exists (select 1 from pg_constraint where conrelid='public.transactions'::regclass and pg_get_constraintdef(oid) ilike '%percentage%') as percentage_constraint_ready,
  to_regprocedure('public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null as create_percentage_ready,
  to_regprocedure('public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null as update_percentage_ready;
