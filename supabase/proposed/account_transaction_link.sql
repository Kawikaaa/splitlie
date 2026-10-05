-- Atomic, opt-in account movements. Existing transactions remain unlinked.
set lock_timeout = '5s';
alter table public.transactions
  add column financial_account_id uuid references public.financial_accounts(id),
  add column account_amount numeric(18,4),
  add column account_exchange_rate numeric,
  add column account_rate_date date;
create index transactions_financial_account_idx on public.transactions(financial_account_id) where financial_account_id is not null;

create function accounts_private.apply_transaction_account() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  old_id uuid; new_id uuid; old_effect numeric := 0; new_effect numeric := 0;
  account_row public.financial_accounts%rowtype; delta numeric; next_balance numeric;
begin
  if tg_op <> 'INSERT' then old_id := old.financial_account_id; end if;
  if tg_op <> 'DELETE' then new_id := new.financial_account_id; end if;
  if old_id is null and new_id is null then
    if tg_op = 'DELETE' then return old; end if;
    new.account_amount := null; new.account_exchange_rate := null; new.account_rate_date := null;
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.space_id <> old.space_id or new.created_by <> old.created_by) then
    raise exception 'ACCOUNT_SCOPE: Unlink the account before moving this transaction.';
  end if;
  -- Deterministic locking prevents two concurrent saves from losing movements.
  perform id from public.financial_accounts where id in (old_id, new_id) order by id for update;
  if old_id is not null then
    select * into account_row from public.financial_accounts where id = old_id and user_id = old.created_by and space_id = old.space_id;
    if not found then raise exception 'ACCOUNT_SCOPE: Account is unavailable.'; end if;
    if coalesce(old.payment_status, 'paid') = 'paid' then
      old_effect := old.account_amount * case when old.type = 'income' then 1 else -1 end
        * case when account_row.type = 'credit_card' then -1 else 1 end;
    end if;
  end if;
  if new_id is not null then
    select * into account_row from public.financial_accounts where id = new_id and user_id = new.created_by and space_id = new.space_id;
    if not found or not exists (select 1 from public.spaces where id = new.space_id and type = 'personal' and created_by = new.created_by and status = 'active') then
      raise exception 'ACCOUNT_SCOPE: Choose an account from your personal space.';
    end if;
    if auth.uid() is not null and auth.uid() <> account_row.user_id then raise exception 'ACCOUNT_SCOPE: Account is unavailable.'; end if;
    if account_row.archived_at is not null and (tg_op <> 'UPDATE' or old_id is distinct from new_id
      or new.amount is distinct from old.amount or new.currency is distinct from old.currency
      or new.type is distinct from old.type or new.payment_status is distinct from old.payment_status
      or new.account_exchange_rate is distinct from old.account_exchange_rate) then
      raise exception 'ACCOUNT_ARCHIVED: Restore the account or unlink this transaction.';
    end if;
    if new.account_exchange_rate is null or new.account_exchange_rate <= 0
      or new.account_exchange_rate::text in ('NaN','Infinity','-Infinity')
      or new.account_rate_date is null or new.account_rate_date > current_date
      or (new.currency = account_row.currency and new.account_exchange_rate <> 1) then
      raise exception 'ACCOUNT_RATE: A valid dated exchange rate is required.';
    end if;
    new.account_amount := round(new.amount * new.account_exchange_rate, 4);
    if coalesce(new.payment_status, 'paid') = 'paid' then
      new_effect := new.account_amount * case when new.type = 'income' then 1 else -1 end
        * case when account_row.type = 'credit_card' then -1 else 1 end;
    end if;
  else
    new.account_amount := null; new.account_exchange_rate := null; new.account_rate_date := null;
  end if;
  for account_row in select * from public.financial_accounts where id in (old_id, new_id) order by id loop
    delta := case when account_row.id = new_id then new_effect else 0 end
      - case when account_row.id = old_id then old_effect else 0 end;
    if delta <> 0 then
      next_balance := account_row.balance + delta;
      if next_balance < 0 then raise exception 'ACCOUNT_INSUFFICIENT: Account balance or outstanding debt is insufficient. Choose no linked account or update its balance.'; end if;
      update public.financial_accounts set balance = next_balance where id = account_row.id;
      if not found then raise exception 'ACCOUNT_SCOPE: Account update was denied.'; end if;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function accounts_private.apply_transaction_account() from public, anon, authenticated;
create trigger linked_account_movement before insert or update or delete on public.transactions
for each row execute function accounts_private.apply_transaction_account();

create function accounts_private.guard_linked_account_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$begin
  if (new.currency is distinct from old.currency or new.type is distinct from old.type)
    and exists (select 1 from public.transactions where financial_account_id = old.id) then
    raise exception 'ACCOUNT_LINKED: Unlink transactions before changing account currency or type.';
  end if;
  return new;
end;$$;
revoke all on function accounts_private.guard_linked_account_identity() from public, anon, authenticated;
create trigger guard_linked_account_identity before update of currency,type on public.financial_accounts
for each row execute function accounts_private.guard_linked_account_identity();
comment on column public.financial_accounts.balance is 'Manually initialized balance, updated atomically by opted-in linked transactions. Positive credit card balance is debt.';
notify pgrst, 'reload schema';
