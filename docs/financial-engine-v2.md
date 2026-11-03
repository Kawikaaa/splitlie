# Financial engine V2 — Sprint 1

Manual entry is a permanent source. Core arithmetic is deterministic. Bank ingestion and AI enrichment must consume the same financial boundary, not replace it.

## Confirmed rules

- Spending-plan-first, never driven by account balances.
- Refunds reduce spending on the received date (user decision A). Original period is unchanged. They do not create income. A linked original expense supplies the category; missing links produce an issue rather than an inferred relationship.
- Transfers and credit-card repayments are excluded from spending/income; the underlying purchases are the expenses.
- Duplicate transaction IDs count once. Pending/failed FX, malformed amounts/dates and incompatible base currencies produce issues and are not silently converted.
- Paid spending is recognized through today's local date. Unpaid expense rows reserve their amount in the selected month, including overdue commitments.
- Fixed expenses reserve only unresolved active monthly occurrences. Paid/skipped resolutions are scoped to their month. Explicit recurring links prevent a second reservation for the same expense. No merchant/amount matching is used to invent a link.
- Goal reserves and buffer are zero unless explicitly opted in. Sprint 1 exposes calculation inputs only; no new reserve controls or persistence yet.
- Explanation rows come from the same calculation that produces Safe to Spend.
- Pace uses net incurred spending / plan, not reserved commitments / plan. A 5-percentage-point neutral band avoids labeling tiny differences. Today counts as elapsed; remaining daily pace covers days after today. Closed months have no remaining pace; future months have no incurred average. Negative availability does not yield a negative spending recommendation.

## Implementation

`transactionSemantics.js` normalizes existing rows; `calculateSafeToSpend.js` remains the common entry for Overview and Spending Plan; `spendingPace.js` computes period metrics. Personal summaries and analytics consume normalized effects. Shared debt/split/settlement calculations are deliberately unchanged.

## Schema and rollout limits

No SQL migration executed or added in Sprint 1. Existing expense/income writes remain compatible. `refund`, `transfer`, `credit_card_payment`, `parent_transaction_id`, recurring linkage and exclusion fields are supported at the calculation boundary, NOT newly enabled database writes. Persistence constraints, same-space parent validation, refund limits and the explicit entry UI must be added and tested before Sprint 6 exposes these types. Existing income rows with a refund-like description are not automatically reclassified or rewritten.

The existing recurring occurrence resolver supplies transaction linkage without a schema change. Manually entered duplicates lacking a link cannot be reliably detected; do not guess.

Quick Log no longer invokes an AI edge function. Recognized refund/transfer text is blocked with an explicit unavailable message instead of being misclassified as ordinary income/expense. Parser improvements and explicit refund/transfer entry remain Sprint 6. No production deployment.

## Verification

Run `npm test` and `npm run build`. Fixtures cover cross-month refunds, categories and weekly totals, transfers, exclusions, duplicate IDs, invalid accounting data, paid/skipped recurrence, linked upcoming reservations, opt-in reserves, explanation identity, no/zero plan, closed/future periods and leap years. Browser smoke checks cover personal Overview, explanation expansion, plan month navigation and shared-space navigation without modifying financial records.

## Sprint 2 — signals and data sufficiency

`signalEngine.js` adapts the existing category, frequency, large-purchase and small-purchase rules; adds plan pace, explicitly configured unpaid recurring bills, and Safe-to-Spend mutation comparisons. It exposes canonical types, source confidence categories, related transaction IDs, periods and data-quality metadata. It does not detect or create recurring bills. Existing recorded-history comparisons still require two observed historical weeks; that threshold is not a claim that records are complete or a statistical confidence percentage.

Worth Noticing selects at most three candidates, ordered by the existing significance values and deterministic IDs. It rejects repeated categories and overlapping contributing transactions. This is an explainable heuristic, not an AI recommendation or a new statistical model. Absolute observations remain available without comparative history. No financial read means no signal or zero-value financial hero.

