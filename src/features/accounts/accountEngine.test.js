import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAccountTotals, validateManualAccount, ACCOUNT_TYPES } from './accountEngine.js'
import { calculateSafeToSpend } from '../safeToSpend/calculateSafeToSpend.js'
import { loadAccountQuotes } from './accountQuotes.js'
import { createAccountRepository } from './accountRepository.js'
import { accountDraft, buildAccountChanges } from './accountFormState.js'
import { accountsLocales } from '../../i18n/accountsLocales.js'

test('metadata edits retain balance freshness; explicit confirmation writes even unchanged balance', () => {
  const original = row('bank', 428)
  const draft = accountDraft(original, 'USD')
  assert.deepEqual(buildAccountChanges({ ...draft, name: 'Renamed' }, original), { name: 'Renamed' })
  assert.deepEqual(buildAccountChanges(draft, original, true), { balance: 428 })
  assert.deepEqual(buildAccountChanges({ ...draft, balance: '429' }, original), { balance: 429 })
  assert.deepEqual(buildAccountChanges(draft, original), {})
  assert.deepEqual(buildAccountChanges({ ...draft, currency: 'JPY' }, original), { currency: 'JPY' })
  assert.equal(accountDraft(null, 'EUR').balance, '')
  assert.ok(validateManualAccount({ ...draft, balance: '0.00001' }).includes('invalid_account_precision'))
  assert.ok(validateManualAccount({ ...draft, balance: '1e-5' }).includes('invalid_account_precision'))
  assert.deepEqual(validateManualAccount({ ...draft, balance: '1.25000' }), [])
})

