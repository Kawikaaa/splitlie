# AI receipt and weekly review: local P0 design review

Date: 2026-11-01. Mode: Operate. Authority: `PRODUCT.md`, `.impeccable/surfaces/ai-assistant.md`, the existing authenticated UI and `docs/SPLITLIE_AI_RECEIPT_WEEKLY_REVIEW_CODEX_SPEC.md`.

## Scope and disposition

This round refines reliability and clarity inside the incumbent transaction and weekly recap surfaces. It preserves Splitlie's Geist type, warm paper surfaces, charcoal actions, thin rules, restrained green and existing modal behavior. There is no replacement identity, new page composition, global form restyle, new theme/token or decorative asset.

The initial finish review found the inherited system coherent except for a receipt remove-control clipping defect: a 44px control occupied a 40px grid track. The local correction uses 44px desktop and mobile tracks plus an explicitly scoped 44×44px receipt remove button. Final desktop and mobile captures show complete control borders with no regression identified from that fix. The fresh finish review's final disposition is **ship at the scored-fix scope**. It is approval of that correction, not approval of cloud deployment, model quality or financial end-to-end acceptance.

## Implemented local expression

| Area | Actual expression | Preserved contract |
| --- | --- | --- |
| Receipt entry | Existing secondary receipt action; privacy copy before sending; choose, rotate, crop, zoom, discard and resume controls | Manual entry stays available; source image is a temporary review aid; no automatic save |
| Receipt lifecycle | Entry remains mounted while detailed entry is active; inactive entry cancels transmission; request epochs reject stale results | Switching form does not silently discard the prepared image; late recognition cannot overwrite the current operation |
| Receipt review | Source image disclosure, duplicate links in a new tab, directly editable item name/quantity/line total, inline invalid-field messages and focus links | Existing detailed transaction fields and modal footer remain the primary transaction workflow |
| Amount reconciliation | Separate unknown/additional/included/not-applicable adjustment treatment; text states distinguish invalid, unverifiable, difference and balanced | Unknown is not zero; no fabricated balancing fee or automatic green success |
| Manual exception | Reason plus explicit unresolved-detail acknowledgement before the final context check | Invalid fields remain blocked; edits clear reviewed/exception confirmation |
| Weekly review | Week selector, dates/count/currency scope, recorded-only and matched-day copy, up to two evidence-backed observations, one optional action | Existing recap remains available and deterministic figures keep their role |
| Weekly recovery | Same-scope prior review retained with a clear notice; new action acceptance disabled for retained content; retry available | Failure does not present old advice as current or clear usable history |
| Recap comparison | `PersonalInsights` adds matched-day/baseline scope copy beside the existing comparison | No extra chart, card or primary navigation entry |

Sources compared: `src/features/assistant/ReceiptReview.jsx`, `ReceiptEntry.jsx`, `WeeklyAssistant.jsx`, `Assistant.css`, `receiptReconciliation.js`, `src/i18n/assistantReliabilityLocales.js`, the narrow receipt mount in `src/components/TransactionModal.jsx`, and the comparison scope in `src/features/insights/PersonalInsights.jsx`.

## Layout, type and interaction

Receipt item fields use a compact aligned desktop grid with an explicit 44px remove track. At 600px and below the item name spans the full row; quantity, line total and the remove control form the next row. Adjustment groups stack on phones. Controls use existing paper fields and modest corners, while rules separate review sections without additional nested cards.

The assistant stylesheet uses a 14px desktop base and 20px section titles. On mobile, body copy and editable inputs/selects use 16px; labels and secondary copy retain the incumbent 14px treatment. Text can wrap, controls retain minimum 44px height, and the locally scoped focus outline is inset to stay visible in the scrolling modal. The manual-exception checkbox receives a narrow receipt-specific rule to preserve its native 20px size in the existing modal form.

Weekly content uses open ruled rows, underlined evidence links and the incumbent quiet action surface. Goal and report basis move into a disclosure once a report exists. Mobile actions wrap, with the important observation and action copy readable without a horizontal table. Loading, unavailable, retained, invalid and reconciliation states are conveyed in text as well as semantic styling. Reliability copy is provided in English, Chinese, Japanese, Korean and Spanish; this is not a claim that every string/state combination received visual certification.

## Evidence

Evidence directory: `C:/Users/90919/Documents/Codex/style-unify-review/assistant-p0/` (outside the repository).

