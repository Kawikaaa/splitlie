# Receipt total first: bounded design review

Date: 2026-11-02. Mode: Operate. Authority: `PRODUCT.md`, the incumbent authenticated UI, `.impeccable/surfaces/ai-assistant.md` and the user's confirmed total-first, item-details-on-demand workflow.

## Scope and disposition

Receipt entry now leads with the transaction total inside the existing transaction modal. Text entry and receipt photo are peer choices; optional item recognition follows the first usable transaction draft. This is a local extension of Splitlie's Geist, warm paper, charcoal, thin-rule and restrained-lime interface. It introduces no new visual world, raster artwork or token system. Weekly review is outside this round.

The fresh finish reviewer found no material fixes and returned **ship at the bounded UI scope**. That disposition covers the reviewed interaction hierarchy and responsive presentation. It does not approve model quality, persistence, cloud release or a financial end-to-end workflow. Models, quota and authentication remain unchanged.

## Implemented flow

| Stage | Local expression and trust boundary |
| --- | --- |
| Entry | Text and receipt-photo controls share the entry-method row. Photo entry explains that total recognition comes first and item details are optional. |
| Photo preparation | Choose image opens the file picker. The preview and provider/privacy copy precede the explicit Recognize total action. Rotation and crop are collapsed under Adjust image; choosing a file alone does not transmit it. |
| Summary draft | The existing form leads with the editable amount and currency, then merchant/description, category, date and account context. Defaults remain checkable; an unrecognized currency is identified as the form default. |
| Confirmation | Summary mode labels the final action Confirm and save. This is the confirmation; no extra summary checkbox is required and no automatic save occurs. |
| Receipt evidence | Summary review explicitly says the receipt total alone is recorded and item totals have not been reconciled. Source-image disclosure and duplicate links retain their evidence role; duplicate links open separately. |
| Optional detail | The optional disclosure explains the second image send to Alibaba Cloud Bailian and its longer wait. Only the explicit item-recognition action sends again. Cached item details can be reviewed without retransmission. The detail result does not overwrite the checked transaction amount. |
| Full review | The existing item fields, adjustment treatment, reconciliation states and detail confirmations remain available. Keep total only returns to summary mode. The previous P0 reconciliation contract applies to this full-detail path. |
| Unknown or failure | An unknown amount stays blank; summary save remains disabled until a valid positive amount is entered. Recognition failure/timeout retains the photo and manual-entry route. Cancellation invalidates late results. |

Sources compared: `src/components/TransactionModal.jsx`, `src/features/assistant/ReceiptEntry.jsx`, `ReceiptSummaryReview.jsx`, `ReceiptReview.jsx`, `Assistant.css` and `src/i18n/receiptFlowLocales.js`. The merge call in the modal keeps optional item recognition separate from amount-field updates; this source comparison does not establish real storage behavior.

## Layout and finish

The amount remains the strongest readable field. Desktop retains the familiar two-column category/date row and the modal's existing account field and footer. At phone width, fields stack and the footer presents Cancel beside Confirm and save. Chinese and Spanish phone captures show readable labels and wrapped supporting copy within the modal. The selected desktop captures show the same composition at 1280px and 1407px widths.

The entry-method row uses the incumbent quiet surface, active paper segment and charcoal text. Summary evidence uses a one-pixel rule and disclosures rather than another nested card. Actions and disclosure summaries retain 44px minimum targets; the source retains visible inset focus outlines. Assistant body text is 14px on desktop and 16px on mobile, with inherited 14px secondary text. These observations document this local expression and do not establish new global tokens or claim exhaustive keyboard/device coverage.

## Evidence checked

Evidence directory: `C:/Users/90919/Documents/Codex/style-unify-review/receipt-fast/` (outside the repository).

| Artifact | Checked scope |
| --- | --- |
| `photo-entry-desktop.png` | 1280×720; Chinese peer entry choices, total-first explanation, photo picker and Cancel footer before a photo is selected |
| `draft-desktop.png` | 1280×720; amount-first Chinese draft, merchant/description, category/date, account context and Confirm and save footer |
| `user-1407.png` | 1407×720; wider-desktop version of the same draft hierarchy |
| `draft-mobile.png` | 390×843; stacked Chinese draft with focused amount field and visible confirmation footer |
| `draft-mobile-es.png` | 390×843; Spanish labels, wrapped account/status copy and visible confirmation footer |
| `locales.json` | Recorded 390px draft checks for en-US, zh-CN, ja-JP, ko-KR and es-ES; amount 12.80 at 40px, translated confirmation labels and `overflow: false` for every language |
| `tests.log` | Recorded implementation test output; the implementation reports 155 passing tests with no failures |
| `detector.json` | One detector run: three advisory 14px type findings and one advisory 10px entry-method radius finding against the global specification |

The five images were inspected against the scoped sources. They use real components and CSS in a synthetic local harness with fake data/requests. Harness headings and the synthetic merchant are test content. The default draft captures stop above the lower receipt-evidence disclosures; their copy, optional second-send controls and full-detail return were compared in source, not visually certified by these five stills. No save was performed for these browser checks.

The implementation handoff reports a passing production build and 155 passing tests. This documentation pass inspected the recorded test artifact and did not rerun tests or the build. Five-locale no-overflow results are limited to the recorded 390px draft state; they are not full translation or every-state visual certification.

## Inherited documentation drift

Global documentation already differs internally: `DESIGN.md` frontmatter specifies Geist and 8px/12px control/card corners while older authenticated prose and `.impeccable/design.json` retain other font/radius descriptions. The detector also flags the local 14px assistant type and the entry-method row's 10px corner against the documented scales. These are advisory specification mismatches within the incumbent expression, not a mandate to redesign the modal.

This bounded round preserves that expression. `DESIGN.md` and `.impeccable/design.json` remain unchanged. The surface brief receives an appended dated record; all earlier history remains intact.

## Acceptance limits

This review establishes a concrete, reviewable total-first UI and records the finish disposition at that scope. Synthetic component checks do not establish camera capture, real model recognition, an authenticated Save/reopen/edit/delete cycle, receipt persistence, financial/account invariants or cloud acceptance. Those concerns retain their actual status in the implementation handoff. No model, quota, authentication or global visual-system change is authorized by this design verdict.