`dataQuality.js` distinguishes no records, recent entry, five calendar days without an entry, records needing review, and failed reads. `created_at` is the freshness basis where valid; otherwise the transaction date is a disclosed approximation (the UI says latest recorded date). Recent entry never implies verified completeness. The UI explicitly states the recorded-data limit. Transfer/excluded/future-dated records do not imply current incurred spending.

### Confirmed A: before this mutation

The baseline is immediately before the successful transaction/commitment mutation, not the last visit. `financialChange.js` compares authenticated before/after reads through the same engine and clock. It rejects plan changes, unexpected extra changed rows, invalid financial data, and transaction rows that do not match the saved fields. A previously reserved recurring payment does not create a new drop by counting the payment twice.

Evidence is session-memory only, partitioned by user, space and month. It expires on a changed ledger, currency/plan change, different day, or page reload; there is no invented replacement baseline. Failed evidence capture is best effort and does not invalidate a successful write. No schema/RLS changes or migration. Reads are not an atomic database snapshot: a future persisted audit-event/RPC design would be required for guaranteed cross-session and multi-device attribution. Each supported save adds four before and four after queries; later optimization should preserve correctness rather than infer prior values from the current screen.

### Verification and fidelity ledger

45 automated tests cover financial rules, all seven signal types, curation, insufficient history, freshness boundary/DST, failed reads, same-user/space/day evidence, mismatched/concurrent mutations, recurrence double counting, locale key/interpolation parity and previous regressions. Production build passes. Real database writes were not exercised: browser QA was read-only and mutation tests use fixtures.

Browser/IAB verified personal desktop, 390px mobile without horizontal overflow, opening/closing a signal detail, and the unchanged shared empty-ledger/member/settlement view. Temporary viewport override and selected space were restored. A historical transient Vite reload error remained in the tab log from in-progress edits; final render/build are successful, with no framework error overlay.

Incumbent visual evidence: `../style-unify-review/sprint2-before.png`. Latest rendered evidence: `../style-unify-review/sprint2-desktop.png`, `sprint2-signals-final.png`, `sprint2-mobile.png`. These are local QA files outside the repository. They were inspected with view_image, including the 1265px desktop reference and mobile render.

- Layout: retain sidebar, hero and existing module order; replace four competing signal tiles with up to three readable rows. Mobile column wrapping fixed.
- Typography: retain Geist and established heading/control hierarchy; new evidence annotation uses 14px heading and 13px body.
- Palette: retain charcoal, lime and neutral surfaces; evidence remains a subtle open annotation, not another colored card.
- Icons/containers: retain the current icon library and card surfaces; use a record/filter icon rather than a verification shield for unverified data.
- Copy: existing navigation/CTA labels unchanged. Intentional additions are recorded-data basis/freshness and factual new signal explanations in all five locales. No bank-balance, completeness or AI claims.
- Behavior: details remain keyboard-closeable; missing data has retry recovery; no financial records modified and shared financial math unchanged.

No production deployment. Sprint 3 remains separate: recurring recognition must be confirmation-only, never an automatic expense creation.

### Product correction: remove arithmetic-only drops

User feedback supersedes the original A implementation: a $50 expense causing a $50 reduction repeats arithmetic without adding insight. The active engine no longer produces SAFE_TO_SPEND_DROP. Overview, transaction saves and commitment saves no longer capture/read before/after snapshots, eliminating the eight additional queries per save. Pure snapshot helpers/tests remain non-production historical groundwork, not an active feature. Other observations, pace and unpaid-bill signals are unchanged; no new impact threshold or notification behavior was invented. Money signals remains an inline section below the weekly overview, not a post-save popup. Existing layout, typography, palette, icons and copy are preserved; only the approved drop branch is removed.

### Weekly check-in persistence

Weekly reflections now use the independent `public.weekly_checkins` table, keyed by user, personal space and Monday week start. The remote `account_weekly_checkins` migration has been applied; `supabase/proposed/weekly_checkins.sql` is its SQL snapshot. RLS restricts reads and writes to the owner of that personal space, with no anonymous or delete access. No ledger, budget, settlement or balance rows are changed.

