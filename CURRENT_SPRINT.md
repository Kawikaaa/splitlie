# Current Sprint — Personal Space V2 Prototype

## Scope

Build a coherent, testable Personal Space V2 before interviews. Every new surface is an **unvalidated solution hypothesis**; the prototype is designed to generate evidence, not to imply product-market fit.

## Implemented scope

- [x] Foundation fixes and deterministic parser/analytics tests.
- [x] Quick Add with progressive disclosure, reversible details, bilingual voice entry, smart defaults, merchant-history learning, and Add Again.
- [x] Dashboard V2 hierarchy, Weekly Recap, spending breakdown, and deterministic Money Signals.
- [x] Lightweight Weekly Check-in and Monthly Reflection stored locally for prototype testing.
- [x] English/Chinese copy and responsive layouts.
- [x] Shared Space behavior preserved and isolated from Personal-only modules.

## Explicitly deferred

- Plaid or bank linking, receipt OCR, paid LLM parsing, and Shared Space expansion.
- Server persistence for check-ins/reflections until research validates the habit loop.

## Verification notes — 2026-09-23

- Confirmed Personal suggestions are ranked from existing transaction history.
- Confirmed Add Again prefilled amount, merchant, category, currency, and today's date without saving a test transaction.
- Confirmed amount-only `12.80` plus one suggested-category selection produces a ready-to-save transaction dated today.
- Fixed an acceptance-test regression where `12.80` could be misread as an invalid `12.80` calendar date.
- Confirmed More details → Hide details is reversible.
- Confirmed English and Chinese labels render.
- Confirmed Shared Space does not render Personal smart-default/repeat modules and its existing transaction form remains available.
- No database migration or RLS change was required.

## Success criteria

- A common expense can be entered with amount, suggested category, and Save in no more than three deliberate actions after opening the modal.
- A recent transaction can be repeated with one selection plus Save.
- Advanced fields remain available but are not visually dominant.
- No Shared Space behavior or database permissions regress.
- No paid model is called.

## Schema / RLS impact

None. Existing RLS-protected transaction and budget rows provide the data. Prototype reflection state uses namespaced `localStorage`; if validated, move it to a user-owned table with explicit RLS.

## Test plan

- Test amount-only entry with a suggested category.
- Test repeating a recent transaction and confirm today's date.
- Test More details → Hide details round trip.
- Test Personal and Shared transaction modals separately.
- Test English and Chinese labels on desktop and mobile widths.

## V2 hardening — 2026-09-25

- [x] Safe to Spend moved to the top of Personal Overview; Budget summary remains near the bottom.
- [x] Fixed local-month handling in Safe to Spend to avoid UTC month-boundary errors.
- [x] Excluded inactive fixed expenses from Due Soon.
- [x] Added explicit budget load/save/delete error states and busy states.
- [x] Added an in-app confirmation dialog before permanent fixed-expense deletion.
- [x] Localized the public product landing page and added EN/中文 switching.
- [x] Expanded deterministic coverage to eight parser, analytics, Safe to Spend, and recurring-bill tests.
- [x] Completed the live desktop/mobile browser pass with no saved synthetic financial data.
