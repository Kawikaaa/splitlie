-- Asset-account transfers only. No writes to transactions, plans or budgets.
begin;
set local lock_timeout='5s';
create table public.account_transfers (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete restrict,
 space_id uuid not null references public.spaces(id) on delete restrict,
 source_account_id uuid not null references public.financial_accounts(id) on delete restrict,
 target_account_id uuid not null references public.financial_accounts(id) on delete restrict,
 source_amount numeric not null check(source_amount>0 and source_amount<100000000000000 and scale(source_amount)<=4),
 target_amount numeric not null check(target_amount>0 and target_amount<100000000000000 and scale(target_amount)<=4),
 source_currency text not null check(source_currency ~ '^[A-Z]{3}$'),
 target_currency text not null check(target_currency ~ '^[A-Z]{3}$'),
 source_version timestamptz not null,
 target_version timestamptz not null,
 transfer_date date not null,
 note text not null default '' check(length(note)<=500),
 status text not null default 'completed' check(status in ('completed','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(source_account_id<>target_account_id),
 check(source_currency<>target_currency or source_amount=target_amount)
);
create index account_transfers_owner_date_idx on public.account_transfers(user_id,space_id,transfer_date desc,id);
create index account_transfers_source_idx on public.account_transfers(source_account_id);
create index account_transfers_target_idx on public.account_transfers(target_account_id);
alter table public.account_transfers enable row level security;
revoke all on public.account_transfers from public,anon,authenticated;
grant select on public.account_transfers to authenticated;
grant insert(id,user_id,space_id,source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date,note) on public.account_transfers to authenticated;
grant update(source_account_id,target_account_id,source_amount,target_amount,source_currency,target_currency,source_version,target_version,transfer_date,note,status) on public.account_transfers to authenticated;
create policy "Read own transfers" on public.account_transfers for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal'));
create policy "Create own transfers" on public.account_transfers for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal' and s.status='active'));
create policy "Update own transfers" on public.account_transfers for update to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal' and s.status='active')) with check (
 user_id=(select auth.uid()) and exists(select 1 from public.spaces s where s.id=space_id and s.created_by=(select auth.uid()) and s.type='personal' and s.status='active'));

create function accounts_private.apply_account_transfer() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
 old_source uuid; old_target uuid; old_source_amount numeric:=0; old_target_amount numeric:=0;
 account_row public.financial_accounts%rowtype;
 source_row public.financial_accounts%rowtype; target_row public.financial_accounts%rowtype;
 delta numeric; next_balance numeric;
begin
 if auth.uid() is null or new.user_id<>auth.uid() or not exists(select 1 from public.spaces where id=new.space_id and created_by=auth.uid() and type='personal' and status='active') then
  raise exception 'TRANSFER_SCOPE';
 end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.space_id<>old.space_id or new.created_at<>old.created_at then raise exception 'TRANSFER_IMMUTABLE'; end if;
  if old.status='cancelled' then raise exception 'TRANSFER_CANCELLED'; end if;
  if new.status='cancelled' and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'TRANSFER_IMMUTABLE'; end if;
  old_source:=old.source_account_id; old_target:=old.target_account_id;
  old_source_amount:=old.source_amount; old_target_amount:=old.target_amount;
 elsif new.status<>'completed' then raise exception 'TRANSFER_INVALID';
 end if;
 -- Same global account lock order as linked transactions; up to four accounts on edits.
 perform id from public.financial_accounts where id in(old_source,old_target,new.source_account_id,new.target_account_id) order by id for update;
 select * into source_row from public.financial_accounts where id=new.source_account_id and user_id=new.user_id and space_id=new.space_id;
 if not found then raise exception 'TRANSFER_SCOPE'; end if;
 select * into target_row from public.financial_accounts where id=new.target_account_id and user_id=new.user_id and space_id=new.space_id;
 if not found then raise exception 'TRANSFER_SCOPE'; end if;
 if source_row.type='credit_card' or target_row.type='credit_card' or source_row.balance_source<>'manual' or target_row.balance_source<>'manual' then raise exception 'TRANSFER_ASSET_ONLY'; end if;
 if new.source_account_id=new.target_account_id or new.source_currency<>source_row.currency or new.target_currency<>target_row.currency then raise exception 'TRANSFER_INVALID'; end if;
 if new.status='completed' then
  if source_row.archived_at is not null or target_row.archived_at is not null then raise exception 'TRANSFER_ARCHIVED'; end if;
  if new.source_version is distinct from source_row.updated_at or new.target_version is distinct from target_row.updated_at then raise exception 'TRANSFER_CONFLICT'; end if;
 end if;
 if new.transfer_date>current_date+1 then raise exception 'TRANSFER_DATE'; end if;
 -- Check every resulting balance BEFORE updating either side. Reversal can fail
 -- if funds already left the receiving account; never allow a partial reversal.
 for account_row in select * from public.financial_accounts where id in(old_source,old_target,new.source_account_id,new.target_account_id) order by id loop
  if account_row.user_id<>new.user_id or account_row.space_id<>new.space_id then raise exception 'TRANSFER_SCOPE'; end if;
  delta:=case when account_row.id=old_source then old_source_amount else 0 end
    -case when account_row.id=old_target then old_target_amount else 0 end;
  if new.status='completed' then
   delta:=delta-case when account_row.id=new.source_account_id then new.source_amount else 0 end
     +case when account_row.id=new.target_account_id then new.target_amount else 0 end;
  end if;
  next_balance:=account_row.balance+delta;
  if next_balance<0 then raise exception 'TRANSFER_INSUFFICIENT'; end if;
  if next_balance>=100000000000000 then raise exception 'TRANSFER_RANGE'; end if;
 end loop;
 for account_row in select * from public.financial_accounts where id in(old_source,old_target,new.source_account_id,new.target_account_id) order by id loop
  delta:=case when account_row.id=old_source then old_source_amount else 0 end
    -case when account_row.id=old_target then old_target_amount else 0 end;
  if new.status='completed' then
   delta:=delta-case when account_row.id=new.source_account_id then new.source_amount else 0 end
     +case when account_row.id=new.target_account_id then new.target_amount else 0 end;
  end if;
  if delta<>0 then
   update public.financial_accounts set balance=balance+delta where id=account_row.id;
   if not found then raise exception 'TRANSFER_SCOPE'; end if;
  end if;
 end loop;
 new.updated_at:=clock_timestamp();
 return new;
end;$$;
revoke all on function accounts_private.apply_account_transfer() from public,anon,authenticated;
create trigger apply_account_transfer before insert or update on public.account_transfers for each row execute function accounts_private.apply_account_transfer();

create function accounts_private.guard_transfer_account_identity() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 if (new.currency is distinct from old.currency or new.type is distinct from old.type) and exists(select 1 from public.account_transfers where source_account_id=old.id or target_account_id=old.id) then
  raise exception 'ACCOUNT_LINKED: Transfer history retains this account currency and type.';
 end if;
 return new;
end;$$;
revoke all on function accounts_private.guard_transfer_account_identity() from public,anon,authenticated;
create trigger guard_transfer_account_identity before update of currency,type on public.financial_accounts for each row execute function accounts_private.guard_transfer_account_identity();
comment on table public.account_transfers is 'Manual asset transfer records. Independent of income/spending/Safe to Spend. Cancellation preserves history. No bank instruction is sent.';
notify pgrst,'reload schema';
commit;
-- To pause: remove the UI entry. Do not drop history or reverse existing transfers
-- as a schema rollback. Restore a prior frontend only after compatibility review.
