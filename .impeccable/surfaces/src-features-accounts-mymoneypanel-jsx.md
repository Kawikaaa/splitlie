---
version: 1
slug: "src-features-accounts-mymoneypanel-jsx"
primary_target: "src/features/accounts/MyMoneyPanel.jsx"
related_targets: ["src/features/accounts/AccountTransfers.jsx","src/features/accounts/TransferModal.jsx","src/features/accounts/Transfers.css"]
---

# Account transfers

Primary target: src/features/accounts/MyMoneyPanel.jsx
Related: AccountTransfers.jsx, TransferModal.jsx, Transfers.css
Mode: Operate. Local extension of the existing My Money surface.

## Direction contract

THESIS: Record movement between the owner's asset accounts with both amounts visible before saving. Keep transfers distinct from income and spending.

OWN-WORLD: Inherit the observed charcoal sidebar, off-white canvas, Geist, quiet rules and existing dark primary/white secondary controls. Preserve wallet cards, account detail and the three totals.

STORY: Choose source and destination, enter the amount sent and actual amount received for different currencies, review resulting balances, save. History supports correction and explicit reversal; failures retain input.

FIRST VIEWPORT: A compact transfer action joins Add account. A ruled history section follows the wallet. The focused modal uses stacked account selectors, paired amount fields and a subdued balance preview; mobile stacks fields and keeps actions reachable.

FORM: Existing-surface extension, no concept seed required. Reuse ModalSurface, account field grammar, Phosphor icons and five-language copy. No new animation library or page composition.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Constraints: same-currency equal amounts; cross-currency actual receipt; no credit cards, scheduling, implicit fees or model involvement. SQL tests roll back; browser tests do not save against real accounts.
