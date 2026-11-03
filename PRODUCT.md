# Product

<!-- impeccable:product-schema 1 -->

Product context refreshed with the user on 2026-11-03. This is the durable product record; implementation and release status live in `PROJECT_STATUS.md`.

## Platform

web

## Users

Splitlie primarily serves individuals recording and understanding their everyday money. Shared expenses with partners, friends, family, or housemates are an optional adjoining workflow. The primary job is to record spending with little effort, understand what has been spent and remains safe to spend, inspect account balances, and resolve shared amounts owed with understandable evidence. Bank reconciliation is not automated.

## Product Purpose

Splitlie combines a private personal ledger, monthly spending plans, recurring expenses, manually recorded accounts, multi-currency recording, and shared-expense settlement. Optional AI prepares transaction drafts from text or receipts and explains recorded spending through weekly reviews and small actions. Success means a user can record, understand, inspect the evidence, review, and act without repeatedly entering the same context or confusing an estimate with verified financial information.

## Positioning

The product keeps personal money private by default and places Personal Spaces beside explicitly shared spaces. Personal records and shared expenses retain their own permissions and accounting context; the interface must not imply automatic synchronization between them. Shared transactions retain payer, participants, split method, currency context, and settlement state. AI assists extraction and interpretation; deterministic services calculate money and enforce permissions, and users confirm ledger writes.

## Operating Context

Users return throughout the month to add income or expenses, optionally link a manually recorded account, review recent activity, manage spending plans and recurring bills, inspect spending signals, switch between spaces, invite members, and record shared settlements. Desktop and mobile web are equally important; this remains a web product, not a native mobile app.

The core personal cycle is record → understand → inspect source transactions → weekly review → one optional small action. Text and receipt recognition prepare editable drafts rather than saving silently. Receipt entry defaults to the total, merchant, date and currency; item details are optional. Weekly reviews carry a selected period and links to their supporting records, and returning from those records retains the review context.

English, Simplified Chinese, Japanese, Korean and Spanish are supported across public pages, authentication and the authenticated product. Dates, currencies, long translated labels and error states must follow the selected language and locale.

## Capabilities and Constraints

- Preserve the existing React, Vite, Supabase, React Router, and deployed data model.
- Preserve every existing route, authentication flow, Google sign-in capability, transaction workflow, personal and shared space workflow, budget calculation, Safe to Spend logic, recurring expense behavior, multi-currency behavior, avatar workflow, invitations, permissions, and settlements.
- Current personal capabilities include income/expenses, quick entry, optional text AI, total-first receipt drafts, optional receipt items, transaction search/edit/delete, spending plans, recurring bills, refunds, manual accounts, optional account-linked transactions, asset-account transfers, weekly reviews, check-ins/streaks, and optional tracked small actions. Implementation is not a claim of complete model evaluation or production deployment; consult the current status and acceptance records.
- Spending plans and account balances answer different questions. Safe to Spend comes from the plan, recorded spending and reserved obligations, not total account assets. An unlinked expense can affect spending without changing an account; linked paid transactions change balances atomically. Upcoming transactions do not move money early.
- Accounts are manually recorded, not bank connections. Refunds reduce spending on the receipt date rather than becoming income; asset transfers are neither income nor spending. Credit-card repayment, full reconciliation, dedicated account activity, conversational querying, automatic notifications and bank synchronization must not be advertised as implemented without updated evidence.
- Financial amounts, exchange rates, permissions and write outcomes must never be guessed by an LLM. Unknown or failed data is not zero. Website exchange rates are estimates and do not promise bank settlement values. A committed save and a failed refresh are distinct outcomes; recovery must not repeat a financial write.
- AI processing is optional and consented per transmission. Extracted values remain editable; optional item recognition does not block recording a valid receipt total. Weekly suggestions are based on recorded-data facts and disclose scope, completeness and stale results. AI cannot autonomously save transactions, deduct money, accept actions or issue notifications.
- Preserve real product copy and real application states. Do not fabricate customers, performance claims, financial recommendations, or new product capabilities.
- A missing monthly budget is distinct from a zero budget. When no budget exists, the overview emphasizes spending and presents a clear path to set a budget rather than showing a meaningless negative Safe to Spend value.
- The redesign may replace frontend structure, component composition, layout, styling, and motion, but may not change business logic or stored user data.
- Protect uncommitted work. Interface proposals do not grant permission to change cloud data, security, models or quotas; cloud changes, deployment and Git publication retain the project's separate approval requirements.
- Do not add charts or functionality that the current product does not already provide.

## Brand Commitments

The product name is Splitlie. Green remains the recognizable brand accent, but the user has explicitly rejected the previous frontend's visual templates and proportions. The new interface must not reuse the former dark hero card, oversized empty zones, card hierarchy, or page composition. Public marketing pages may use oversized typography to build brand presence.

## Evidence on Hand

- Existing working product and real data states in `src/`.
- Current capability and acceptance boundaries in `PROJECT_STATUS.md`, `docs/journey-sprints.md`, `docs/receipt-persistence-sprint.md`, and `docs/receipt-total-first.md`. UI captures, unit tests, synthetic model tests and real persistence tests prove different scopes and cannot substitute for one another.
- Product and implementation notes in `README.md`, `SPLITLIE_MASTER_PLAN.md`, `CURRENT_SPRINT.md`, and `RESEARCH_EVIDENCE.md`.
- User-supplied finance dashboard reference: `C:/Users/90919/AppData/Local/Temp/codex-clipboard-e94db083-3c6d-47e9-b2b8-7690b53e1c4a.jpg`.
- No verified testimonials, customer logos, benchmark claims, or pricing evidence are available and none may be invented.
- Redesign concepts may use clearly identified synthetic data. They must not imply new capabilities, perfect receipt accuracy, guaranteed response time, complete financial data, verified bank balances, or permanent free AI access.

## Product Principles

1. Make the current financial position understandable before asking for action.
2. Keep personal and shared money clearly separated while making switching effortless.
3. Show the reason behind every balance, budget, or settlement figure.
4. Preserve user trust through explicit states, reversible actions, and accurate calculations.
5. Reduce steps and preserve scannable information and task context between recording, review and source evidence; desktop and mobile deserve equally complete workflows.

## Accessibility & Inclusion

The product must remain keyboard navigable, use visible focus states, preserve semantic labels, support reduced motion, maintain readable contrast, and accommodate all five supported languages without clipped controls or broken layouts. Mobile web requires comfortably reachable actions and complete recovery paths rather than a compressed desktop layout. Loading, unknown, empty, error, conflict and saved states must remain distinguishable without relying on color alone.
