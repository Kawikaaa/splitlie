# AI transaction drafts — Bailian pilot

Status (2026-11-01): deployed to the existing Splitlie project, JWT verification
enabled, quota migrations applied, dedicated Beijing key stored only in Supabase
Secrets, and the bounded pilot enabled with explicit user approval. Repository
defaults remain disabled. The first real browser draft flow passed with synthetic
text. This is not a full accuracy, cloud-concurrency or quota-exhaustion certification.

## Current pilot evidence

- Console: Beijing, qwen3.8-flash, 1M/1M free tokens before tests, expiry 2027-01-30;
  Free Quota Only is ON. We did not exhaust the provider quota to force a 403.
- Provider key permits only Qwen3.8-Flash. Base URL was copied from its workspace's
  Beijing OpenAI-compatible endpoint. No key is stored in this repository.
- Applied remote migrations: `20261101064930_ai_parser_quota` and
  `20261101065449_ai_parser_scope_permissions`; local files mirror those versions.
  The latter grants service_role SELECT of only spaces(id, created_by, type),
  needed by the invoker RPC on this existing project. Client grants are unchanged.
- `../../proposed/ai_parser_quota_acceptance.sql` passed in a rolled-back
  transaction while the pilot was OFF: RLS/grants, denied foreign scopes, first
  reservation, cooldown, user/global caps, previous-day isolation and service role.
  Separate actual anon/authenticated role calls to the table/RPC were denied.
  Concurrent sessions and an actual midnight transition remain untested.
- Gateway checks: OPTIONS 200; missing/invalid JWT 401; public anon key alone 401.
- Browser: five synthetic inputs (Chinese lunch, English yesterday/CAD bus,
  Japanese lunch, Korean salary, Spanish yesterday/CAD bus) returned review-only
  drafts with expected amount/currency/category/date. All used Chinese UI; this
  proves multilingual input smoke coverage, not all five UI locale flows. Some
  descriptions retained source-language/date words rather than the requested
  Chinese concise text: this quality gap remains for evaluation.
  No transaction was saved. A provider configuration failure retained the input,
  then the corrected configuration succeeded. A refund input was rejected before
  inference. At 390x844 there was no horizontal overflow and actions remained
  visible; the draft was cancelled and the default viewport restored afterward.
- First secret was rotated after a page-state tool unexpectedly exposed it.
  Only the replacement key was configured; browser clipboard was cleared.
- Provider diagnostics record HTTP status only, never bodies, headers or text.
  Existing database advisory warnings remain outside this release; the quota
  table's RLS-without-policies INFO reflects intentional client denial.
- `evaluation-cases.json` contains 25 synthetic cases, five per input language.
  Do not claim the full set passed until results are recorded. Respect production
  limits; do not raise quota caps merely to finish evaluation in one day.

To pause inference, replace `AI_PARSER_ENABLED` with `false` in Supabase Edge
Function Secrets. Leave the key and free-quota protection in place; no database
rollback or deletion is required. Keep the local parser available.

## Boundary

This is **not** the old `parse-transaction` endpoint. The frontend only calls
`ai-transaction-draft`, so an older deployed parser cannot receive new consent
requests and accidentally send them to its former OpenAI/DeepSeek provider.
The old parser's local source now returns RETIRED; existing remote deployments
are not changed by editing this repository. Retire the old remote function in a
separate, reviewed release if it still exists.

- Manual/local autofill remains the default and requires no model service.
- Explicit confirmation is required for every AI request. No persistent opt-in.
- A user JWT is verified with `getUser`; quota reservation checks personal-space
  ownership. Shared-space AI and existing-transaction AI editing are not exposed.
- Only text (at most 300 characters), local today, language and default currency
  go to Bailian. The space ID stays in the application backend for authorization.
  No account balances, ledger history, email, profile or Supabase user ID is sent
  upstream. Input/output text is not logged or stored by this application.
