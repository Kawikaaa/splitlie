# Sprint 3 — recurring / upcoming, staged implementation

## Approved product rules

- Weekly, monthly and yearly schedules are needed.
- A yearly charge reserves its full amount only in its due month. No implicit monthly sinking fund.
- Spending is dated on the actual payment date, separately from the scheduled due date.
- Paid/skipped resolutions belong to one exact occurrence, not to the entire series or month.
- Existing monthly records and payment history must survive the upgrade.
- Suggestions require user confirmation; never create bills automatically.
- No automatic production deployment.

## Stage 1 implemented locally

`recurringEngine.js` generates date-only schedules, exact occurrence keys, next scheduled dates and unresolved obligations. Safe-to-Spend consumes these obligations through its existing deterministic calculation boundary. Weekly rules need an explicit anchor; yearly rules retain the anchor month/day. Monthly month-end dates are clamped without drifting subsequent dates; February 29 annual anchors recover on leap years. Date arithmetic does not depend on DST or the machine time zone.

Legacy rows without a frequency/anchor retain monthly behavior, including their incumbent month-scoped start/end reservations. Invalid new schedules return issues rather than invented dates. Currency mismatches are surfaced, not silently converted. Explicit recurring transaction linkage requires the exact due date for weekly/yearly rules; description/merchant similarity never discharges a bill. Cross-space links cannot discharge a reservation.

Stage 1 introduced `frequency`, `anchor_date` and `recurring_due_date` at the calculation boundary. Stage 2 below enables the series fields and v2 resolver in storage; `recurring_due_date` remains normalized evidence to be supplied through linked occurrence records, not a new transaction column. The schedule engine is tested with fixtures. The incumbent monthly Upcoming card/API remain unchanged until new readers and UI are enabled together; there is no visible weekly/yearly selector yet.

## Stage 2 — remote persistence upgrade applied

Read-only schema inspection confirmed the configured remote project is `nybvbqcdijhxufsaugmq`. Current occurrence uniqueness is `(fixed_expense_id, occurrence_month)`, and its RPC generates paid transactions on the due date. These are incompatible with multiple weekly occurrences and actual-payment-date accounting.

User explicitly authorized upgrading the existing cloud database. Migration `20261004213538_recurring_cycles_v2_compatible_storage` has been applied to that project. A private local snapshot of the original rows, policies, constraints and resolver is saved outside the app repository at `../private-backups/sprint3-recurring-pre-migration.json` (relative to the workspace, not this docs directory); do not publish it. There were one series and one skipped occurrence, with no linked payment rows. Post-migration comparison confirmed all original business fields and occurrence evidence unchanged. Only default monthly frequency/null anchor were added to the existing series. No historical payment dates were rewritten.

The migration adds frequency/anchor inputs and exact-due-date uniqueness, keeping occurrence_month for the deployed monthly client. It replaces direct authenticated occurrence writes with read-only access and guarded RPC writes. The v2 public RPC is security-invoker; its privileged worker lives in non-exposed `recurring_private`, uses an empty search_path, verifies auth.uid plus personal-space ownership/active state, validates scheduled dates/currency, locks the series and space, and creates the expense and resolution atomically. Anonymous callers cannot execute either public resolver. The legacy RPC retains its old due-date payment semantics for compatibility and explicitly rejects weekly/yearly rules; v2 writes require the actual payment date. A one-calendar-day UTC allowance accommodates local dates ahead of server UTC.

Rolled-back authenticated SQL fixtures passed weekly independent resolutions, yearly payment, legacy monthly payment, actual paid date, duplicate rejection, non-scheduled-date rejection, direct evidence write rejection, owner reassignment rejection, cross-user read/write denial and no-auth denial. Concurrent two-session racing has not been exercised; serialization uses row locks plus unique due-date evidence. Fixtures and their space-touch effects were rolled back. SQL snapshots and repeatable acceptance queries are in `supabase/proposed/sprint3_recurring_cycles.sql` and `sprint3_recurring_acceptance.sql`.

Security advisor reported unrelated existing warnings for other public security-definer functions, set_updated_at search_path and leaked-password protection. Neither new public recurring RPC is security-definer or anonymous-executable. Out-of-scope auth/shared functions were not modified. Advisor remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable .

Storage/UI follow-up work (Sprint 3 is not yet complete):

1. Fetch occurrences by due-date ranges, including cross-month horizons; normalize transaction links through occurrence records. Existing paid transactions must not be silently re-dated.
2. Add concurrent-session and further boundary acceptance tests, including early/late cross-month payments.
3. Account for edits/pauses without rewriting historical schedule semantics. Settled monthly occurrence evidence remains authoritative even if due_day changes. Frequency/anchor changes on an existing series with history require an explicit versioning policy before UI exposes them.
4. Keep weekly/yearly creation unavailable in the UI until new readers are ready. The deployed old client is compatible with monthly data, not newly created weekly/yearly data.

Only then implement the frequency controls, pause/resume, due-date display, future window, and confirmation-only detection under Build Web Apps + Impeccable, preserving the current design. Pending product UI and recognition are not claimed complete.

## Verification

The regression suite plus new recurring fixtures covers independent weekly resolutions, early yearly payment, upcoming linkage, leap days, month-end clamping, DST, invalid schedules, unsupported currency, paused/ended rules, ambiguous linkage and cross-space isolation. Database/RLS checks above are in addition to the unit fixtures. Shared accounting code, public pages and auth behavior are unchanged; no authenticated browser/payment mutation was performed. No website deployment.

## Stage 3 — pause history, readers and product controls implemented

Supersedes the UI-pending notes above. Remote migration `recurring_pause_history` adds ordered pause intervals and an authenticated owner-only pause/resume RPC. A due date is excluded strictly after the pause date and strictly before the resume date. Already due unpaid bills remain; resuming keeps the original anchor with no catch-up. Closed intervals persist so later queries cannot regenerate paused bills. Existing business records were not paused or rewritten.

Readers include paused series and paginated occurrence history so cross-month windows and early payments have resolution evidence. The Overview window covers unpaid dates since the current month began plus the next 14 days; Budget displays selected-month unresolved bills and all recurring rules, including future rules. Prior-month arrears are not rolled automatically into this month's Safe-to-Spend; this remains a separate product decision.

Budget creation now offers weekly/monthly/yearly cycles, first due date for weekly/yearly, and next scheduled date. Existing frequency/anchor controls are locked while editing to protect history; changing the cycle requires a new rule. Pause/resume and per-occurrence skip/paid actions are connected. Payment date defaults to the user's local calendar day, independently of the due date. Paid/skipped history remains authoritative. All added copy supports English, Chinese, Japanese, Korean and Spanish.

Build Web Apps + Impeccable guided a narrow extension of existing controls, not a visual redesign. Desktop and 390px mobile captures were inspected in one batch; mobile has no horizontal overflow. Browser form selection was verified without saving, paying, skipping or pausing actual user records. Rolled-back authenticated SQL acceptance passed pause idempotency, due-bill preservation, paused-date rejection, resume boundary/no catch-up, malformed chronology rejection and foreign-owner denial. Local regression tests and production build pass.

Remaining Sprint 3 work: confirmation-only recurring detection/suggestions, two-session race testing and any broader arrears/edit-versioning policy. No frontend deployment was performed. The cloud database is shared with the deployed site: release the upgraded frontend before relying on newly created weekly/yearly rules in the old live client.
