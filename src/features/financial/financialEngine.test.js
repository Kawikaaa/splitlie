import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSafeToSpend } from '../safeToSpend/calculateSafeToSpend.js'
import { summarizeFinancialTransactions, normalizeFinancialTransactions } from './transactionSemantics.js'
import { buildPersonalAnalytics } from '../insights/personalAnalytics.js'
import { financialLocales } from '../../i18n/financialLocales.js'
import { parseTransactionText } from '../transactions/transactionTextService.js'

const expense = (id, amount, transaction_date = '2026-10-02', extra = {}) => ({ id, amount, transaction_date, type: 'expense', currency: 'USD', category: 'Food', ...extra })
const calculate = options => calculateSafeToSpend({ monthlyBudget: 1000, currentDate: new Date('2026-10-14T12:00:00'), ...options })

test('refunds reduce received-month spending, inherit original category, and never create income', () => {
  const transactions = [expense('original', 100, '2026-09-20'), expense('purchase', 50),
    expense('refund', 30, '2026-10-03', { type: 'refund', parent_transaction_id: 'original', category: 'Income' })]
  assert.equal(summarizeFinancialTransactions(transactions, { month: '2026-09' }).expenses, 100)
  const october = summarizeFinancialTransactions(transactions, { month: '2026-10' })
  assert.equal(october.expenses, 20)
  assert.equal(october.income, 0)
  assert.equal(october.net, -20)
  assert.equal(calculate({ transactions }).safeToSpend, 980)
  const analytics = buildPersonalAnalytics({ transactions, now: new Date('2026-10-04T12:00:00') })
  assert.equal(analytics.currentMonthTotal, 20)
  assert.equal(analytics.weekly.total, 20)
  assert.deepEqual(analytics.categoryBreakdown, [{ category: 'Food', amount: 20 }])
})

test('transfers, credit-card payments, exclusions, duplicates and unconverted rows do not inflate totals', () => {
  const transactions = [expense('one', 20), expense('one', 20), expense('transfer', 200, undefined, { type: 'transfer' }),
    expense('cc', 200, undefined, { type: 'credit_card_payment' }), expense('excluded', 50, undefined, { is_excluded_from_spending: true }),
    expense('fx', 50, undefined, { conversion_status: 'pending' }), expense('income', 70, undefined, { type: 'income' })]
  const totals = summarizeFinancialTransactions(transactions)
  assert.equal(totals.expenses, 20)
  assert.equal(totals.income, 70)
  assert.equal(totals.net, 50)
  assert.equal(totals.issues.length, 1)
})

test('a refund-only received month keeps signed spending and net without counting income or rewriting the original', () => {
  const transactions = [expense('original', 100, '2026-09-20', { space_id: 'personal' }),
    expense('refund', 30, '2026-10-03', { space_id: 'personal', type: 'refund', parent_transaction_id: 'original', payment_status: 'paid' })]
  const september = summarizeFinancialTransactions(transactions, { month: '2026-09', currency: 'USD' })
  const october = summarizeFinancialTransactions(transactions, { month: '2026-10', currency: 'USD' })
  assert.equal(september.expenses, 100)
  assert.equal(october.expenses, -30)
  assert.equal(october.income, 0)
  assert.equal(october.net, 30)
  assert.equal(calculate({ transactions }).safeToSpend, 1030)
  const analytics = buildPersonalAnalytics({ transactions, now: new Date('2026-10-04T12:00:00') })
  assert.deepEqual(analytics.categoryBreakdown, [{ category: 'Food', amount: -30 }])
  assert.equal(analytics.weekly.total, -30)
})

test('paid or skipped occurrences resolve only their month; linked recurring transactions are counted once', () => {
  const fixedExpenses = [{ id: 'rent', amount: 100, currency: 'USD' }, { id: 'phone', amount: 20, currency: 'USD' }, { id: 'old', amount: 10, currency: 'USD' }]
  const result = calculate({ fixedExpenses, transactions: [expense('rent-tx', 100, undefined, { recurring_expense_id: 'rent' })],
    fixedExpenseOccurrences: [{ fixed_expense_id: 'phone', status: 'skipped', occurrence_month: '2026-10-01' }, { fixed_expense_id: 'old', status: 'paid', occurrence_month: '2026-09-01' }] })
  assert.equal(result.spentAmount, 100)
  assert.equal(result.obligationAmount, 10)
  assert.equal(result.safeToSpend, 890)
})

