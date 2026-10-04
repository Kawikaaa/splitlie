import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSafeToSpend } from '../safeToSpend/calculateSafeToSpend.js'
import { buildPersonalAnalytics } from './personalAnalytics.js'
import { buildSignalEngine, SIGNAL_TYPES } from './signalEngine.js'
import { assessFinancialData } from '../financial/dataQuality.js'
import { calculateState, compareFinancialMutation, rememberFinancialChange, readFinancialChange, finishFinancialChange } from '../financial/financialChange.js'

const now = new Date('2026-10-04T12:00:00')
const context = { userId: 'user', spaceId: 'personal', currency: 'USD', month: '2026-10' }
const tx = (id, amount = 60, extra = {}) => ({ id, amount, type: 'expense', category: 'Food', currency: 'USD', transaction_date: '2026-10-02', ...extra })
const state = transactions => ({ transactions, budgets: [{ id: 'plan', category: '__TOTAL__', amount: 1000 }], fixedExpenses: [], fixedExpenseOccurrences: [] })
const resultFor = transactions => calculateState(state(transactions), context, now)
const qualityFor = (transactions, extra = {}) => assessFinancialData({ transactions, result: resultFor(transactions), now, ...extra })

test('entry freshness uses entry date, never certifies completeness', () => {
  const quality = qualityFor([tx('backdated', 10, { transaction_date: '2026-09-01', created_at: '2026-10-04T10:00:00' })])
  assert.equal(quality.state, 'recent_entry')
  assert.equal(quality.lastEntryDate, '2026-10-04')
  assert.equal(quality.completeness, 'not_verified')
  assert.equal(quality.recordedCount, 0)
})

test('five-day boundary, no records, invalid data and read failures are distinct', () => {
  assert.equal(qualityFor([tx('four', 10, { transaction_date: '2026-09-30' })]).state, 'recent_entry')
  assert.equal(qualityFor([tx('five', 10, { transaction_date: '2026-09-29' })]).state, 'stale')
  assert.equal(qualityFor([tx('transfer', 10, { type: 'transfer' })]).state, 'no_records')
  assert.equal(qualityFor([tx('future', 10, { transaction_date: '2026-11-01' })]).state, 'no_records')
  assert.equal(qualityFor([tx('pending', 10, { conversion_status: 'pending' })]).state, 'review_needed')
  assert.equal(qualityFor([], { loadFailed: true }).state, 'load_failed')
})

test('freshness counts calendar days across DST, not elapsed hours', () => {
  const quality = assessFinancialData({ transactions: [tx('dst', 10, { transaction_date: '2026-03-05' })], result: resultFor([]), now: new Date('2026-03-10T12:00:00') })
  assert.equal(quality.daysSinceEntry, 5)
})

test('insufficient history disables comparisons but preserves observed large purchases', () => {
  const transactions = [tx('purchase')]
  const analytics = buildPersonalAnalytics({ transactions, now })
  const engine = buildSignalEngine({ analytics, result: resultFor(transactions), quality: qualityFor(transactions), now })
  assert.ok(engine.signals.some(signal => signal.signalType === 'LARGE_PURCHASE'))
  assert.ok(!engine.signals.some(signal => ['CATEGORY_SPIKE', 'FREQUENCY_SPIKE'].includes(signal.signalType)))
  assert.ok(engine.unavailable.includes('comparative_history'))
})

test('useful signal types have deterministic metadata and curation caps at three', () => {
  const types = ['category_shift', 'large_purchase', 'frequency_change', 'small_purchase_accumulation']
  const analytics = { baseline: { ready: true }, signals: types.map((type, i) => ({ type, category: `category${i}`, currentValue: 50, baselineValue: 10, significance: 50 - i, timePeriod: { start: '2026-09-28', end: '2026-10-04' }, contributingTransactions: [], history: [] })) }
  const result = resultFor([tx('high', 500)])
  const engine = buildSignalEngine({ analytics, result, quality: qualityFor([tx('high', 500)]), upcomingBills: [{ id: 'bill', name: 'Phone', amount: 20, due_date: '2026-10-06' }], change: { month: result.month, planAmount: 1000, before: 600, after: result.safeToSpend, operation: 'transaction', contributingTransactions: [] }, now })
  for (const type of [...types, 'spending_pace', 'recurring_upcoming']) assert.ok(engine.signals.some(signal => signal.signalType === SIGNAL_TYPES[type]))
  assert.ok(!engine.signals.some(signal => signal.type === 'safe_to_spend_drop'))
  assert.equal(engine.worthNoticing.length, 3)
  assert.ok(engine.signals.every(signal => signal.metadata.completeness === 'not_verified' && signal.createdAt === now.toISOString()))
  assert.equal(engine.signals.find(signal => signal.type === 'recurring_upcoming').metadata.bills[0].dueDate, '2026-10-06')
})

