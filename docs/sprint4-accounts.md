# Sprint 4 — Accounts / My Money

## Confirmed rules

- Manual balances are independent snapshots. Transaction entry never mutates them.
- Positive credit-card balances mean outstanding debt, not available credit.
- Display asset total, card debt and net separately. Account balances do not drive Safe-to-Spend; the existing spending-plan-first engine stays unchanged.
- Each account retains its native currency. Display conversions require directed, dated, attributed quotes from the existing FX service and are estimates, never claimed live bank balances.
- An unavailable conversion makes the affected total incomplete/null. Known subtotals remain labeled as partial; missing debt conversion also prevents a full net total.

## Foundation delivered

`accountEngine.js` supports checking, savings, cash, credit card, campus card, digital wallet and other. Validation rejects missing/negative/non-finite balances, invalid type/currency, malformed names and timestamps. Duplicate IDs count once, conflicting duplicate data requires review. Excluded/archived accounts do not affect totals. Read failures are unknown, not an empty zero balance. Balance age is exposed without inventing a product-defined stale threshold.

`accountQuotes.js` adapts the existing exchange-rate contract via injection, requests each included foreign currency once and preserves the provider's actual rate date. It has no fallback or invented rate. `accountRepository.js` provides scoped, paginated reads and explicit creation/update/archive/restore operations. Updates require the last observed `updated_at` as optimistic-lock evidence; stale writes return an error instead of silently overwriting another session. Metadata-only updates omit balance/currency so they do not certify old balances as fresh. Balance reconfirmation sends balance even if unchanged.

Remote migration `manual_financial_accounts_foundation` adds only `public.financial_accounts` plus two non-exposed security-invoker timestamp triggers. Owner-only personal-space RLS, explicit column grants and no DELETE permission protect the records. The server supplies creation/update/balance-confirmation times; clients cannot spoof timestamps, owner, space or manual/synced provenance. Archive is recoverable. Only manual sources may be persisted today; the normalized account contract supports later synced sources without a parallel calculation engine. Provider-specific fields/integration are intentionally deferred.

No old transactions, plans, recurring records, Shared Space accounting or Auth behavior were changed. SQL snapshots and repeatable acceptance queries are in `supabase/proposed/sprint4_manual_accounts.sql` and `sprint4_accounts_acceptance.sql`. Test fixture writes were rolled back and no real account rows were created.

## Verification and remaining scope

Unit tests cover assets/debt/net, negative net, exclusions/archives/duplicates, missing/reversed/ambiguous/future FX, currency rounding, balance freshness, failed reads, account ownership scope, adapter failure, repository pagination and optimistic update filters, and unchanged Safe-to-Spend. Rolled-back authenticated DB acceptance covers owner access, blocked shared-space insertion, foreign read/write/insert denial, malformed balances (including NaN), archive/restore, deletion denial, timestamp spoofing denial, and unchanged balance time on rename.

The My Money UI is now connected in Personal Overview between record-quality information and Spending Pace. It provides asset/debt/net summaries, dated and attributed FX estimates, manual confirmation timestamps, inclusion controls, inline create/edit forms, recoverable archive/restore and explicit stale-version reload. Missing data is never shown as a zero balance. Renaming omits balance fields; explicit confirmation sends an unchanged balance. Editing prevents background retry from unmounting and losing a draft. All account copy exists in English, Chinese, Japanese, Korean and Spanish, with automated key/token parity checks.

Browser/IAB QA verified the actual authenticated empty state, form opening/cancellation/reopening, all type options, credit-card debt wording, currency selection, inclusion checkbox and negative-balance browser validation without submitting real financial data. Desktop 1440×900, tablet 1024×900 / 768×1024 and mobile 390×844 had no horizontal document overflow; the form becomes one column on mobile. Console warning/error capture was empty in this pass. Thirteen account tests, the full regression suite and production build pass. CRUD storage and ownership are covered by the rolled-back DB acceptance described above, not by a real user-account browser save. Remaining acceptance: persisted-row browser edit/archive/restore and a live two-session conflict scenario, using approved disposable data or the user's own first account. Freshness displays the exact confirmation timestamp; no arbitrary stale threshold was introduced. Negative non-card balances/overdrafts and overpaid-card credits still need a separately confirmed semantic rule. No frontend production deployment.

