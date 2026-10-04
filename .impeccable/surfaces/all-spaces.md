# All Spaces

Route: `/spaces` · Mode: Operate

The user compares personal and shared spaces, then opens the right workspace. Preserve existing create/join, open/history, ordering and pin behavior.

Use the incumbent neutral-white, charcoal and lime brand. Ordinary cards are white with neutral rules, gray icon tiles and outlined open actions. The current space uses a subtle neutral surface with a lime icon tile and lime current-space action. Pin badges and controls stay neutral; pinned does not compete with current. No gradients, ornamental shadows or hover rotation.

Display actual active member counts, including the current user. Exclude departed memberships and unaccepted invitations. Personal spaces have one member. Two active members use the pair icon; three or more use the group icon; one uses the single-person icon. Unknown shared counts display a dash, never an invented number.

Counts are loaded in one permission-scoped membership query alongside per-user pin preferences. Do not modify database policies or expose profile details for this display.

Verified on 2026-10-03: real one/two-member spaces, desktop and 390px mobile, open-space navigation, restored original current space, secondary-text contrast above 5:1, clean console, 23 tests and production build. Three-or-more mapping and failed-read behavior verified by unit tests; no live memberships were changed.
