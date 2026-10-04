# Personal Space Current-State Audit

Audit date: 2026-09-23

This audit follows the UVA Foundry Master Brief. It separates observed repository facts from hypotheses and does not treat implemented prototypes as validated solutions.

## Current state

### Product and UX

- Personal and Shared Spaces use one application shell and one transaction model.
- Personal Overview currently renders, in order: Safe to Spend, upcoming recurring bills, monthly expense/income/net metrics, a collapsible budget summary, recent transactions, and a multi-currency overview.
- Personal Budget has its own route and supports total monthly budget, category budgets, fixed expenses, and recurring-expense occurrences.
- Transactions support search, month/category/currency filters, edit/delete, payment status, original currency, locked base amount, and exchange-rate metadata.
- Quick Add 2.0 is an unvalidated solution hypothesis currently implemented as:
  - collapsed-by-default transaction details;
  - amount or short-text input;
  - deterministic parsing and browser speech recognition;
  - frequent/recent category suggestions;
  - Add Again from recent Personal transactions;
  - reversible More options / Hide details;
  - explicit review before save.
- Shared Space already supports membership, invitations, equal/custom/percentage/no split, balances, settlements, reversals, lifecycle controls, and historical members. It must remain stable.

### Actual technology stack

- Vite 6
- React 18
- JavaScript/JSX, not TypeScript
- React Router
- Supabase JS
- Lucide icons
- Handwritten CSS
- Vercel static deployment

The repository is not currently Next.js, Tailwind, shadcn/ui, React Hook Form, Zod, or Recharts. The Master Brief's expected stack is directional, not a migration instruction. No framework rewrite is recommended.

### Current code organization

- `src/pages/Overview.jsx`: approximately 1,600 lines and combines Personal metrics, Shared members/balances/settlements, invitations, loading, and calculations.
- `src/components/TransactionModal.jsx`: approximately 1,600 lines and combines Personal/Shared forms, Quick Add, FX, voice input, split methods, validation, and persistence.
- `src/pages/Settings.jsx`: approximately 1,180 lines.
- `src/pages/Transactions.jsx`: approximately 980 lines.
- `src/styles.css`: approximately 5,180 lines.
- `src/i18n/LanguageContext.jsx`: translations for the full application are concentrated in two large objects.
- There is no automated unit, integration, or end-to-end test script in `package.json`.

### Data and security

- Personal and Shared transactions use `public.transactions`.
- Membership-dependent RLS protects spaces, transactions, splits, settlements, and invitations.
- Existing hardening added active-member checks, protected settlement workflows, invitation lifecycle checks, and restricted unsafe direct writes.
- Later scripts add budgets, fixed expenses, recurring occurrences, multi-currency accounting, percentage splits, space lifecycle, and pinning.
- No database change is required for Quick Add, Add Again, or initial Smart Defaults because these can derive from existing RLS-protected transaction rows.

## Gaps

### Product/evidence gaps

1. Quick Add, Add Again, and Smart Defaults are implemented hypotheses, not validated solutions.
2. There is no captured timing, interaction-count, difficulty, or repeat-use testing data yet.
3. `RESEARCH_EVIDENCE.md` currently contains product assumptions and placeholders, not actual survey/interview evidence.
4. Dashboard simplification has not been tested; the current Overview presents useful modules but does not yet clearly answer “where did it go?” or “what changed?”
5. Money Signals, Weekly Recap, and habit features should wait until the capture prototype is tested.

### UX gaps

1. Add Again and suggested categories load asynchronously after the modal opens, which can cause a small layout shift.
2. Quick Add still offers both natural-language parsing and category chips; user testing must determine whether this is clearer than a dedicated amount-first layout.
3. Smart category defaults are based on global category frequency. Merchant-to-category memory is not implemented yet.
4. Add Again repeats the exact amount. Testing should determine whether amount should always be copied or only preselected for stable merchants.
5. The Personal Dashboard hierarchy does not exactly match the proposed Monthly Overview → Budget → Breakdown → Signals → Recent sequence.
6. There is no dedicated spending-breakdown module, and adding one should be evidence-driven rather than assumed.

### Engineering gaps