## Design fidelity ledger

### Interactive wallet iteration

User reference: local video `D:/xwechat_files/wxid_6nxgw2xnli7s12_4475/msg/video/2026-10/56dcd7844c340e690676d9673ea53308_raw.mp4`; inspected contact sheet `C:/Users/90919/Documents/Codex/style-unify-review/account-video-contact.png`. Implemented the requested stacked-wallet selection relationship, not a pixel clone. Reference card-number, payment-network, expiration and cardholder fields are deliberately omitted because the product does not store them. Individual native balances are on the cards; aggregate assets remain below and do not change with selection. Card debt and net stay separate. No transaction-linked deduction implementation or balance mutation is included in this UI iteration.

Build Web Apps and Impeccable governed hierarchy, incumbent palette, responsive spacing, icons and feedback; GSAP React provides a scoped, interruptible 420ms decelerating stack switch with unmount cleanup and a live reduced-motion preference listener. No new application package was installed. Five comparison points inspected: overlapping card anatomy; front-card native balance/name; aggregate numeric position below the stack; restrained charcoal/gray/lime palette instead of the reference rainbow; maintained edit/archive and mobile stacking. Exposed back-card name clipping was corrected. Existing hero and navigation copy remain unchanged; account total label and FX attribution wording were intentionally clarified.

Browser/IAB verification at the default desktop viewport, 1440×900 and 390×844: next/previous, fast repeated switching, exposed-card click, arrow-key selection with focus continuity, edit opening/cancel, preserved total across selections, no horizontal overflow and empty warning/error console. No saves or account mutations were submitted. Full regression tests and production build pass. Reduced-motion path was inspected in code, not exercised by changing the OS preference; more-than-four and extreme-name/balance browser fixtures remain untested. Latest rendered screenshots `wallet-final-desktop.png` and `wallet-final-mobile.png` in the same review directory were inspected with `view_image` alongside the video reference. The requested visual relationship is verified with the intentional field/palette differences above.

This is a functional extension of the existing visual system, not a new redesign or generated concept. Accepted incumbent evidence: `C:/Users/90919/Documents/Codex/style-unify-review/sprint4-before.png`. Render evidence: `sprint4-after.png`, `sprint4-form-1440.png`, `sprint4-form-390.png` in the same directory. Browser screenshots and `view_image` inspection covered the incumbent and latest implementation.

- Palette: existing charcoal navigation, off-white canvas and white panels retained; no competing accent or gradient.
- Hierarchy: Safe to Spend remains dominant. My Money uses the incumbent section-heading scale (computed 23px), not another hero metric.
- Container/spacing: one existing panel, open summary/list structure, 24px form grouping; no nested account cards or modal.
- Typography: existing Geist retained; input text explicitly 15px; money uses tabular figures and wraps rather than overflowing.
- Icons: existing Phosphor Wallet/Plus/PencilSimple/RotateCcw family; no substituted emoji or heavy edit glyph.
- Responsive: two form columns at 1440/1024/768, one at 390; no horizontal overflow at these tested widths.
- States: instructional empty state, muted skeleton respecting reduced motion, error/retry, disabled saves, recoverable archive and version-conflict messaging.

Intentional copy addition: approved account workflow/trust labels in the new module only. Existing hero, navigation, CTA labels and section ordering relative to one another were unchanged; the only new insertion is My Money. No illustration is needed for this data-entry module. Checkbox inherited decoration was removed during QA. The new module was visually verified against the incumbent design; populated-row and error-state screenshot comparisons remain part of the acceptance noted above, so no claim of full Sprint 4 completion is made.

Security advisor reports no account-table/function warning. Existing unrelated warnings remain for [mutable trigger search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous callable privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated callable privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Those Auth/Shared Space functions are not changed as a side effect of this sprint.
