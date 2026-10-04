# Landing-to-product brand alignment

Scope: /welcome plus the shared visual layer for login, signup, overview, transactions, budget, spaces, settings and legal pages. No business logic, data mutation, new features or deployment.

The accepted concept is retained in five visible relationships: pale-gray opening band, white feature section, compact lime footer, charcoal financial preview, open Swiss-style typography with fine rules. The canvas is intentionally #f7f7f3 to match the product rather than the slightly cooler generated preview. Existing copy and illustrative-value labels are preserved. Display sizing stays confined to the landing page.

Audit findings resolved: warm card whites vs neutral landing white; inconsistent radii (6/11/16/28px); unrelated square-S authentication mark; artificial uppercase product titles; heavy authentication/legal elevation. Shared controls now use 8px radii, cards 12px, white surfaces, Geist and one ring mark with surface-appropriate contrast. The functional sidebar, financial card sizes and form structures are preserved.

Verification: production build and 16 tests passed. Desktop real-content pages inspected: overview, transactions, budget, spaces, settings, login, signup and transaction modal. Mobile 390px captures checked for landing, signup and settings; no horizontal overflow. Desktop signup remained one viewport tall. Modal opened and cancelled without saving data. Authentication submissions, financial edits and uploads were not exercised.

Static detector emitted legacy style-token advisories across the large existing theme. This is not a zero-warning full CSS refactor; untouched per-component type sizes and status colors remain. The high-priority brand inconsistencies above were checked against actual browser renders rather than treating every inherited literal as a defect.
