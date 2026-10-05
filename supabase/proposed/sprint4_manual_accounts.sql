-- Incremental account storage only. No transaction/budget/recurring mutations.
set lock_timeout='5s';
create schema accounts_private;
revoke all on schema accounts_private from public,anon,authenticated;
create table public.financial_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 100),
 type text not null check (type in ('checking','savings','cash','credit_card','campus_card','digital_wallet','other')),
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 balance numeric(18,4) not null check (balance >= 0 and balance < 100000000000000),
 balance_source text not null default 'manual' check (balance_source='manual'),
 balance_updated_at timestamptz not null default clock_timestamp(),
 include_in_total boolean not null default true,
 institution text check (length(institution)<=120),
 note text check (length(note)<=1000),
 archived_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
comment on column public.financial_accounts.balance is 'Manual snapshot; positive credit_card balance means outstanding debt, not available credit. Transactions never mutate this value.';
comment on column public.financial_accounts.balance_updated_at is 'Server-set balance confirmation time, distinct from metadata edit time.';
create index financial_accounts_owner_space_idx on public.financial_accounts(user_id,space_id,id);
alter table public.financial_accounts enable row level security;
revoke all on public.financial_accounts from public,anon,authenticated;
grant select on public.financial_accounts to authenticated;
grant insert(user_id,space_id,name,type,currency,balance,include_in_total,institution,note) on public.financial_accounts to authenticated;
grant update(name,type,currency,balance,include_in_total,institution,note,archived_at) on public.financial_accounts to authenticated;
create policy "Read own personal accounts" on public.financial_accounts for select to authenticated
 using ((select auth.uid())=user_id and exists(select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.created_by=(select auth.uid())));
create policy "Create own active personal accounts" on public.financial_accounts for insert to authenticated
 with check ((select auth.uid())=user_id and exists(select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.status='active' and s.created_by=(select auth.uid())));
create policy "Update own active personal accounts" on public.financial_accounts for update to authenticated
 using ((select auth.uid())=user_id and exists(select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.status='active' and s.created_by=(select auth.uid())))
 with check ((select auth.uid())=user_id and exists(select 1 from public.spaces s where s.id=space_id and s.type='personal' and s.status='active' and s.created_by=(select auth.uid())));
create function accounts_private.stamp_account_metadata() returns trigger
language plpgsql security invoker set search_path=''
as $$begin new.updated_at:=clock_timestamp(); return new; end;$$;
create function accounts_private.stamp_account_balance() returns trigger
language plpgsql security invoker set search_path=''
as $$begin new.balance_updated_at:=clock_timestamp(); return new; end;$$;
revoke all on function accounts_private.stamp_account_metadata() from public,anon,authenticated;
revoke all on function accounts_private.stamp_account_balance() from public,anon,authenticated;
create trigger stamp_account_metadata before update on public.financial_accounts
 for each row execute function accounts_private.stamp_account_metadata();
-- Even confirming the same amount refreshes its timestamp. Renaming does not.
create trigger stamp_account_balance before update of balance,currency on public.financial_accounts
 for each row execute function accounts_private.stamp_account_balance();
notify pgrst,'reload schema';
