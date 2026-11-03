import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createAiParserHandler, readAiConfig } from '../../../supabase/functions/ai-transaction-draft/handler.js'
import { validateAiDraft, blockedIntent, calendarDate } from '../../../supabase/functions/ai-transaction-draft/contract.js'
import { parseAiTransaction } from './aiTransactionService.js'
import { aiLocales } from '../../i18n/aiLocales.js'

const input = { version: 1, consent: true, text: 'lunch 18 USD', today: '2026-11-01', language: 'en', fallbackCurrency: 'USD', spaceId: '00000000-0000-0000-0000-000000000001' }
const draft = { kind: 'expense', amount: 18, currency: 'USD', category: 'Food', description: 'Lunch', date: input.today }
const config = { AI_PARSER_ENABLED: 'true', AI_FREE_QUOTA_CONFIRMED: 'true', DASHSCOPE_API_KEY: 'fake-test-only', BAILIAN_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }
const request = (body = input, headers = {}) => new Request('https://example.test/parse', { method: 'POST', headers: { Authorization: 'Bearer fake-test-only', ...headers }, body: JSON.stringify(body) })
function fixture(overrides = {}) {
  const calls = []
  const handler = createAiParserHandler({ env: name => config[name], authenticate: async () => ({ id: 'user-1' }), reserveQuota: async () => true,
    fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(draft) } }] })) }, ...overrides })
  return { handler, calls }
}

test('Bailian is disabled until both flags, a key and an allowed HTTPS endpoint exist', () => {
  assert.equal(readAiConfig(() => undefined), null)
  assert.equal(readAiConfig(name => name === 'AI_FREE_QUOTA_CONFIRMED' ? 'false' : config[name]), null)
  for (const base of ['http://dashscope.aliyuncs.com/compatible-mode/v1', 'https://evil.example/compatible-mode/v1', 'https://dashscope.aliyuncs.com.evil.test/compatible-mode/v1', 'https://dashscope.aliyuncs.com/compatible-mode/v1?key=x']) {
    assert.equal(readAiConfig(name => name === 'BAILIAN_BASE_URL' ? base : config[name]), null)
  }
  assert.equal(readAiConfig(name => config[name]).model, 'qwen3.8-flash')
  assert.equal(readAiConfig(name => name === 'AI_PARSER_MODEL' ? 'qwen3.7-plus' : config[name]).model, 'qwen3.7-plus')
})

test('one authenticated request yields a review-only draft; no history is sent upstream', async () => {
  const { handler, calls } = fixture()
  const result = await handler(request({ ...input, balance: 999, ledger: ['secret'], model: 'attacker' }))
  assert.equal(result.status, 200)
  assert.equal((await result.json()).version, 1)
  assert.equal(calls.length, 1)
  const body = JSON.parse(calls[0].options.body)
  assert.equal(body.model, 'qwen3.8-flash')
  assert.equal(body.enable_thinking, false)
  assert.equal(body.max_tokens, 450)
  assert.equal(body.messages[1].content, input.text)
  assert.ok(!JSON.stringify(body).includes('secret'))
  assert.ok(!JSON.stringify(body).includes(input.spaceId))
  assert.equal(validateAiDraft(draft, input).needsReview, true)
})

test('authentication, consent, input limits and calendar validation precede inference', async () => {
  for (const body of [{ ...input, consent: false }, { ...input, version: 0 }, { ...input, text: 'a'.repeat(301) }, { ...input, today: '2026-02-30' }, { ...input, language: 'xx' }, { ...input, fallbackCurrency: 'XXX' }, null]) {
    const { handler, calls } = fixture()
    assert.equal((await handler(request(body))).status, 400)
    assert.equal(calls.length, 0)
  }
  const { handler, calls } = fixture({ authenticate: async () => null })
  assert.equal((await handler(request())).status, 401)
  assert.equal(calls.length, 0)
})

test('large/chunked payloads, invalid JSON and unauthenticated calls fail closed', async () => {
  const { handler, calls } = fixture()
  assert.equal((await handler(request({ ...input, extra: 'x'.repeat(5000) }))).status, 413)
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer fake' }, body: '{' }))).status, 400)
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', body: '{}' }))).status, 401)
  assert.equal(calls.length, 0)
})

test('refunds, transfers and multiple amounts do not reach a provider', async () => {
  for (const text of ['refund 18', '退款18', '返金18', '환불18', 'transferencia 18', '还款18', 'lunch 18 and coffee 5']) {
    const { handler, calls } = fixture()
    assert.equal((await handler(request({ ...input, text }))).status, 422)
    assert.equal(calls.length, 0)
  }
  assert.ok(blockedIntent('credit card repayment 18'))
})

test('quota failure, missing configuration and quota-store exceptions never make upstream calls', async () => {
  for (const override of [{ reserveQuota: async () => false }, { reserveQuota: async () => { throw Error('secret DB error') } }, { env: () => undefined }]) {
    const { handler, calls } = fixture(override)
    assert.ok((await handler(request())).status >= 400)
    assert.equal(calls.length, 0)
  }
})

test('provider failure never leaks error bodies or retries a paid fallback', async () => {
  for (const status of [401, 403, 429, 500]) {
    let count = 0
    const reports = []
    const { handler } = fixture({ reportProviderFailure: (...args) => reports.push(args), fetchImpl: async () => { count++; return new Response('private-key-and-prompt', { status }) } })
    const response = await handler(request())
    assert.ok(response.status >= 400)
    assert.ok(!(await response.text()).includes('private'))
    assert.equal(count, 1)
    assert.deepEqual(reports, [[status]])
  }
})

test('invalid/truncated/fabricated/extra-field model responses are not adopted', async () => {
  const invalid = [ { ...draft, amount: '18' }, { ...draft, amount: 19 }, { ...draft, currency: 'CAD' }, { ...draft, date: '2026-02-30' }, { ...draft, category: 'Income' }, { ...draft, kind: 'refund' }, { ...draft, account_id: 'invented' }, { ...draft, description: '<script>' } ]
  for (const output of invalid) assert.equal(validateAiDraft(output, input), null)
  for (const completion of [{ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(draft) } }] }, { choices: [{ finish_reason: 'stop', message: { content: '```json {} ```' } }] }]) {
    const { handler } = fixture({ fetchImpl: async () => new Response(JSON.stringify(completion)) })
    assert.equal((await handler(request())).status, 502)
  }
  assert.equal(calendarDate('2028-02-29'), true)
  assert.equal(calendarDate('2026-02-29'), false)
})