test('account copy has matching keys and interpolation tokens in all five locales', () => {
  const keys = Object.keys(accountsLocales.en).sort()
  const tokens = text => [...text.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
  for (const language of ['en', 'zh', 'ja', 'ko', 'es']) {
    assert.deepEqual(Object.keys(accountsLocales[language]).sort(), keys)
    for (const key of keys) assert.deepEqual(tokens(accountsLocales[language][key]), tokens(accountsLocales.en[key]))
  }
})

const now = new Date('2026-10-04T18:00:00Z')
const row = (id, balance, type = 'checking', extra = {}) => ({ id, name: id, type, balance, currency: 'USD', include_in_total: true, balance_source: 'manual', balance_updated_at: '2026-10-01T18:00:00Z', user_id: 'owner', space_id: 'personal', ...extra })
const totals = (accounts, options = {}) => calculateAccountTotals({ accounts, currency: 'USD', userId: 'owner', spaceId: 'personal', now, ...options })
const quote = { from_currency: 'CNY', to_currency: 'USD', rate: 0.14, rate_date: '2026-10-02', provider: 'test-fixture' }

test('asset total, card debt and net are distinct; credit never inflates available assets', () => {
  const result = totals([row('bank', 428), row('savings', 3700, 'savings'), row('cash', 300, 'cash'), row('card', 500, 'credit_card')])
  assert.equal(result.assetTotal, 4428)
  assert.equal(result.debtTotal, 500)
  assert.equal(result.netTotal, 3928)
  assert.equal(result.rows.at(-1).isDebt, true)
  assert.equal(totals([row('card', 500, 'credit_card')]).netTotal, -500)
})

test('exclusions, archives and identical duplicates never inflate totals', () => {
  const bank = row('bank', 100)
  assert.equal(totals([bank, bank, row('excluded', 500, 'savings', { include_in_total: false }), row('old', 999, 'cash', { archived_at: '2026-10-03T12:00:00Z' })]).assetTotal, 100)
  const conflict = totals([bank, { ...bank, balance: 200 }])
  assert.equal(conflict.assetTotal, null)
  assert.equal(conflict.issues[0].reason, 'conflicting_account_duplicate')
})

test('FX requires a directed, dated, attributed quote and preserves native balance', () => {
  const result = totals([row('wallet', 2140, 'digital_wallet', { currency: 'CNY' })], { quotes: [quote] })
  assert.equal(result.assetTotal, 299.6)
  assert.equal(result.rows[0].balance, 2140)
  assert.equal(result.rows[0].conversion.rate_date, '2026-10-02')
  assert.equal(result.estimated, true)
  assert.equal(totals([row('jpy', 100, 'cash', { currency: 'USD' })], { currency: 'JPY', quotes: [{ ...quote, from_currency: 'USD', to_currency: 'JPY', rate: 150.123 }] }).assetTotal, 15012)
})

test('missing/ambiguous/future/reversed FX never fabricates a full total', () => {
  const accounts = [row('bank', 100), row('wallet', 2140, 'digital_wallet', { currency: 'CNY' })]
  for (const quotes of [[], [{ ...quote, from_currency: 'USD', to_currency: 'CNY' }], [{ ...quote, provider: 'unknown' }], [{ ...quote, rate_date: '2026-10-05' }], [quote, { ...quote, rate: 0.15 }]]) {
    const result = totals(accounts, { quotes })
    assert.equal(result.assetTotal, null)
    assert.equal(result.netTotal, null)
    assert.equal(result.knownAssetSubtotal, 100)
  }
  const debtMissing = totals([row('bank', 100), row('card', 100, 'credit_card', { currency: 'CNY' })])
  assert.equal(debtMissing.assetTotal, 100)
  assert.equal(debtMissing.debtTotal, null)
  assert.equal(debtMissing.netTotal, null)
})

test('freshness belongs to the balance timestamp, not a metadata edit', () => {
  assert.equal(totals([row('bank', 100, 'checking', { updated_at: now.toISOString() })]).rows[0].balanceAgeDays, 3)
  assert.equal(totals([row('bank', 100, 'checking', { balance_updated_at: '2026-10-05T00:00:00Z' })]).assetTotal, null)
})

test('failed reads are unknown; no accounts is a genuine empty state', () => {
  assert.equal(totals([], { readFailed: true }).assetTotal, null)
  assert.equal(totals([]).state, 'empty')
  assert.equal(totals([]).assetTotal, 0)
})

test('all account types validate and malformed input/scope is rejected', () => {
  for (const type of ACCOUNT_TYPES) assert.deepEqual(validateManualAccount(row('valid', 0, type)), [])
  for (const balance of ['', ' ', null, false, NaN, Infinity, -1, 1e14]) assert.ok(validateManualAccount(row('bad', balance)).includes('invalid_account_balance'))
  assert.ok(validateManualAccount(row('bad', 1, 'crypto')).includes('invalid_account_type'))
  assert.equal(totals([row('foreign', 100, 'checking', { user_id: 'other' })]).netTotal, null)
})

test('account mutations cannot drive or double-count Safe to Spend', () => {
  const plan = { monthlyBudget: 1000, transactions: [], currency: 'USD', currentDate: new Date(2026, 9, 4, 12) }
  assert.equal(calculateSafeToSpend(plan).safeToSpend, 1000)
  assert.equal(calculateSafeToSpend({ ...plan, accounts: [row('bank', 999999)] }).safeToSpend, 1000)
  const accounts = [row('bank', 100)]
  const copy = structuredClone(accounts)
  totals(accounts)
  assert.deepEqual(accounts, copy)
})

test('FX adapter deduplicates currency requests, preserves provider dates and reports failures', async () => {
  const calls = []
  const accounts = [row('a', 10, 'cash', { currency: 'CNY' }), row('b', 20, 'cash', { currency: 'CNY' }), row('c', 10, 'cash', { currency: 'EUR' }), row('zero', 0, 'cash', { currency: 'CAD' })]
  const result = await loadAccountQuotes({ accounts, currency: 'USD', date: '2026-10-04', getRate: async request => {
    calls.push(request)
    if (request.fromCurrency === 'EUR') throw new Error('Offline')
    return { rate: 0.14, date: '2026-10-02', provider: 'test-fixture' }
  } })
  assert.equal(calls.length, 2)
  assert.equal(result.quotes[0].rate_date, '2026-10-02')
  assert.equal(result.issues[0].currency, 'EUR')
  assert.equal(totals(accounts, result).assetTotal, null)
})

function fakeClient(pages = [{ data: [], error: null }]) {
  const calls = []
  const query = {}
  for (const method of ['from', 'select', 'eq', 'is', 'order', 'insert', 'update']) query[method] = (...args) => { calls.push([method, ...args]); return query }
  query.range = async (...args) => { calls.push(['range', ...args]); return pages.shift() }
  query.single = async () => ({ data: { id: 'saved' }, error: null })
  return { client: query, calls }
}

test('repository scopes/paginates all reads and discards partial rows after read failure', async () => {
  const { client, calls } = fakeClient([{ data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })), error: null }, { data: null, error: { message: 'offline' } }])
  const result = await createAccountRepository(client).list({ userId: 'owner', spaceId: 'personal' })
  assert.equal(result.data, null)
  assert.deepEqual(calls.filter(call => call[0] === 'range'), [['range', 0, 999], ['range', 1000, 1999]])
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner'))
})

test('repository strips spoofed fields, protects versions and metadata-only freshness', async () => {
  const { client, calls } = fakeClient()
  const repo = createAccountRepository(client)
  await repo.create({ userId: 'owner', spaceId: 'personal', account: { ...row('new', 10), balance_source: 'synced', user_id: 'other', balance_updated_at: '2099-01-01T00:00:00Z' } })
  const written = calls.find(call => call[0] === 'insert')[1]
  assert.equal(written.user_id, 'owner')
  assert.equal(written.balance_source, undefined)
  assert.equal(written.balance_updated_at, undefined)
  await repo.update({ userId: 'owner', spaceId: 'personal', id: 'new', expectedUpdatedAt: now.toISOString(), changes: { name: 'Renamed' } })
  assert.deepEqual(calls.find(call => call[0] === 'update')[1], { name: 'Renamed' })
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'updated_at'))
  assert.throws(() => repo.update({ userId: 'owner', spaceId: 'personal', id: 'new', expectedUpdatedAt: now.toISOString(), changes: { balance_source: 'synced' } }))
  assert.throws(() => repo.update({ userId: 'owner', spaceId: 'personal', id: 'new', changes: { name: 'Lost update' } }))
})
