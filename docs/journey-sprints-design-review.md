# Personal journey sprints: bounded design review

Date: 2026-11-02. Mode: Operate. Authority: the incumbent authenticated interface, `PRODUCT.md` and `.impeccable/surfaces/ai-assistant.md`.

## Scope and disposition

Three local sprints connect personal transaction recovery, one selected-week recap and assistant, and transaction evidence with a return route. They preserve Splitlie's Geist, warm paper, charcoal actions, restrained lime and thin ruled separation. Existing surfaces carry the work; no new visual world or global token system is introduced.

The fresh finish reviewer (`journey_finish_reviewer`) returned **ship with no material fixes** at the scoped UI-evidence boundary. The disposition covers the reviewed presentation and local journey clarity. It is not independent certification of model quality, persistence, financial end-to-end behavior or cloud release. This documentation pass used source and existing local captures; it did not operate a browser or rerun the application.

## Implemented journey

| Sprint | Behavior grounded in source |
| --- | --- |
| Personal save and recovery | The modal initializes one operation ID for a transaction session and supplies that ID to personal creates, covering manual, text-AI and receipt entry. A submit guard prevents concurrent/repeated submission while pending or committed. Edits retain their existing update/concurrency path. Write failure returns to the editable form. |
| Committed result | After write success, `finishCommittedSave` awaits the refresh callback with an eight-second bound. A thrown or timed-out refresh leaves a saved result with the amount, optional description, plain-language explanation, Refresh list and Done. Refresh retries call the refresh lifecycle only; they do not call create/update. A successful refresh closes the modal. |
| One selected week | The recap's period selector supplies the week to WeeklyAssistant. `reviewSnapshotFacts` requires matching user, space, language and week plus valid weekly facts. Recap net spending, gross expenses, refunds, paid-expense count, category links, largest purchase and eligible matched-day comparison derive from that snapshot. Missing/invalid facts show loading or unavailable copy rather than zero spending. |
| Scoped failure | Assistant state is hidden immediately when its user/space/language/week scope differs. Same-scope content may remain after a failed read, with retained-summary/report copy; retained reports cannot accept a new action. Retry reads again. The failure phone capture shows no amount, explicit unavailable-summary copy and a lower retry action. |
| Evidence and return | Links include from/through dates and `basis=spending`, with applicable category, largest-entry or refund filters and review context. Transactions applies normalized paid expense/refund semantics and exclusions, exposes scope and Clear filters, and offers a return link only when the personal-space week/range context validates. Invalid filters receive status copy; a space change clears source filters. |

Sources compared: `src/components/TransactionModal.jsx`, `src/features/transactions/personalSaveLifecycle.js`, `src/features/insights/PersonalInsights.jsx`, `src/features/insights/reviewNavigation.js`, `src/features/assistant/WeeklyAssistant.jsx`, `src/features/assistant/Assistant.css`, `src/pages/Transactions.jsx` and `src/i18n/journeyLocales.js`. Source comparison establishes the local implementation contract, not the behavior of an independently exercised production database or model.

## Layout and local expression

The recap leads with the week selector and date range, followed by one strong tabular net-spending figure. Expenses and refunds form subordinate totals; recorded count and evidence access follow. Recent history remains collapsed behind a text disclosure, with categories in aligned ruled rows. The phone layout wraps long supporting copy and keeps the value/category hierarchy readable. The Spanish capture shows the same hierarchy with translated labels.

WeeklyAssistant continues below the recap with a one-pixel rule and the incumbent compact goal fields, report evidence and consent controls. It does not create another dashboard inside the recap. The top-of-dialog success stills stop before this lower assistant content; its shared-week connection, report states and evidence behavior were checked in source, not visually certified by those stills.

The committed-save result reuses the existing modal heading, close control, paper surface and footer. The saved amount remains prominent at 32px; explanatory copy clearly distinguishes a committed record from an unavailable list refresh. Desktop recovery actions sit at the right of the footer; phone actions share the row with the primary Done action receiving more width. No editable form or second Save action remains in that result state.

The evidence page adds a restrained top rule and contextual text above the existing Transactions header and filters. Its desktop capture shows the return link and Clear filters beside the date scope, while retaining the existing navigation, list and amount alignment.