- AI JSON is checked both server-side and client-side. Invalid fields, extra keys,
  calendar dates, incompatible categories and obvious numeric/currency/date
  conflicts are rejected. Missing amount stays empty. Every accepted result opens
  detailed entry as an unconfirmed draft. No accounting write is made by this API.
- Refunds/transfers/repayments and multiple amounts are rejected or sent to manual
  review. Heuristics and prompts are not a guarantee of semantic accuracy: user
  review and business validation remain mandatory.
- Errors retain text, do not adopt partial results, and never retry a paid model.
  Provider timeout is 12s; browser timeout 15s; output is capped at 450 tokens.
- No SDK dependency was added. The provider adapter is isolated in handler.js;
  the model is a server setting. OpenRouter is **not implemented** as a fallback.

## Activation checklist — do not skip

1. Confirm domestic/international account, actual remaining quota, expiry and the
   region in the Bailian console. The model and endpoint/key region must match.
2. Enable **Free Quota Only / 免费额度用完即停** for the exact model and wait for the
   setting to take effect. Check provider privacy/data processing terms before
   using personal financial text. A boolean in this app cannot enforce Alibaba
   billing: `AI_FREE_QUOTA_CONFIRMED=true` records this operator check, not an
   automated verification. Do not set it until the console configuration is verified.
3. Review and test `../../proposed/ai_parser_quota.sql` in an approved test database.
   It creates an RLS-protected, service-only quota table and SECURITY INVOKER RPC;
   no ledger/account/budget rows are modified. Rollback instructions are in that file.
   Test owner/shared/foreign scope rejection, unauthorized direct calls, atomic
   concurrent reservations, 20-second cooldown, 10/user/day, 50/global/day and
   UTC rollover. SQL string assertions are **not** database acceptance.
4. Store the values from `.env.example` in server secrets, not frontend `.env`.
   `BAILIAN_BASE_URL` must be an allowed HTTPS `/compatible-mode/v1` endpoint.
   New workspace domains and legacy DashScope domains are supported. No arbitrary
   provider URL is accepted. Leave `AI_PARSER_ENABLED=false` during deployment.
5. Deploy the **new** `ai-transaction-draft` function with JWT verification enabled.
   Do not add `--no-verify-jwt`. Verify current CLI options before running commands.
6. With permission to send synthetic text to the configured service, enable the
   pilot, run real samples, inspect quota counters, then test failure/manual recovery.
   Requests are charged to local counters before inference; provider failures count.
   A missing or unavailable quota store blocks inference. No background AI calls.
7. Confirm privacy disclosure, scoped rate limits, mobile/keyboard behavior and
   reviewed database advisors before sharing the pilot with other people.

## Evaluation gate before real use

Start with 25 synthetic cases (five per supported language) within available free
quota, and compare against local parsing before expanding. Cover relative dates,
explicit currency, decimal amounts, number words, missing fields, multiple entries,
refund/transfer/repayment, prompt injection and invalid JSON. Log only synthetic
case IDs, model/config version, field accuracy, correction count, latency and usage;
do not store real user text. Do not claim improved accuracy until measured.

Changing model requires rechecking its availability, free quota/stop switch,
response-format compatibility, privacy terms and this evaluation gate. It is not
enough to change an identifier. Replacing the provider needs a new adapter and an
updated user disclosure; it does not require changing the accounting engine.

## Verification

`npm.cmd test` includes offline handler/contract/client/locale tests with injected
responses. `npm.cmd run build` verifies frontend bundling. Deno/cloud packaging,
quota SQL behavior, multi-session concurrency, live provider errors and real-model
quality require the activation checks above; mock responses do not prove them.

## Official references checked 2026-11-01

- [Bailian endpoints / region-bound keys](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)
- [JSON output](https://help.aliyun.com/zh/model-studio/qwen-structured-output)
- [Free quota and stop switch](https://help.aliyun.com/zh/model-studio/new-free-quota)
- [Supabase function authentication](https://supabase.com/docs/guides/functions/auth)

The Supabase markdown changelog could not be fetched; the HTML changelog was
reviewed instead. No database version upgrade or Auth configuration was performed.