Approved legacy import reads both old browser keys, validates and deduplicates entries, and inserts missing weeks without replacing account records. Original local history is retained. Unknown completion dates remain null: those records count toward streaks but are not assigned a fabricated calendar day. New records store both the completion instant and its local calendar date, so changing time zones cannot shift an already saved date. Cloud reads are paginated rather than capped at eight weeks.

An unfinished current week keeps the streak ending last week; a fully missed prior week breaks it. Completion is shown only after a successful cloud write. Failed loads/imports offer retry; failed saves retain draft choices. Calendar opens on the current month with previous/next controls. Money-signal reflection context reads the same account-backed store. Build and 53 unit tests pass; database authorization tests use a rolled-back transaction, and the existing browser reflection was imported and verified after refresh. Cross-device hardware and browser-network interruption were not exercised.

### Account deletion — 2026-10-04

Active and archived personal accounts now have a permanent-delete action with a named-account confirmation dialog. The owner-only DELETE grant/policy is deployed by `supabase/migrations/20261005021333_owner_delete_unlinked_accounts.sql`; no existing account was removed. The repository scopes deletion to user, space, ID and latest `updated_at`. Version conflicts offer a reload, and failures never claim success. Successful deletion reloads account data and recomputes assets, card debt and net without changing the spending plan or Safe to Spend.

The restrictive transaction/account foreign key is retained: any associated transaction, including an upcoming entry, prevents deletion atomically. The dialog offers archive instead; already-archived linked accounts remain protected. No cascading transaction deletion or silent unlinking is introduced. Database acceptance in `supabase/proposed/account_deletion_acceptance.sql` creates only rollback fixtures and passes owner, stale-version, foreign-owner, linked-account, archived-account and anonymous-access checks. `npm test` and production build pass. Browser QA opened and cancelled the real-account confirmation; it did not perform a real deletion. Impeccable guidance kept the existing three-column wallet layout, restrained destructive action, clear consequence copy and reusable accessible ModalSurface.

The post-migration security advisor also reports unrelated function execution/search-path and Auth password-protection warnings. Those existing functions/Auth settings were not changed by this feature; they require a separate security review rather than blanket privilege revocation.

### Sprint 6 — explicit refunds completed; account transfers next

Personal paid expenses now expose Record refund in their transaction menu. Partial refunds default to the original payment account, with another receiving account or no linked account allowed. Amounts and cumulative caps use the original expense currency; account credits use dated website FX. Refunds inherit the original category and reduce spending on the received date without counting as income or rewriting the original month. Existing income entries described as refunds are not reclassified.

`supabase/migrations/20261005030007_personal_refunds.sql` is applied remotely. The owner/scoped parent validation, original-row locking and cumulative cap run inside the database transaction. Refund edits and deletion reverse the previous account movement atomically. Associated originals cannot be deleted or have their accounting amount/currency/category/date changed until their refunds are removed. Existing asset/debt balance safeguards remain active. Functions use security invoker, empty search paths and revoked direct execution. No existing ledger rows were migrated or changed.

`supabase/proposed/personal_refunds_acceptance.sql` passed using temporary fixtures and a final rollback: partial/capped refunds, FX credits, card debt reduction, date restrictions, owner isolation, protected originals, account switching, unlinked refunds and deletion reversal. All `npm test` suites and production build pass. Separate-session concurrency stress was not exercised. Desktop and 390px mobile QA verified the entry, editable draft, receiving-account selection, ready FX preview and cancellation, without saving a real refund to the user's ledger. Impeccable kept the existing palette and reusable modal/form system; Build Web Apps guided responsive and interaction verification rather than a page redesign. Read failures preserve drafts, FX errors offer retry, and Quick Log still requires the explicit original-expense path for refunds.

Account transfers remain a separate next step: paired movements must not count as income, expenses or Safe to Spend. Destination/currency/credit-card rules require confirmation before exposing them. The frontend has not been deployed and no GitHub synchronization was requested in this step. Earlier Sprint 1 persistence notes describe the historical boundary-only state; explicit refund persistence is now enabled as documented here.
