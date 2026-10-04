-- Query name: Multi-Currency Phase 4 — Shared Transaction RPCs
-- Original amount stays in its transaction currency. Splits are authoritative
-- accounting amounts in the Space base currency.

begin;

create or replace function public.create_shared_transaction_v2(
  p_space_id uuid, p_paid_by uuid, p_type text, p_amount numeric,
  p_currency text, p_base_amount numeric, p_base_currency text,
  p_exchange_rate numeric, p_exchange_rate_date date,
  p_category text, p_description text, p_transaction_date date,
  p_split_type text, p_splits jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_transaction_id uuid; split_item jsonb; split_user_id uuid;
  split_amount numeric; split_total numeric := 0; space_currency text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if not public.is_space_member(p_space_id) then raise exception 'You are not an active member of this space.'; end if;
  select upper(currency) into space_currency from public.spaces where id = p_space_id and type = 'shared';
  if space_currency is null then raise exception 'This is not a shared space.'; end if;
  if p_amount is null or p_amount <= 0 or p_base_amount is null or p_base_amount <= 0 then raise exception 'Amounts must be greater than 0.'; end if;
  if upper(p_base_currency) <> space_currency then raise exception 'Base currency must match the Space currency.'; end if;
  if p_exchange_rate is null or p_exchange_rate <= 0 then raise exception 'A positive exchange rate is required.'; end if;
  if p_type not in ('expense','income') then raise exception 'Invalid transaction type.'; end if;
  if p_split_type not in ('none','equal','custom') then raise exception 'Invalid split type.'; end if;
  if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = p_paid_by and status = 'active') then raise exception 'The payer must be an active member of this space.'; end if;
  if p_type = 'income' and p_split_type <> 'none' then raise exception 'Income cannot be split.'; end if;
  if p_split_type in ('equal','custom') then
    if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then raise exception 'At least one split is required.'; end if;
    for split_item in select value from jsonb_array_elements(p_splits) loop
      split_user_id := (split_item->>'user_id')::uuid;
      split_amount := (split_item->>'amount')::numeric;
      if split_user_id is null or split_amount is null or split_amount < 0 then raise exception 'Every split requires a member and non-negative amount.'; end if;
      if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = split_user_id and status = 'active') then raise exception 'Every split user must be an active member.'; end if;
      split_total := split_total + split_amount;
    end loop;
    if abs(split_total - p_base_amount) > 0.009 then raise exception 'Split amounts must add up to the base amount.'; end if;
  end if;
  insert into public.transactions (
    space_id, created_by, paid_by, type, amount, currency, base_amount,
    base_currency, exchange_rate, exchange_rate_date, conversion_status,
    category, description, transaction_date, split_type
  ) values (
    p_space_id, auth.uid(), p_paid_by, p_type, p_amount, upper(p_currency),
    p_base_amount, space_currency, p_exchange_rate,
    coalesce(p_exchange_rate_date, p_transaction_date), 'converted', p_category,
    nullif(trim(coalesce(p_description,'')),''), p_transaction_date, p_split_type
  ) returning id into new_transaction_id;
  if p_split_type in ('equal','custom') then
    for split_item in select value from jsonb_array_elements(p_splits) loop
      insert into public.transaction_splits(transaction_id,user_id,amount)
      values(new_transaction_id,(split_item->>'user_id')::uuid,(split_item->>'amount')::numeric);
    end loop;
  end if;
  return new_transaction_id;
end;
$$;

create or replace function public.update_shared_transaction_v2(
  p_transaction_id uuid, p_paid_by uuid, p_type text, p_amount numeric,
  p_currency text, p_base_amount numeric, p_base_currency text,
  p_exchange_rate numeric, p_exchange_rate_date date,
  p_category text, p_description text, p_transaction_date date,
  p_split_type text, p_splits jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  target_space_id uuid; split_item jsonb; split_user_id uuid;
  split_amount numeric; split_total numeric := 0; space_currency text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  select t.space_id, upper(s.currency) into target_space_id, space_currency
  from public.transactions t join public.spaces s on s.id=t.space_id
  where t.id=p_transaction_id and s.type='shared';
  if target_space_id is null then raise exception 'Shared transaction not found.'; end if;
  if not public.is_space_member(target_space_id) then raise exception 'You are not an active member of this space.'; end if;
  if not public.can_manage_transaction(p_transaction_id) then raise exception 'You do not have permission to edit this transaction.'; end if;
  if public.is_transaction_settled(p_transaction_id) then raise exception 'This transaction is part of settlement history and cannot be edited.'; end if;
  if p_amount is null or p_amount <= 0 or p_base_amount is null or p_base_amount <= 0 then raise exception 'Amounts must be greater than 0.'; end if;
  if upper(p_base_currency) <> space_currency then raise exception 'Base currency must match the Space currency.'; end if;
  if p_exchange_rate is null or p_exchange_rate <= 0 then raise exception 'A positive exchange rate is required.'; end if;
  if p_type not in ('expense','income') or p_split_type not in ('none','equal','custom') then raise exception 'Invalid transaction fields.'; end if;
  if not exists (select 1 from public.space_members where space_id=target_space_id and user_id=p_paid_by and status='active') then raise exception 'The payer must be an active member.'; end if;
  if p_type='income' and p_split_type<>'none' then raise exception 'Income cannot be split.'; end if;
  if p_split_type in ('equal','custom') then
    if p_splits is null or jsonb_typeof(p_splits)<>'array' or jsonb_array_length(p_splits)=0 then raise exception 'At least one split is required.'; end if;
    for split_item in select value from jsonb_array_elements(p_splits) loop
      split_user_id := (split_item->>'user_id')::uuid; split_amount := (split_item->>'amount')::numeric;
      if split_user_id is null or split_amount is null or split_amount < 0 then raise exception 'Every split requires a member and non-negative amount.'; end if;
      if not exists (select 1 from public.space_members where space_id=target_space_id and user_id=split_user_id and status='active') then raise exception 'Every split user must be an active member.'; end if;
      split_total := split_total + split_amount;
    end loop;
    if abs(split_total-p_base_amount)>0.009 then raise exception 'Split amounts must add up to the base amount.'; end if;
  end if;
  update public.transactions set paid_by=p_paid_by, type=p_type, amount=p_amount,
    currency=upper(p_currency), base_amount=p_base_amount, base_currency=space_currency,
    exchange_rate=p_exchange_rate, exchange_rate_date=coalesce(p_exchange_rate_date,p_transaction_date),
    conversion_status='converted', category=p_category,
    description=nullif(trim(coalesce(p_description,'')),''),
    transaction_date=p_transaction_date, split_type=p_split_type
  where id=p_transaction_id;
  delete from public.transaction_splits where transaction_id=p_transaction_id;
  if p_split_type in ('equal','custom') then
    for split_item in select value from jsonb_array_elements(p_splits) loop
      insert into public.transaction_splits(transaction_id,user_id,amount)
      values(p_transaction_id,(split_item->>'user_id')::uuid,(split_item->>'amount')::numeric);
    end loop;
  end if;
  return p_transaction_id;
end;
$$;

revoke all on function public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) from public, anon;
revoke all on function public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) from public, anon;
grant execute on function public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) to authenticated;
grant execute on function public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb) to authenticated;

commit;

select
  to_regprocedure('public.create_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null as create_v2_ready,
  to_regprocedure('public.update_shared_transaction_v2(uuid,uuid,text,numeric,text,numeric,text,numeric,date,text,text,date,text,jsonb)') is not null as update_v2_ready;