test('an upcoming transaction linked to a recurring item reserves its value only once', () => {
  const result = calculate({ fixedExpenses: [{ id: 'rent', amount: 100 }],
    transactions: [expense('pending', 100, '2026-10-20', { payment_status: 'upcoming', recurring_expense_id: 'rent' })] })
  assert.equal(result.fixedAmount, 0)
  assert.equal(result.upcomingAmount, 100)
  assert.equal(result.safeToSpend, 900)
})

test('explanation is the exact calculation; goals and buffer require explicit opt-in', () => {
  const options = { transactions: [expense('paid', 514), expense('next', 80, '2026-10-20', { payment_status: 'upcoming' })],
    goalReserves: [{ amount: 70, currency: 'USD', include_in_safe_to_spend: true }, { amount: 300, currency: 'USD' }], safetyBuffer: { amount: 50, enabled: true } }
  const result = calculate(options)
  assert.equal(result.safeToSpend, 286)
  assert.equal(result.breakdown.reduce((sum, row) => sum + row.amount, 0), 286)
  assert.equal(calculate({ ...options, goalReserves: [], safetyBuffer: { amount: 50 } }).safeToSpend, 406)
})

test('pace is based on incurred spending, not reservations, and handles no/zero plan and negative availability', () => {
  const result = calculate({ transactions: [expense('spent', 580)], fixedExpenses: [{ id: 'future', amount: 100 }] })
  assert.equal(result.pace.elapsedDays, 14)
  assert.equal(result.pace.remainingDays, 17)
  assert.equal(result.pace.planUsage, 0.58)
  assert.equal(result.pace.status, 'faster')
  assert.equal(result.pace.currentDailyPace, 41.43)
  assert.equal(result.pace.comfortableDailyPace, 18.82)
  assert.equal(calculate({ hasPlan: false }).pace.comfortableDailyPace, null)
  assert.equal(calculate({ monthlyBudget: 0 }).pace.status, 'zero_plan')
  assert.equal(calculate({ monthlyBudget: 10, transactions: [expense('spent', 20)] }).pace.comfortableDailyPace, null)
})

test('past, future, leap-year and last-day periods have deterministic pace boundaries', () => {
  const past = calculate({ periodMonth: '2024-02' }).pace
  assert.equal(past.daysInPeriod, 29)
  assert.equal(past.status, 'complete')
  assert.equal(past.comfortableDailyPace, null)
  const future = calculate({ periodMonth: '2026-11' }).pace
  assert.equal(future.elapsedDays, 0)
  assert.equal(future.currentDailyPace, null)
  const last = calculate({ currentDate: new Date('2026-10-31T12:00:00') }).pace
  assert.equal(last.remainingDays, 0)
  assert.equal(last.comfortableDailyPace, null)
})

test('invalid dates, missing values and mixed base currencies are reported rather than fabricated', () => {
  const result = normalizeFinancialTransactions([expense('date', 10, '2026-02-30'), expense('missing', null), expense('currency', 10, undefined, { currency: 'CNY' })], { currency: 'USD' })
  assert.equal(result.rows.length, 0)
  assert.equal(result.issues.length, 3)
})

test('all five languages provide every new financial label', () => {
  const keys = Object.keys(financialLocales.en)
  for (const language of ['en', 'zh', 'ja', 'ko', 'es']) {
    assert.deepEqual(Object.keys(financialLocales[language]).sort(), [...keys].sort())
    for (const key of keys) assert.deepEqual((financialLocales[language][key].match(/\{\w+\}/g) || []).sort(), (financialLocales.en[key].match(/\{\w+\}/g) || []).sort())
  }
})

test('Quick Log uses its local parser without an AI or Supabase dependency', async () => {
  const result = await parseTransactionText('uber 18 yesterday')
  assert.equal(result.source, 'local')
  assert.equal(result.amount, '18')
  assert.equal(result.category, 'Transportation')
})
