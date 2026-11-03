import test from 'node:test'
import assert from 'node:assert/strict'
import { transferUnits, transferAccounts, previewTransfer, validTransferDate, transferError } from './transferEngine.js'
import { createTransferRepository } from './transferRepository.js'
import { transferLocales } from '../../i18n/transferLocales.js'
import { calculateAccountTotals } from './accountEngine.js'

const account = (id, balance, currency = 'USD', extra = {}) => ({ id, name: id, type: 'checking', balance, currency, balance_source: 'manual', user_id: 'u', space_id: 's', include_in_total: true, balance_updated_at: '2026-10-31T00:00:00Z', ...extra })
const accounts = [account('a', 100), account('b', 20), account('c', 0, 'CNY')]
const input = { accounts, sourceId: 'a', targetId: 'b', sourceAmount: '10', targetAmount: '999' }
const original = { id: 't', status: 'completed', source_account_id: 'a', target_account_id: 'b', source_amount: 10, target_amount: 10 }

test('decimal units reject rounding, signs, blanks, infinity and excessive precision', () => {
  assert.equal(transferUnits('0.0001'), 1n)
  assert.equal(transferUnits('99999999999999.9999'), 999999999999999999n)
  for (const value of ['', ' ', null, true, '-1', '1e2', '1.00001', Infinity, NaN, '100000000000000']) assert.equal(transferUnits(value), null)
})
test('same currency transfers conserve assets and use one exact amount', () => {
  const result = previewTransfer(input)
  assert.equal(result.received, 10)
  assert.equal(result.balances.get('a'), 90)
  assert.equal(result.balances.get('b'), 30)
  const before = calculateAccountTotals({ accounts: accounts.slice(0, 2), currency: 'USD', now: '2026-11-01' })
  const after = calculateAccountTotals({ accounts: accounts.slice(0, 2).map(a => ({ ...a, balance: result.balances.get(a.id) })), currency: 'USD', now: '2026-11-01' })
  assert.equal(after.assetTotal, before.assetTotal)
  assert.equal(after.debtTotal, before.debtTotal)
})
test('cross currency transfers require actual receipt and never infer FX', () => {
  assert.equal(previewTransfer({ ...input, targetId: 'c', targetAmount: '' }).error, 'transferInvalidAmount')
  const result = previewTransfer({ ...input, targetId: 'c', targetAmount: '71.23' })
  assert.equal(result.balances.get('a'), 90)
  assert.equal(result.balances.get('c'), 71.23)
})
test('edit and reversal apply only the net delta and refuse unavailable received funds', () => {
  const moved = [account('a', 90), account('b', 30), accounts[2]]
  const edited = previewTransfer({ ...input, accounts: moved, sourceAmount: 15, original })
  assert.equal(edited.balances.get('a'), 85)
  assert.equal(edited.balances.get('b'), 35)
  const cancelled = previewTransfer({ ...input, accounts: moved, original, cancel: true })
  assert.equal(cancelled.balances.get('a'), 100)
  assert.equal(cancelled.balances.get('b'), 20)
  assert.equal(previewTransfer({ ...input, accounts: [moved[0], account('b', 5)], original, cancel: true }).error, 'transferInsufficient')
  assert.equal(previewTransfer({ ...input, accounts: moved, sourceId: 'b', targetId: 'a', sourceAmount: 5, original }).balances.get('b'), 15)
})
test('account scope, archive, credit cards and insufficient balances block previews', () => {
  assert.equal(previewTransfer({ ...input, targetId: 'a' }).error, 'transferChooseAccounts')
  for (const extra of [{ type: 'credit_card' }, { user_id: 'other' }, { space_id: 'other' }, { balance_source: 'synced' }]) assert.equal(previewTransfer({ ...input, accounts: [accounts[0], account('b', 20, 'USD', extra)] }).error, 'transferChooseAccounts')
  assert.equal(previewTransfer({ ...input, sourceAmount: 101 }).error, 'transferInsufficient')
  assert.equal(previewTransfer({ ...input, accounts: [accounts[0], account('b', 20, 'USD', { archived_at: '2026-11-01' })] }).error, 'transferArchived')
  assert.equal(transferAccounts([accounts[0], account('d', 20, 'USD', { type: 'credit_card' })]).length, 1)
  assert.equal(validTransferDate('2026-02-30'), false)
  assert.equal(validTransferDate('2026-11-02', '2026-11-01'), false)
  assert.equal(validTransferDate('2026-10-31', '2026-11-01'), true)
})
test('replacing both transfer accounts previews reversal and reapplication across four accounts', () => {
  const result = previewTransfer({ accounts: [account('a',90),account('b',30),account('c',100),account('d',40)], sourceId:'c', targetId:'d', sourceAmount:10, original })
  assert.deepEqual([...result.balances], [['a',100],['b',20],['c',90],['d',50]])
})
test('repository scopes all operations, refuses injected writes, and recovers idempotent retries', async () => {
  const calls = []
  const draft = { source_account_id: 'a', target_account_id: 'b', source_amount: 10, target_amount: 10, source_currency: 'USD', target_currency: 'USD', source_version: 'v1', target_version: 'v2', transfer_date: '2026-11-01', note: '' }
  let inserted = false
  const client = { from(table) {
    assert.equal(table, 'account_transfers')
    let kind = 'select'
    const q = { single: async () => kind === 'insert' ? { error: { code: 'P0001', message: 'TRANSFER_CONFLICT' } } : { data: { ...draft, status: 'completed', id: 't' }, error: null }, limit: async () => ({ data: [], error: null }) }
    for (const method of ['select','eq','order','or','insert','update']) q[method] = (...args) => { calls.push([method, ...args]); if (method === 'insert') { inserted = true; kind = 'insert' } return q }
    return q
  } }
  const repository = createTransferRepository(client)
  await assert.rejects(repository.list({}), /scope/)
  await assert.rejects(repository.save({ userId: 'u', spaceId: 's', id: 't', draft: { ...draft, balance: 99 } }), /payload/)
  const response = await repository.save({ userId: 'u', spaceId: 's', id: 't', draft })
  assert.equal(response.data.id, 't')
  assert.equal(inserted, true)
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'user_id' && c[2] === 'u'))
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'space_id' && c[2] === 's'))
  await repository.cancel({ userId: 'u', spaceId: 's', id: 't', expectedUpdatedAt: 'latest' })
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'updated_at' && c[2] === 'latest'))
  assert.deepEqual(calls.find(c => c[0] === 'update')[1], { status: 'cancelled' })
})
test('five locale dictionaries have matching keys and interpolation, and errors are actionable', () => {
  for (const copy of Object.values(transferLocales)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(transferLocales.en).sort())
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value.trim())
      assert.deepEqual([...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...transferLocales.en[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort())
    }
  }
  assert.equal(transferError({ message: 'TRANSFER_INSUFFICIENT' }), 'transferInsufficient')
  assert.equal(transferError({ code: 'PGRST116' }), 'transferConflict')
  assert.equal(transferError({ code: 'PGRST205' }), 'transferNotReady')
})
