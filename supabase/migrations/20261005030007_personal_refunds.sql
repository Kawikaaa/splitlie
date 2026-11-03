-- Personal refunds only. Existing rows and shared-ledger behavior are unchanged.
set lock_timeout='5s';
alter table public.transactions add column parent_transaction_id uuid references public.transactions(id);
create index transactions_refund_parent_idx on public.transactions(parent_transaction_id) where parent_transaction_id is not null;
alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check check(type in ('expense','income','refund'));
alter table public.transactions add constraint transactions_refund_shape_check check (
  (type='refund' and parent_transaction_id is not null and payment_status='paid' and split_type='none')
  or (type<>'refund' and parent_transaction_id is null)
);

create function accounts_private.guard_personal_refund() returns trigger
language plpgsql security invoker set search_path='' as $$
declare original public.transactions%rowtype; refunded numeric;
begin
  if tg_op <> 'INSERT' then
    if old.type='refund' then
      -- Refund edits/deletions share the original's lock with new refunds.
      perform id from public.transactions where id=old.parent_transaction_id for update;
      if tg_op='UPDATE' and (new.type<>old.type or new.parent_transaction_id is distinct from old.parent_transaction_id
        or new.space_id<>old.space_id or new.created_by<>old.created_by) then
        raise exception 'REFUND_ORIGINAL: The original refund linkage cannot change.';
      end if;
    elsif exists(select 1 from public.transactions where parent_transaction_id=old.id) then
      if tg_op='DELETE' then raise exception 'REFUND_LINKED: Remove refunds before deleting the original.'; end if;
      if new.type<>old.type or new.amount<>old.amount or new.currency<>old.currency or new.category is distinct from old.category
        or new.payment_status<>old.payment_status or new.transaction_date<>old.transaction_date
        or new.space_id<>old.space_id or new.created_by<>old.created_by then
        raise exception 'REFUND_LINKED: Remove refunds before changing the original financial details.';
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  if new.type<>'refund' then return new; end if;
  if tg_op='UPDATE' and old.type<>'refund' then raise exception 'REFUND_ORIGINAL: Record a separate refund.'; end if;
  select * into original from public.transactions where id=new.parent_transaction_id for update;
  if not found or original.type<>'expense' or original.payment_status<>'paid'
    or original.space_id<>new.space_id or original.created_by<>new.created_by
    or not exists(select 1 from public.spaces where id=new.space_id and type='personal' and status='active' and created_by=new.created_by)
    or (auth.uid() is not null and auth.uid()<>new.created_by) then
    raise exception 'REFUND_ORIGINAL: Choose your paid expense in this personal space.';
  end if;
  if new.currency<>original.currency then raise exception 'REFUND_CURRENCY: Use the original expense currency.'; end if;
  if new.payment_status<>'paid' or new.split_type<>'none' or new.transaction_date<original.transaction_date
    or new.transaction_date>current_date then raise exception 'REFUND_DATE: Choose the actual received date after the original expense.'; end if;
  if new.amount is null or new.amount<=0 or new.amount::text in ('NaN','Infinity','-Infinity') then
    raise exception 'REFUND_LIMIT: Enter a finite positive refund amount.';
  end if;
  select coalesce(sum(amount),0) into refunded from public.transactions
    where parent_transaction_id=original.id and id<>new.id;
  if refunded+new.amount>original.amount then raise exception 'REFUND_LIMIT: Refunds exceed the original expense amount.'; end if;
  new.category:=original.category;
  return new;
end;
$$;
revoke all on function accounts_private.guard_personal_refund() from public,anon,authenticated;
-- Runs before account movement, so invalid refunds cannot affect balances.
create trigger a_guard_personal_refund before insert or update or delete on public.transactions
for each row execute function accounts_private.guard_personal_refund();

-- Account refunds are money-in (or a reduction of credit-card debt), not income.
-- Keep the existing movement implementation and change only the signed type mapping.
do $$declare body text;
begin
  select pg_get_functiondef('accounts_private.apply_transaction_account()'::regprocedure) into body;
  if position('old.type = ''income''' in body)=0 or position('new.type = ''income''' in body)=0 then
    raise exception 'Unexpected account movement implementation; migration aborted';
  end if;
  body:=replace(body,'old.type = ''income''','old.type in (''income'', ''refund'')');
  body:=replace(body,'new.type = ''income''','new.type in (''income'', ''refund'')');
  execute body;
end;$$;
revoke all on function accounts_private.apply_transaction_account() from public,anon,authenticated;
comment on column public.transactions.parent_transaction_id is 'Refund original expense. Restrictive FK, same personal space, capped in original currency, received-date accounting.';
notify pgrst,'reload schema';
