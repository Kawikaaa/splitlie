import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPersonalAnalytics } from './personalAnalytics.js'

const expense = (date, amount, category, extra = {}) => ({
  id: `${date}-${amount}-${category}`, type: 'expense', payment_status: 'paid', transaction_date: date,
  amount, base_amount: amount, currency: 'USD', base_currency: 'USD', category, description: category, ...extra,
})

test('builds weekly totals and category breakdown from paid expenses', () => {
  const result = buildPersonalAnalytics({
    now: new Date('2026-09-23T12:00:00'),
    transactions: [expense('2026-09-22', 25, 'Food'), expense('2026-09-21', 10, 'Transportation'), expense('2026-09-15', 20, 'Food'), { ...expense('2026-09-22', 99, 'Shopping'), payment_status: 'upcoming' }],
  })
  assert.equal(result.weekly.total, 35)
  assert.equal(result.weekly.previousTotal, 20)
  assert.deepEqual(result.categoryBreakdown[0], { category: 'Food', amount: 45 })
})

test('requires two historical weeks before comparative signals', () => {
  const result = buildPersonalAnalytics({ now: new Date('2026-09-23T12:00:00'), transactions: [expense('2026-09-22', 80, 'Food'), expense('2026-09-15', 20, 'Food')] })
  assert.equal(result.baseline.ready, false)
  assert.ok(result.signals.every(signal => !['category_shift', 'positive_signal', 'frequency_change'].includes(signal.type)))
  assert.ok(result.signals.some(signal => signal.type === 'large_purchase'))
})

test('generates structured deterministic category, frequency and purchase signals', () => {
  const result = buildPersonalAnalytics({
    now: new Date('2026-09-23T12:00:00'),
    transactions: [
      expense('2026-09-22', 80, 'Food', { description: 'Dinner' }), expense('2026-09-21', 8, 'Food'), expense('2026-09-21', 7, 'Food'), expense('2026-09-21', 6, 'Food'),
      expense('2026-09-15', 20, 'Food'), expense('2026-09-08', 24, 'Food'), expense('2026-09-01', 22, 'Food'),
    ],
  })
  assert.equal(result.baseline.ready, true)
  assert.ok(result.signals.some((item) => item.type === 'category_shift' && item.category === 'Food'))
  assert.ok(result.signals.some((item) => item.type === 'frequency_change' && item.transactionCount === 4))
  assert.ok(result.signals.some((item) => item.type === 'large_purchase' && item.contributingTransactions[0].description === 'Dinner'))
  assert.ok(result.signals.every((item) => Object.hasOwn(item, 'baselineValue') && Object.hasOwn(item, 'significance')))
})

test('surfaces positive category changes', () => {
  const result = buildPersonalAnalytics({
    now: new Date('2026-09-23T12:00:00'),
    transactions: [expense('2026-09-22', 12, 'Shopping'), expense('2026-09-15', 50, 'Shopping'), expense('2026-09-08', 44, 'Shopping'), expense('2026-09-01', 48, 'Shopping')],
  })
  const signal = result.signals.find((item) => item.type === 'positive_signal')
  assert.ok(signal)
  assert.equal(signal.direction, 'lower')
  assert.ok(signal.absoluteChange < 0)
})
