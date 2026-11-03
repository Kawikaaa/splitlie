# Retired parser

The local source now returns HTTP 410 and makes no model calls. It must not be
re-enabled with the old refund-as-income prompt. The opt-in frontend uses the
separate [ai-transaction-draft](../ai-transaction-draft/README.md) endpoint.

This source change does not remove or redeploy any existing remote function.