Scoped CSS uses 14px desktop assistant copy, 16px mobile body/inputs, 14px secondary labels, 18px weekly totals and a 32px recovery value. It retains warm surface variables, thin rules, 44px action/disclosure targets and inset focus outlines. These observations describe the local expression; they do not redefine the global type or radius scales or establish exhaustive keyboard/device coverage.

## Evidence inspected

Artifacts reside outside the repository at `C:/Users/90919/Documents/Codex/style-unify-review/journey-sprints/`.

| Artifact | Reviewed scope |
| --- | --- |
| `weekly-desktop.png` | 1280×720; Chinese selected-week dialog, net/gross/refund hierarchy, count, evidence access, matched-day comparison and beginning of category rows |
| `weekly-mobile.png` | 390×843; Chinese recap, wrapping scope/comparison copy, category rows and start of largest-purchase section |
| `weekly-mobile-es.png` | 390×843; Spanish version of the same selected-week hierarchy and category rows |
| `weekly-failure-mobile.png` | 390×843; unavailable recap without fabricated totals, ruled assistant continuation, goal controls, error copy and retry |
| `save-recovery-desktop.png` | 1280×720; saved title, amount, refresh-failure explanation and Refresh list/Done footer |
| `save-recovery-mobile.png` | 390×843; wrapped recovery copy and both actions within the modal width |
| `evidence-desktop.png` | 1280×720; recorded date scope, return and clear actions above the incumbent Transactions list, using a read-only dedicated test identity |
| `evidence-mobile.png` | 390×843; genuine Transactions component with a synthetic nonexistent space and empty read result; responsive date scope and return/clear controls only, not persistence evidence |
| `detector.json` | Seven advisory findings in `Assistant.css`: 14px, 18px and 32px type steps, plus the inherited 10px entry-method radius, outside the recorded global scale |
| `tests.log` | Recorded suite summaries total 182 tests and 182 passes, with zero failures |
| `build.log` | Final passing production build; main JavaScript chunk 572.85 kB with the existing warning for chunks over 500 kB |

Phone stills were captured from a 390×844 viewport and are 390×843 images. Weekly and save captures render genuine components and CSS with synthetic in-memory requests. The evidence desktop is a read-only authenticated view, and its entries are different data from the synthetic recap; it is not a numeric reconciliation comparison. No model call or ledger write occurred during this browser evidence round.

The implementation handoff reports phone DOM checks in English, Chinese, Japanese, Korean and Spanish with no horizontal overflow. That result is limited to the recorded checked states and viewport; it is not every-state translation certification. Chinese/Spanish stills and the five-language source strings were checked here. The documentation pass read the test/build artifacts but did not rerun them. Any subsequent nonvisual callback verification is tracked in the implementation handoff.

## Preserved system and drift

`DESIGN.md` and `.impeccable/design.json` remain unchanged. The former's frontmatter/brand-alignment text records Geist and 8px/12px controls/cards while older authenticated prose retains other family, radius and type descriptions; the sidecar also carries older descriptions and values. This is inherited documentation drift, not a new-world decision.

The seven detector results are advisory specification mismatches, not newly approved global tokens. The existing 10px entry-method corner and local 14px/18px/32px text treatments are recorded without promoting them into reusable system rules. No inherited font/radius/ramp mismatch, legacy eyebrow or other craft-floor exception is canonized or repaired by this surface documentation.

## Acceptance limits

This record establishes a reviewable local UI journey and preserves the finish verdict at its actual scope. Synthetic requests and still captures do not independently demonstrate database idempotency under network ambiguity, actual committed persistence, production refresh/reopen/edit/delete behavior, real model output or financial/account invariants. Read-only evidence navigation does not certify a financial end-to-end flow. Model, quota, authentication, backend release and deployment acceptance retain their separate status in the implementation handoff.

Supplemental finish review also returned `disposition: ship` for the corrected phone evidence context bar: its date scope and return/clear actions fit without horizontal overflow. The default App save callback was subsequently source-checked and built: personal saves verify a read before page invalidation, propagating failure to the committed-result lifecycle. This is not independent browser verification of a real post-write network failure.
