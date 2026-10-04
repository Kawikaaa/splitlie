import assert from 'node:assert/strict'
import test from 'node:test'

import { parseQuickTransaction } from './quickTransactionParser.js'

const options = { fallbackCurrency: 'USD', today: '2026-09-23' }

test('does not misclassify refunds or transfers before explicit entry is available', () => {
  for (const text of ['Amazon refund 30', '收到退款 30', 'transfer 100', 'reembolso 30', '返金 30', '환불 30']) {
    assert.deepEqual(parseQuickTransaction(text, options), { ok: false, reason: 'semanticTypeUnsupported' })
  }
})

test('parses decimal amount without treating it as a date', () => {
  const result = parseQuickTransaction('12.80', options)
  assert.equal(result.ok, true)
  assert.equal(result.amount, '12.8')
  assert.equal(result.date, '2026-09-23')
  assert.equal(result.needsReview, true)
})

test('parses Chinese merchant, category, currency and relative date', () => {
  const result = parseQuickTransaction('前天汉堡王30加元', options)
  assert.equal(result.ok, true)
  assert.equal(result.amount, '30')
  assert.equal(result.currency, 'CAD')
  assert.equal(result.category, 'Food')
  assert.equal(result.date, '2026-09-21')
  assert.equal(result.description, '汉堡王')
})

test('recognizes income separately from expenses', () => {
  const result = parseQuickTransaction('salary 2500 CAD today', options)
  assert.equal(result.type, 'income')
  assert.equal(result.category, 'Income')
  assert.equal(result.currency, 'CAD')
})