test('ordinary arithmetic drops are never emitted, even with a valid before/after snapshot', () => {
  const transactions = [tx('purchase')]
  const result = resultFor(transactions)
  const engine = buildSignalEngine({ analytics: buildPersonalAnalytics({ transactions, now }), result, quality: qualityFor(transactions), change: { month: context.month, planAmount: 1000, before: 1000, after: 940, contributingTransactions: [{ id: 'purchase' }] }, now })
  assert.equal(engine.worthNoticing.filter(signal => signal.relatedTransactionIds.includes('purchase')).length, 1)
  assert.ok(!engine.signals.some(signal => signal.type === 'safe_to_spend_drop'))
  assert.ok(!engine.unavailable.includes('before_mutation_snapshot'))
})

test('drop snapshot is tied to the mutation, plan, period, user, space and latest ledger', () => {
  const before = state([]), after = state([tx('new')]), result = resultFor(after.transactions)
  const event = compareFinancialMutation(before, after, context, now, 'transaction', { id: 'new', amount: 60 })
  assert.equal(event.before, 1000)
  assert.equal(event.after, 940)
  rememberFinancialChange(event, context)
  assert.equal(readFinancialChange(context, after, result, now), event)
  assert.equal(readFinancialChange({ ...context, userId: 'other' }, after, result, now), null)
  assert.equal(readFinancialChange({ ...context, spaceId: 'other' }, after, result, now), null)
  assert.equal(readFinancialChange(context, after, result, new Date('2026-10-05T12:00:00')), null)
  assert.equal(readFinancialChange(context, state([tx('new'), tx('unrelated')]), result, now), null)
  assert.equal(readFinancialChange(context, after, { ...result, budgetAmount: 2000 }, now), null)
})

test('concurrent writes, plan changes, mismatched saved rows and unsupported operations reject attribution', () => {
  const before = state([]), after = state([tx('new')])
  assert.equal(compareFinancialMutation(before, state([tx('new'), tx('raced')]), context, now), null)
  assert.equal(compareFinancialMutation(before, { ...after, budgets: [{ category: '__TOTAL__', amount: 2000 }] }, context, now), null)
  assert.equal(compareFinancialMutation(before, after, context, now, 'transaction', { id: 'other' }), null)
  assert.equal(compareFinancialMutation(before, after, context, now, 'unknown'), null)
  assert.equal(compareFinancialMutation(before, { ...before, fixedExpenses: [{ id: 'unrelated', amount: 20, currency: 'USD' }] }, context, now, 'fixedExpense', { id: 'expected' }), null)
  assert.equal(compareFinancialMutation(null, after, context, now), null)
})

test('paying an already reserved recurring bill does not produce a drop', () => {
  const fixed = [{ id: 'phone', amount: 20, currency: 'USD' }]
  const before = { ...state([]), fixedExpenses: fixed }
  const after = { ...state([tx('paid', 20, { recurring_expense_id: 'phone' })]), fixedExpenses: fixed, fixedExpenseOccurrences: [{ id: 'occurrence', fixed_expense_id: 'phone', occurrence_month: '2026-10-01', status: 'paid' }] }
  const change = compareFinancialMutation(before, after, context, now, 'recurring', { fixedExpenseId: 'phone' })
  assert.equal(change.before, 980)
  assert.equal(change.after, 980)
  const result = calculateState(after, context, now)
  const engine = buildSignalEngine({ analytics: buildPersonalAnalytics({ transactions: after.transactions, now }), result, quality: qualityFor(after.transactions), change, now })
  assert.ok(!engine.signals.some(signal => signal.type === 'safe_to_spend_drop'))
})

test('income does not produce a drop; read failure suppresses all signals', () => {
  const transactions = [tx('income', 60, { type: 'income' })]
  const result = resultFor(transactions)
  const change = compareFinancialMutation(state([]), state(transactions), context, now)
  const engine = buildSignalEngine({ analytics: buildPersonalAnalytics({ transactions, now }), result, quality: qualityFor(transactions), change, now })
  assert.ok(!engine.signals.some(signal => signal.type === 'safe_to_spend_drop'))
  assert.deepEqual(buildSignalEngine({ analytics: {}, result, quality: { state: 'load_failed' }, now }).signals, [])
})

test('best-effort snapshot failure never throws and clears stale evidence', async () => {
  await assert.doesNotReject(finishFinancialChange(state([]), async () => { throw new Error('network') }, context))
  assert.equal(readFinancialChange(context, state([tx('new')]), resultFor([tx('new')]), now), null)
})
