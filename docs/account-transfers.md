# Account transfers — Sprint 5

Status: implemented locally; database migration applied to the existing Splitlie
project on 2026-11-01. Frontend has not been published or pushed to GitHub.

## User-approved rules

- Own active personal-space manual asset accounts only. Credit-card repayments are
  a separate future feature. Same account, foreign owner/space, credit cards and
  archived accounts cannot be selected for a new transfer.
- Same currency: sent and received amounts match. Cross currency: user supplies
  the actual amount received. No inferred website/bank exchange rate is recorded.
- Fees are separate expenses; the transfer does not create one automatically.
- Save changes both recorded balances immediately. This is bookkeeping, not a bank
  instruction or scheduled payment. UI dates are valid dates on/before today.
  The database allows through UTC today + 1 to accommodate client time zones.
- Transfers live in their own table. They do not create income/expense rows or
  alter the spending plan, Safe to Spend, category spending or recurring bills.
- Edits atomically undo the previous route and apply the replacement route.
  Previews show every affected account, including old endpoints on a reroute.
- Reversal preserves the record with cancelled status. If the original recipient
  no longer has enough funds, the whole reversal is rejected. No account may go
  negative or exceed the existing manual-account range.
- Archived accounts may participate in reversal of an existing transfer; recording
  or editing requires restored accounts. Reversed records cannot be reactivated.
- Any transfer history, including reversals, protects account currency/type and
  prevents permanent account deletion. Archive remains available.

## Implementation

- `public.account_transfers`: owner/space, source/target, native amounts/currencies,
  account version snapshots, date, note, status and server timestamps.
- RLS scopes reads/writes to the owner of an active personal space; archived space
  history is readable but mutations require an active space. No anon privileges,
  no authenticated DELETE and no client-supplied server timestamps.
- `accounts_private.apply_account_transfer()` is a SECURITY INVOKER trigger with
  empty search_path. It locks every affected account in ID order, checks the scope,
  types, currencies and versions, calculates all net balances, then applies them.
  There is no privileged public RPC and no new service-role access.
- Inserts use a stable UUID for the lifetime of the open editor. A retry with that
  ID checks the existing owner-scoped payload after duplicate/version errors, so
  uncertain responses cannot cause a second movement within the same operation.
  Starting a new editor is a new operation; users must check history after an
  uncertain result, rather than assume duplicates can be detected by amount.
- Editing/reversing checks transfer updated_at; new/edited transfers also check
  locked account versions. Reload refreshes the edited record's version while
  preserving form input. Async results after unmount/space changes are ignored.
- History uses a composite created_at/id cursor in pages of 20. UI distinguishes
  failed reads from empty history and keeps inputs on save failure.
- Native amounts support the existing four-decimal account precision; previews
  and history display up to four fractional digits. No new package dependencies.

Applied migration: `20261101171423_asset_account_transfers`.
The local migration mirrors the actual remote version. The reviewed proposal is
`supabase/proposed/account_transfers.sql`; rollback-based acceptance is in
`supabase/proposed/account_transfers_acceptance.sql`.

## Verification — 2026-11-01

| Layer | Evidence |
| --- | --- |
| Pure engine/repository/locales | Eight tests: exact decimal units, asset conservation, actual receipt, net edit/reversal, four-account reroute, invalid scope/types/funds/dates, idempotent retry/version scope, five-language key/interpolation parity |
| Real Postgres, authenticated role | Synthetic accounts inside BEGIN/ROLLBACK: create, edit, four-account reroute, reversal, insufficient-fund rollback, stale versions, duplicate-key rollback, actual cross-currency receipt, archive behavior, immutable history/identity, restrictive deletion FK, credit-card rejection and foreign-owner read/update denial |
| Financial isolation | SQL test verifies ordinary transaction count unchanged; schema/trigger never writes transaction or budget tables; existing financial-engine regression tests retained |
| Browser | In-app browser, `http://localhost:5173/my-money`, default desktop and 390×844: entry, empty history, same-currency amount lock, cross-currency manual receipt, both balance previews, insufficient amount disabling Save, cancel/close, fixed footer and no horizontal overflow |
| Four-account UI correction | Real TransferModal rendered with explicitly synthetic, nonpersisting fixture; desktop/mobile show A100, B20, C90, D50 when rerouting A→B into C→D |
| Console/build | Current browser error/warn capture empty, no framework overlay; production build passes. Test fixture is under ignored .impeccable/review and is not a production entry |
| Security advisors | No notices for the new transfer objects; existing unrelated warnings remain out of scope |
| Design | Build Web Apps browser verification and Impeccable context/craft floor/detector/independent review. Reviewer initially required every affected account in correction preview; fix-list verdict ship, resolved. Documenter compared incumbent tokens and six captures and preserved DESIGN.md/design.json |

The detector reported seven advisory type-size findings (12/13/22px), matching
neighboring account styles. Existing documentation differs between newer 8/12px
radius tokens and older 11/16px prose; this sprint did not repair that prior drift.

Remaining acceptance: true simultaneous multi-session writes, full browser
save/reopen/edit/reverse on a dedicated disposable test account, long populated
history/pagination, all five UI locales and assistive-technology/device coverage.
Browser checks never saved against the user's real accounts. SQL fixtures and
their movements were rolled back. These limits must not be described as full E2E
or concurrency certification.

## Rollback and next sprint

To withdraw the entry, revert the frontend feature after compatibility review.
Do not drop transfer history or reverse user movements as a schema rollback.
No automatic migration reversal is provided once real transfers exist.

Next: account-specific activity combining linked transactions, refunds and these
transfers, then explicit reconciliation/adjustment history. Credit repayments and
overdraft/overpayment rules remain separate. AI quality evaluation remains open.