| Capture | Dimensions / scope |
| --- | --- |
| `receipt-desktop-final.png` | 1280×720; aligned receipt fields, focused name field, duplicate/source controls, modal footer and complete remove borders |
| `receipt-mobile.png` | 390×844; stacked item fields, full remove controls and reachable modal footer |
| `receipt-exception-mobile-final.png` | 390×843; unverifiable state, manual reason, both acknowledgements and footer |
| `weekly-desktop-full-final.png` | 1265px wide full page; week/scope, two observations, evidence, action and collapsed basis |
| `weekly-mobile-full-final.png` | 375px wide full page; same hierarchy with wrapped text/actions |
| `weekly-retained.png` | Supplemental recovery-state capture |

The final captures were compared against actual component structure and CSS. They use real components and real styling in a synthetic harness with in-memory fake requests. The harness makes no API, financial or model calls. Its test controls and synthetic heading are harness chrome, not proposed production UI. Captures are selected scrolled states/full pages, not proof of every keyboard, virtual-keyboard or long-list scenario.

Initial authenticated add-transaction and recap entrances were checked read-only before deployment. The older weekly facts contract correctly produced the waiting-for-server-update notice while regular recap stayed available. Here “v1” identifies that contract, not the deployed function version; the actual pre-deployment function was v5.

After the user separately approved only the `ai-assistant` deployment and read-only acceptance, the implementation session backed up actual cloud v5 and deployed v6 (ACTIVE). Its release record reports that all 10 deployed files match the local package after newline/BOM normalization. Read-only checks from the real logged-in page then succeeded for the default completed week, current week and another historical week, with the waiting notice gone and no JavaScript errors. See `docs/ai-assistant-p0-release-proposal.md`, `docs/ai-assistant-p0-reliability.md` and evidence `deployment-v6.json`. This documentation recheck compares those recorded results; it does not independently rerun cloud acceptance. No model calls, financial/goal/action writes, migrations, Secrets/quota changes, frontend release or Git operations were included in that deployment acceptance. Real generation and receipt persistence remain outside this evidence.

Recorded verification: `npm.cmd test` passed 147 tests with no failures; `npm.cmd run build` passed with the existing warning for a minified chunk over 500kB. Logs are `tests.log` and `build.log` in the evidence directory. These are the implementation session's recorded results, not tests rerun by this documentation pass.

The subsequent copy-only refinement keeps `assistantQuality` period-neutral, so completed-week views do not incorrectly imply the selected week may still be unfinished. `assistantStale` now explains that entries or review settings/rules can trigger regeneration. Both existing keys remain placeholder-free, with the same components and layout. The five-language source was rechecked; the post-deployment assistant test log records 35 passing tests, 0 failures (`assistant-after-deploy.log`). Existing final captures predate this copy refinement and remain evidence for the prior layout/clipping fix; this source-level copy check does not expand the visual ship verdict.

The design detector ran once and recorded two advisory `14px` typography findings in `detector.json`. They identify the inherited mismatch with the documented type ramp. They do not require a new global type system for this local extension. Final finish review and visible capture comparison resolve the scored clipping defect; they do not broaden the verification scope.

## Inherited documentation drift

`DESIGN.md` frontmatter already specifies Geist and 8px/12px control/card radii, while parts of its authenticated prose still name Inter/Segoe/Bahnschrift and 11px/16px radii. `.impeccable/design.json` also retains 11px/16px component examples and older authenticated narrative. The current product theme uses Geist and 8px/12px radius tokens. The 14px assistant/secondary-copy treatment also produces the two detector advisories against the global ramp.

These differences predate and exceed this surface refinement. `DESIGN.md` and `.impeccable/design.json` were compared only and remain unchanged. This document and the existing surface brief record the local implementation without registering a new global visual world or silently repairing unrelated drift.

## Acceptance limits

Local visual refinement and the scoped clipping correction are reviewable. The evidence does not replace the specification's 30-receipt model evaluation, an authenticated upload/recognize/edit/reconcile/save/reopen/edit/delete cycle, financial/account/refund invariants in a real independent test account, cross-user permission checks, deployed report invalidation/regeneration, or full five-language/keyboard/device coverage. Those requirements must retain their actual status in the main implementation handoff; synthetic visual success must not be reported as their completion.
