# Database snapshots

`20260915-pre-hardening-live-public-schema.json` is the read-only metadata export
captured from the live Supabase `public` schema before the two 2026-09-15 security
hardening scripts were applied.

The snapshot includes columns, constraints, indexes, functions, policies, and
triggers. It contains schema metadata only, not user or transaction rows.

The two subsequent manually applied changes are recorded in:

- `../proposed/20260915_security_hardening.sql`
- `../proposed/20260915_active_membership_hardening.sql`

Despite the legacy `proposed` directory name, both files are marked as manually
applied in their headers. Do not rerun them blindly. A future Supabase CLI baseline
should reconcile these files with migration history before automated deployment.

`20260915-post-hardening-live-public-schema.json` is the fresh metadata export
captured after both scripts were applied and verified. It is the current reference
snapshot for the linked project's `public` schema. Its SHA-256 digest is:

`B8ADE1690FA63B64F9F3676A2D49139C4BB6B3E66764E04B7DE110FBA4A6C402`