1. `Overview.jsx` and `TransactionModal.jsx` are high-risk monoliths. Feature work increasingly touches unrelated Personal and Shared behavior.
2. The application fetches transaction data independently in Overview, Transactions, Budget, and the modal. There is no shared cache; this is acceptable at current scale but can produce repeated network work and inconsistent loading states.
3. Quick Add parser regression coverage exists only as manual/one-off checks. The `12.80` amount/date ambiguity demonstrates the need for permanent unit tests.
4. There is no lint/test command or CI quality gate.
5. `supabase/schema.sql` is older than the operational database. The 2026-09-15 snapshot predates later budget, multi-currency, recurring-expense, lifecycle, and pinning work. The exact current live schema is not represented by one authoritative committed baseline.
6. Several `supabase/proposed/*.sql` files were manually applied, but applied status is documented narratively rather than in a single migration history.
7. Large duplicated deployment/source folders (`splitly-vercel-source*`, `splitly-demo-upload`, `dist`) increase the risk of editing or deploying stale output.

## Recommended current sprint

### Feature

Personal Capture Prototype Validation and Stabilization

### Evidence

Evidence status: unvalidated hypothesis. Current research direction suggests tracking consistency may be difficult, but the repository does not contain evidence proving that Quick Add, Add Again, or Smart Defaults are the preferred solution.

### Problem

The product needs to determine whether the current capture prototype materially reduces perceived logging effort without creating confusion or inaccurate records.

### Hypothesis

An amount-first, progressively disclosed form with frequent categories and repeat actions may reduce time and interactions for common Personal expenses.

### Metric

Primary: friction. Secondary: willingness to repeat use.

### Implementation

Do not add another major feature. Stabilize the implemented prototype, add deterministic tests, instrument a lightweight test script, and run 5–8 moderated user tests comparing the current flow against the previous detailed form.

### Database impact

None.

### Shared Space impact

None. Only regression-test the existing Shared transaction flow.

### Test

For each participant, capture:

- completion time for one ordinary expense;
- number of deliberate interactions;
- correction rate;
- whether Add Again was understood without explanation;
- perceived difficulty (1–5);
- willingness to use repeatedly;
- qualitative confusion about category suggestions, copied amounts, and More options.

Decision after testing: Keep, Modify, Remove, or Continue testing.

## Files and components affected

### Stabilization/testing only

- `src/components/TransactionModal.jsx`
- `src/features/transactions/quickTransactionParser.js`
- `src/features/transactions/transactionTextService.js`
- `src/data/ledgerApi.js`
- `src/i18n/LanguageContext.jsx`
- `src/styles.css`
- New parser test file and a minimal test runner configuration
- `RESEARCH_EVIDENCE.md`

### Do not modify in this sprint unless a regression is found

- Shared transaction RPCs
- RLS policies
- settlement logic
- invitation lifecycle
- multi-currency schema
- Personal ↔ Shared synchronization

## Database impact

No migration is recommended for the current sprint.

Before any future schema change:

1. Export a fresh read-only live schema snapshot.
2. Reconcile applied scripts into an authoritative migration baseline.
3. Document current/proposed schema, RLS, RPC, Shared Space, compatibility, and rollback impact.
4. Run role-based tests for owner, member, former member, non-member, and cross-space access.

## Implementation order

1. Add permanent deterministic parser tests, beginning with known regressions (`12.80`, `30CAD 9.1`, relative dates, Chinese inputs).
2. Add component-level acceptance coverage for collapsed details, Add Again, today-date behavior, and Personal-only Smart Defaults.
3. Remove layout shift in suggestions/recent-loading state without changing the interaction model.
4. Prepare a short prototype-testing script and record results in `RESEARCH_EVIDENCE.md`.
5. Decide Keep / Modify / Remove for Quick Add, Add Again, and Smart Defaults.
6. Only after evidence review, define the Dashboard Simplification sprint using the required feature-decision format.

## Explicitly deferred

- Weekly Recap
- Money Signals Engine
- Budget Pacing changes
- Weekly Check-in
- Monthly Reflection
- new multi-currency positioning
- paid LLM parsing
- major Shared Space expansion
- framework/library migration
# Superseded scope note

The earlier phase boundary in this audit was superseded on 2026-09-23 by the approved Personal Space V2 prototype brief. Dashboard, recap, signals, and lightweight reflection surfaces are now implemented as explicitly unvalidated hypotheses. The underlying current-state observations remain useful.


