-- Query name: Phase 3 - Personal Budget and Safe to Spend
begin;

alter table public.transactions
  add column if not exists payment_status text not null default 'paid';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_payment_status_check') then
    alter table public.transactions add constraint transactions_payment_status_check
      check (payment_status in ('paid', 'upcoming'));
  end if;
end $$;

create index if not exists idx_transactions_space_status_date
  on public.transactions(space_id, payment_status, transaction_date);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(space_id, user_id, category, month)
);

alter table public.monthly_budgets enable row level security;

drop policy if exists "Users can view personal budgets" on public.monthly_budgets;
create policy "Users can view personal budgets" on public.monthly_budgets
for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.spaces s where s.id = space_id and s.type = 'personal' and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can create personal budgets" on public.monthly_budgets;
create policy "Users can create personal budgets" on public.monthly_budgets
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.spaces s where s.id = space_id and s.type = 'personal' and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can update personal budgets" on public.monthly_budgets;
create policy "Users can update personal budgets" on public.monthly_budgets
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can delete personal budgets" on public.monthly_budgets;
create policy "Users can delete personal budgets" on public.monthly_budgets
for delete to authenticated using (user_id = auth.uid());

commit;
