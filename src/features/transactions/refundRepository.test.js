import test from 'node:test'
import assert from 'node:assert/strict'
import { refundRemaining, createRefundRepository } from './refundRepository.js'
import { refundLocales } from '../../i18n/refundLocales.js'

const original = { id: 'original', type: 'expense', payment_status: 'paid', amount: 100, currency: 'CNY' }
const refund = (id, amount) => ({ id, amount, currency: 'CNY', parent_transaction_id: 'original' })
test('refund cap uses original currency, excludes the edited refund and rejects malformed history', () => {
  assert.equal(refundRemaining(original, [refund('one', 20), refund('two', 30)]), 50)
  assert.equal(refundRemaining(original, [refund('one', 20), refund('two', 30)], 'two'), 80)
  assert.equal(refundRemaining(original, [refund('one', 100)]), 0)
  assert.equal(refundRemaining(original, [refund('one', 101)]), null)
  assert.equal(refundRemaining(original, [refund('one', 20), refund('one', 20)]), 80)
  assert.equal(refundRemaining(original, [refund('one', NaN)]), null)
  assert.equal(refundRemaining(original, [{ ...refund('one', 20), currency: 'USD' }]), null)
  assert.equal(refundRemaining({ ...original, amount: null }), null)
  assert.equal(refundRemaining({ ...original, amount: .3 }, [refund('one', .1), refund('two', .2)]), 0)
})
test('refund context scopes every read and never treats failed history as no refunds', async () => {
  const calls = []
  let fail = false
  const client = { from(table) {
    const chain = { single: async () => ({ data: original }), range: async () => fail ? { error: new Error('offline') } : { data: [refund('one', 20)] } }
    for (const method of ['select', 'eq', 'order']) chain[method] = (...args) => { calls.push([table, method, ...args]); return chain }
    return chain
  } }
  const repository = createRefundRepository(client)
  await assert.rejects(repository.context({}), /scope/)
  const context = await repository.context({ userId: 'owner', spaceId: 'personal', originalId: 'original' })
  assert.equal(refundRemaining(context.original, context.refunds), 80)
  assert.equal(calls.filter(call => call[1] === 'eq' && call[2] === 'space_id' && call[3] === 'personal').length, 2)
  assert.equal(calls.filter(call => call[1] === 'eq' && call[2] === 'created_by' && call[3] === 'owner').length, 2)
  fail = true
  await assert.rejects(repository.context({ userId: 'owner', spaceId: 'personal', originalId: 'original' }), /offline/)
})
test('refund copy has parity in all five locales', () => {
  for (const copy of Object.values(refundLocales)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(refundLocales.en).sort())
    for (const [key, message] of Object.entries(copy)) {
      assert.ok(message.trim())
      assert.deepEqual([...message.matchAll(/\{([^}]+)\}/g)].map(match => match[1]), [...refundLocales.en[key].matchAll(/\{([^}]+)\}/g)].map(match => match[1]))
    }
  }
})
