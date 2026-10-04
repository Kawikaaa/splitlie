-- Query name: Phase 3 - Total Budget and Fixed Expenses
begin;

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  category text not null default 'Other',
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  due_day integer not null default 1 check (due_day between 1 and 31),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists idx_fixed_expenses_owner
  on public.fixed_expenses(space_id, user_id, active);

alter table public.fixed_expenses enable row level security;

drop policy if exists "Users can view personal fixed expenses" on public.fixed_expenses;
create policy "Users can view personal fixed expenses" on public.fixed_expenses
for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.spaces s
    where s.id = space_id and s.type = 'personal' and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can create personal fixed expenses" on public.fixed_expenses;
create policy "Users can create personal fixed expenses" on public.fixed_expenses
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.spaces s
    where s.id = space_id and s.type = 'personal' and s.created_by = auth.uid()
  )
);

drop policy if exists "Users can update personal fixed expenses" on public.fixed_expenses;
create policy "Users can update personal fixed expenses" on public.fixed_expenses
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can delete personal fixed expenses" on public.fixed_expenses;
create policy "Users can delete personal fixed expenses" on public.fixed_expenses
for delete to authenticated using (user_id = auth.uid());

commit;
