# Live Database Baseline Audit

Audit date: 2026-09-15

Source: read-only metadata exported from the linked Supabase project's `public`
schema through SQL Editor. No database changes were made during this audit.

## Live tables

- `profiles`
- `spaces`
- `space_members`
- `transactions`
- `transaction_splits`
- `settlements`
- `settlement_transactions`
- `space_invitations`

## Live functions used by the application

- `accept_space_invitation`
- `attach_transactions_to_settlement`
- `can_manage_transaction`
- `capture_settlement_transactions`
- `create_shared_space`
- `create_shared_transaction`
- `create_space_invitation`
- `get_member_space_balance`
- `get_my_space_balance`
- `handle_new_user`
- `is_space_member`
- `is_space_owner`
- `is_transaction_settled`
- `leave_shared_space`
- `protect_settled_transaction_delete`
- `remove_space_member`
- `set_updated_at`
- `update_shared_transaction`

The live database also contains the Supabase-managed `rls_auto_enable` event-trigger
function. It should not be treated as application-owned migration code without first
verifying its platform ownership and lifecycle.

## Confirmed drift from `supabase/schema.sql`

The checked-in schema is older than the live database.

1. Live `space_members` has `status` and `left_at`; the checked-in schema does not.
2. Live membership status is constrained to `active`, `left`, or `removed`.
3. Live `is_space_member` and `is_space_owner` require active membership.
4. Live database has `settlement_transactions`; the checked-in schema does not.
5. Live database has shared-transaction, balance, leave/remove-member, and
   settlement-history functions that are absent from the checked-in schema.
6. Live RPC argument names match the current frontend more closely than the old
   checked-in definitions.
7. Live database has transaction-delete protection and settlement-capture triggers
   absent from the checked-in schema.

Until a proper migration baseline is committed, the live database—not
`supabase/schema.sql`—is the operational source of truth.

## Priority security findings

### P0: invitation replay and expiry are not enforced by the accept RPC

The live `accept_space_invitation` function looks up a token and activates the
membership, but does not reject non-pending, expired, or revoked invitations. It also
does not mark a pending invitation accepted. A leaked or old token can therefore be
reused to join or rejoin a space.

### P0: direct settlement insert trusts client-supplied participants

The live settlement INSERT policy verifies only that `created_by = auth.uid()` and
that the caller is a member of the selected space. It does not require `from_user`
and `to_user` to be members of that space or require the caller to be one of those
two users. A caller can bypass the UI and create a fabricated settlement.

### P1: shared transaction participants need active-status validation

The shared transaction RPCs verify that payer and split users have membership rows,
but do not require those rows to have `status = 'active'`. A crafted API request can
use a former member even though the UI filters former members out.

### P1: direct table policies remain broader than the protected RPC workflows

Direct DELETE policies on `space_members` can bypass the history-preserving
leave/remove RPCs. Direct transaction and settlement mutations also expose fields
whose invariants are stronger in the RPC layer. The database should make the secure
workflow mandatory instead of relying on UI behavior.

### P1: update policies permit ownership-field mutation

Transaction and settlement UPDATE policies authorize using the old row and then
only check membership in the resulting space. They do not explicitly freeze fields
such as `created_by` or prevent moving a record between spaces.

## Safe next phase

1. Capture the live application-owned schema as versioned migrations.
2. Add security regression tests for owner, active member, former member,
   non-member, and cross-space access.
3. Prepare an additive security migration for invitation validation, settlement
   creation, active participant validation, and direct-policy tightening.
4. Review the SQL and rollback impact before running it against Supabase.

## Applied follow-up

On 2026-09-15, `supabase/proposed/20260915_security_hardening.sql` was applied
manually through the linked Supabase project's SQL Editor after the matching
settlement frontend RPC change was prepared.

The follow-up read-only verification confirmed all four expected conditions:

- `create_settlement(uuid, uuid, uuid, numeric, text, date, text)` exists.
- invitation status validation exists.
- invitation expiry validation exists.
- the former direct settlement INSERT policy is absent.

The second hardening script,
`supabase/proposed/20260915_active_membership_hardening.sql`, was then applied
manually. It adds database-level active-member validation for shared transaction
payers and split participants, and removes the two direct membership DELETE
policies so leave/remove operations must use the history-preserving RPCs. Read-only
verification confirmed both triggers exist and both direct DELETE policies are
absent.

## Source-controlled snapshot

The pre-hardening live schema metadata export is preserved at
`supabase/snapshots/20260915-pre-hardening-live-public-schema.json`. Together with
the two applied hardening SQL files, this records the effective live schema state
without including user or transaction data.

A fresh post-hardening export was subsequently captured at
`supabase/snapshots/20260915-post-hardening-live-public-schema.json`. It confirms
22 public functions, 27 policies, and 7 application-visible table triggers. The
three unsafe direct-write policies are absent, while `create_settlement` and both
active-membership validation triggers are present.

## Final permission verification

The final read-only permission audit passed all seven checks:

- all eight application tables have RLS enabled;
- authenticated users can execute `create_settlement`;
- anonymous users cannot execute `create_settlement`;
- anonymous users cannot execute `accept_space_invitation`;
- the transaction payer validator is not directly callable by authenticated users;
- `is_space_member` requires active membership;
- `is_space_owner` requires active owner membership.

The initial database security-and-baseline phase is complete. This verification is
metadata-level coverage; role-based behavioral regression tests should still be
added to an automated test suite before production launch.