test('missing amount stays empty, and unknown dates remain human-review defaults', () => {
  const result = validateAiDraft({ ...draft, amount: null, date: null }, { ...input, text: 'Lunch' })
  assert.equal(result.amount, '')
  assert.equal(result.date, input.today)
  assert.equal(result.needsReview, true)
  assert.equal(validateAiDraft(draft, { ...input, text: 'Lunch' }), null)
})

test('explicit currencies and relative dates cannot be overwritten', () => {
  for (const text of ['lunch18CAD', '午餐十八加元']) assert.equal(validateAiDraft(draft, { ...input, text }), null)
  assert.equal(validateAiDraft(draft, { ...input, text: 'yesterday lunch 18 USD' }), null)
  assert.equal(validateAiDraft({ ...draft, date: '2026-10-31' }, { ...input, text: '昨天午餐18美元' }).date, '2026-10-31')
})

test('five-language synthetic protocol fixtures stay review-only, not a live model accuracy claim', () => {
  for (const [language, text] of [['en', 'Lunch 18 USD'], ['zh', '午餐18 USD'], ['ja', '昼食18 USD'], ['ko', '점심18 USD'], ['es', 'Almuerzo 18 USD']]) {
    assert.equal(validateAiDraft(draft, { ...input, text, language }).source, 'ai')
  }
})

test('client requires per-request consent, handles sanitized errors and revalidates envelopes', async () => {
  let count = 0
  const invoke = async () => { count++; return { data: { version: 1, draft } } }
  const options = { ...input, invoke }
  assert.equal((await parseAiTransaction(input.text, { ...options, consent: false })).code, 'CONSENT_REQUIRED')
  assert.equal(count, 0)
  assert.equal((await parseAiTransaction(input.text, options)).needsReview, true)
  assert.equal((await parseAiTransaction(input.text, { ...options, invoke: async () => ({ error: { context: new Response(JSON.stringify({ code: 'NOT_CONFIGURED' })) } }) })).code, 'NOT_CONFIGURED')
  assert.equal((await parseAiTransaction(input.text, { ...options, invoke: async () => ({ data: { version: 0, draft } }) })).code, 'INVALID_OUTPUT')
  assert.equal((await parseAiTransaction(input.text, { ...options, invoke: async () => { throw Error('offline') } })).code, 'UNAVAILABLE')
  const controller = new AbortController(); controller.abort()
  const beforeAbort = count
  assert.equal((await parseAiTransaction(input.text, { ...options, signal: controller.signal })).code, 'TIMEOUT')
  assert.equal(count, beforeAbort)
})

test('cancellation during inference discards the result even if the transport returns late', async () => {
  const controller = new AbortController()
  let resolve
  const pending = parseAiTransaction(input.text, { ...input, signal: controller.signal,
    invoke: () => new Promise(done => { resolve = done }) })
  controller.abort()
  resolve({ data: { version: 1, draft } })
  assert.equal((await pending).ok, false)
})

test('AI translations have identical keys and placeholder tokens in all five languages', () => {
  for (const language of ['en', 'zh', 'ja', 'ko', 'es']) {
    assert.deepEqual(Object.keys(aiLocales[language]).sort(), Object.keys(aiLocales.en).sort())
    for (const [key, text] of Object.entries(aiLocales[language])) {
      assert.ok(text.trim())
      assert.deepEqual(text.match(/\{\w+\}/g), aiLocales.en[key].match(/\{\w+\}/g))
    }
  }
})

test('quota proposal is service-only, invoker, scoped and does not write ledger data', () => {
  const sql = readFileSync(new URL('../../../supabase/proposed/ai_parser_quota.sql', import.meta.url), 'utf8')
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /security invoker set search_path = ''/i)
  assert.match(sql, /grant execute.*to service_role/i)
  assert.match(sql, /created_by = p_user_id and type = 'personal'/)
  assert.match(sql, /for update/i)
  assert.doesNotMatch(sql, /(?:insert into|update|delete from) public\.(transactions|financial_accounts|budgets)/i)
})
