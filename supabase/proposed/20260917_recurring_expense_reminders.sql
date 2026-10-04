-- Query name: Personal Planning Phase 4 — Recurring Expense Reminders
begin;

create table if not exists public.fixed_expense_occurrences (
  id uuid primary key default gen_random_uuid(),
  fixed_expense_id uuid not null references public.fixed_expenses(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurrence_month date not null,
  due_date date not null,
  status text not null check (status in ('paid', 'skipped')),
  transaction_id uuid references public.transactions(id) on delete set null,
  resolved_at timestamptz not null default now(),
  unique (fixed_expense_id, occurrence_month)
);

alter table public.fixed_expense_occurrences enable row level security;
grant select, insert, update, delete on public.fixed_expense_occurrences to authenticated;
create policy "Users manage their recurring occurrences"
on public.fixed_expense_occurrences for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.resolve_fixed_expense_occurrence(
  p_fixed_expense_id uuid,
  p_occurrence_month date,
  p_action text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  expense public.fixed_expenses%rowtype;
  due_date_value date;
  transaction_id_value uuid;
begin
  if p_action not in ('paid', 'skipped') then raise exception 'Invalid action.'; end if;
  if date_trunc('month', p_occurrence_month)::date <> p_occurrence_month then raise exception 'Month must be the first day.'; end if;

  select * into expense from public.fixed_expenses
  where id = p_fixed_expense_id and user_id = auth.uid() and active = true;
  if expense.id is null then raise exception 'Recurring expense not found.'; end if;

  due_date_value := p_occurrence_month +
    (least(expense.due_day, extract(day from (p_occurrence_month + interval '1 month - 1 day'))::integer) - 1);

  if exists (select 1 from public.fixed_expense_occurrences where fixed_expense_id=expense.id and occurrence_month=p_occurrence_month) then
    raise exception 'This recurring expense has already been resolved for the month.';
  end if;

  if p_action = 'paid' then
    insert into public.transactions (
      space_id, created_by, paid_by, type, amount, currency,
      base_amount, base_currency, exchange_rate, exchange_rate_date,
      conversion_status, category, description, transaction_date,
      split_type, payment_status
    ) values (
      expense.space_id, auth.uid(), auth.uid(), 'expense', expense.amount, expense.currency,
      expense.amount, expense.currency, 1, due_date_value,
      'converted', expense.category, expense.name, due_date_value,
      'none', 'paid'
    ) returning id into transaction_id_value;
  end if;

  insert into public.fixed_expense_occurrences (
    fixed_expense_id, space_id, user_id, occurrence_month, due_date, status, transaction_id
  ) values (
    expense.id, expense.space_id, auth.uid(), p_occurrence_month, due_date_value, p_action, transaction_id_value
  );

  return transaction_id_value;
end;
$$;

revoke all on function public.resolve_fixed_expense_occurrence(uuid,date,text) from public, anon;
grant execute on function public.resolve_fixed_expense_occurrence(uuid,date,text) to authenticated;
commit;

select
  to_regclass('public.fixed_expense_occurrences') is not null as occurrences_ready,
  to_regprocedure('public.resolve_fixed_expense_occurrence(uuid,date,text)') is not null as resolver_ready;
