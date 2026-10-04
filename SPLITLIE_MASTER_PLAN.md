# Splitlie Master Plan

## North Star

Splitlie should make understanding personal and shared money feel easier, not make financial management more complicated.

The long-term product combines Personal Space ("my money") and Shared Space ("our money"). The current UVA Foundry focus is Personal Space: reduce transaction-logging friction, increase financial awareness, and support a lightweight tracking habit.

Planned features are hypotheses unless direct research and prototype-test evidence says otherwise. Do not describe an implemented prototype as a validated solution.

## Current product loop

Capture → Understand → Reflect → Small Action → Repeat

Every material feature must improve at least one of:

- Logging friction
- Financial awareness
- Retention
- Future Personal ↔ Shared integration

## Priorities

### P0

- Quick Add 2.0
- Recent / Repeat Transactions
- Smart Defaults
- Personal Dashboard simplification
- Personal UX testing and evidence collection

### P1

- Weekly Recap
- Deterministic Money Signals
- Budget Pacing
- Weekly Check-in
- Monthly Reflection

### P2

- Multi-currency and international-student validation

## Guardrails

- Preserve the existing Shared Space architecture. Fix critical bugs; do not expand it aggressively during the Personal-focused phase.
- Do not prioritize Plaid, investments, credit scores, net worth, receipt OCR, bank-statement AI import, generic finance chatbots, or excessive gamification/charts.
- Prefer deterministic logic before generative AI.
- Preserve working functionality and database security.
- Do not introduce a dependency unless it provides a clear benefit over the existing stack.
- Do not rewrite the current Vite/React app merely to match another project's stack.
- Before a major schema change, document the current schema, proposal, migration, RLS impact, and rollback.

## Foundry development principle

Evidence → Hypothesis → Feature → Test → Iterate

Before implementing a significant feature, record:

1. The validated or research-backed problem.
2. The target metric: friction, awareness, or retention.
3. Schema and RLS impact.
4. Shared Space impact.
5. The user-test method and success criteria.

## Long-term architecture requirement

A Shared transaction is not always a split transaction. Future Personal ↔ Shared sync must record only a user's actual share in Personal Space. For a $90 dinner split three ways, Shared Space retains the $90 transaction while the user's Personal Space reflects a $30 dining expense.

