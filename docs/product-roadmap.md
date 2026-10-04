# Splitlie product roadmap

## Product direction

Build and validate a dependable web product first. Release a private demo to a small group of friends once the essential workflows are complete and safe. Use their real feedback to stabilize the product before investing in the mobile app.

## Phase 1 — foundation and stability (completed 2026-09-15)

- Harden database permissions and membership rules.
- Centralize Supabase access in the data layer.
- Simplify large transaction UI components.
- Make loading, saving, validation, and error states clear.
- Verify authentication, invitations, transactions, splits, settlements, and membership flows.
- Establish a repeatable production-build and release check.

Exit criteria: no known critical security issue, all essential flows have been exercised, failures are visible to users, and a production build succeeds.

## Phase 2 — essential product completeness (completed 2026-09-15)

- Transaction details, safe editing, and deletion.
- Clear balance provenance: who owes whom and which transactions caused it.
- Invitation lifecycle and expired-link handling.
- Settlement correction or reversal with preserved history.
- Search, month filters, category filters, and consistent currency/date presentation.

Exit criteria: a small group can manage a shared ledger without developer assistance.

## Phase 3 — private demo (current)

- Deploy a protected demo environment separate from development.
- Add onboarding, empty states, feedback collection, and basic diagnostics.
- Prepare demo accounts/data and a short tester guide.
- Invite a small group of friends and triage feedback by severity.

Exit criteria: testers complete the core journey reliably and no high-severity data or permission issue remains.

## Phase 4 — web product iteration

- Improve mobile web usability and accessibility.
- Add budgets, reports, recurring transactions, exports, and notifications according to demo feedback.
- Add automated regression coverage for the most valuable workflows.

Exit criteria: product behavior and information architecture are stable enough to share with a native client.

## Phase 5 — mobile app

- Confirm the mobile scope from demo usage rather than copying every web screen.
- Reuse the secured Supabase backend and documented business rules.
- Build authentication, spaces, transactions, splits, balances, and settlements first.
- Test on real iOS and Android devices, then run a limited beta.

The mobile app starts after the private demo has validated the core workflow, but mobile-friendly web design is considered throughout earlier phases.

