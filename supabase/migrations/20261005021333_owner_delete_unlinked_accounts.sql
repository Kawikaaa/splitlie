-- Ownership is enforced by RLS; linked transactions retain their restrictive FK.
-- No account rows or transaction rows are deleted by this migration.
set lock_timeout = '5s';
grant delete on public.financial_accounts to authenticated;
create policy "Delete own active personal accounts"
on public.financial_accounts for delete to authenticated
using ((select auth.uid()) = user_id and exists (
  select 1 from public.spaces s where s.id = financial_accounts.space_id
    and s.type = 'personal' and s.status = 'active'
    and s.created_by = (select auth.uid())
));
-- Rollback: drop policy "Delete own active personal accounts" on public.financial_accounts;
-- revoke delete on public.financial_accounts from authenticated;
