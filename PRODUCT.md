# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Splitlie serves individuals who want a clear personal money overview and people who occasionally need to track shared expenses with partners, friends, family, or housemates. The primary job is to understand what has been spent, what remains safe to spend, what is owed, and what needs attention without doing manual reconciliation.

## Product Purpose

Splitlie combines a personal ledger, monthly budget awareness, recurring expenses, multi-currency recording, and shared-expense settlement in one place. Success means a user can open the product and quickly understand their current financial position, add or review transactions, and resolve shared balances with confidence.

## Positioning

The product keeps personal money private by default and connects it to shared expenses only when money actually becomes shared. Its distinctive mechanism is the coexistence of Personal Spaces and Shared Spaces, with each transaction retaining payer, participants, split method, currency context, and settlement state.

## Operating Context

Users return throughout the month to add income or expenses, review recent activity, set or adjust a monthly budget, manage recurring bills, inspect spending signals, switch between spaces, invite members, and settle balances. The interface supports English and Chinese and must remain understandable across desktop and mobile web.

## Capabilities and Constraints

- Preserve the existing React, Vite, Supabase, React Router, and deployed data model.
- Preserve every existing route, authentication flow, Google sign-in capability, transaction workflow, personal and shared space workflow, budget calculation, Safe to Spend logic, recurring expense behavior, multi-currency behavior, avatar workflow, invitations, permissions, and settlements.
- Preserve real product copy and real application states. Do not fabricate customers, performance claims, financial recommendations, or new product capabilities.
- A missing monthly budget is distinct from a zero budget. When no budget exists, the overview emphasizes spending and presents a clear path to set a budget rather than showing a meaningless negative Safe to Spend value.
- The redesign may replace frontend structure, component composition, layout, styling, and motion, but may not change business logic or stored user data.
- Do not add charts or functionality that the current product does not already provide.

## Brand Commitments

The product name is Splitlie. Green remains the recognizable brand accent, but the user has explicitly rejected the previous frontend's visual templates and proportions. The new interface must not reuse the former dark hero card, oversized empty zones, card hierarchy, or page composition. Public marketing pages may use oversized typography to build brand presence.

## Evidence on Hand

- Existing working product and real data states in `src/`.
- Product and implementation notes in `README.md`, `SPLITLIE_MASTER_PLAN.md`, `CURRENT_SPRINT.md`, and `RESEARCH_EVIDENCE.md`.
- User-supplied finance dashboard reference: `C:/Users/90919/AppData/Local/Temp/codex-clipboard-e94db083-3c6d-47e9-b2b8-7690b53e1c4a.jpg`.
- No verified testimonials, customer logos, benchmark claims, or pricing evidence are available and none may be invented.

## Product Principles

1. Make the current financial position understandable before asking for action.
2. Keep personal and shared money clearly separated while making switching effortless.
3. Show the reason behind every balance, budget, or settlement figure.
4. Preserve user trust through explicit states, reversible actions, and accurate calculations.
5. Keep dense financial information scannable without hiding important context.

## Accessibility & Inclusion

The product must remain keyboard navigable, use visible focus states, preserve semantic labels, support reduced motion, maintain readable contrast, and accommodate English and Chinese copy without clipped controls or broken layouts.
