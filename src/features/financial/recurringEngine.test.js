import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRecurringSchedule, getNextRecurringDate, getRecurringObligations } from './recurringEngine.js'
import { calculateSafeToSpend } from '../safeToSpend/calculateSafeToSpend.js'
import { getUpcomingBills } from '../safeToSpend/upcomingBills.js'
import { recurringLocales } from '../../i18n/recurringLocales.js'

test('pause preserves due obligations; resume excludes paused dates without changing cycle', () => {
  const paused = { id: 'pause', amount: 10, frequency: 'weekly', anchor_date: '2026-10-02', active: false,
    pause_periods: [{ paused_after: '2026-10-09', resumed_on: null }] }
  assert.deepEqual(buildRecurringSchedule({ expenses: [paused], start: '2026-10-01', end: '2026-10-31' }).occurrences.map(b => b.due_date), ['2026-10-02', '2026-10-09'])
  paused.active = true
  paused.pause_periods[0].resumed_on = '2026-10-23'
  assert.deepEqual(buildRecurringSchedule({ expenses: [paused], start: '2026-10-01', end: '2026-10-31' }).occurrences.map(b => b.due_date), ['2026-10-02', '2026-10-09', '2026-10-23', '2026-10-30'])
  paused.pause_periods.push({ paused_after: '2026-10-16', resumed_on: null })
  assert.equal(buildRecurringSchedule({ expenses: [paused], start: '2026-10-01', end: '2026-10-31' }).issues[0].reason, 'invalid_recurring_pauses')
})

test('upcoming window crosses a month boundary and resolves only one weekly bill', () => {
  const item = { id: 'weekly', frequency: 'weekly', anchor_date: '2026-10-23' }
  const bills = getUpcomingBills([item], [{ fixed_expense_id: 'weekly', due_date: '2026-10-30', status: 'paid' }], '2026-10', new Date(2026, 9, 28, 12))
  assert.deepEqual(bills.map(b => b.due_date), ['2026-10-23', '2026-11-06'])
  assert.equal(getUpcomingBills([item], [], '2026-10', new Date(2026, 9, 28, 12), true).length, 2)
})

test('all five recurring locales share keys and interpolation tokens', () => {
  for (const copy of Object.values(recurringLocales)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(recurringLocales.en).sort())
    for (const key of Object.keys(copy)) assert.deepEqual(copy[key].match(/\{\w+\}/g), recurringLocales.en[key].match(/\{\w+\}/g))
  }
})

const weekly = { id: 'class', name: 'Class', amount: 10, currency: 'USD', frequency: 'weekly', anchor_date: '2026-10-02' }
const schedule = (expenses, start = '2026-10-01', end = '2026-10-31') => buildRecurringSchedule({ expenses, start, end })
const calculate = options => calculateSafeToSpend({ monthlyBudget: 1000, currency: 'USD', currentDate: new Date(2026, 9, 14, 12), ...options })

test('weekly schedule generates five independent October occurrences', () => {
  const result = schedule([weekly, weekly])
  assert.deepEqual(result.occurrences.map(row => row.due_date), ['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30'])
  assert.equal(new Set(result.occurrences.map(row => row.occurrence_key)).size, 5)
  assert.equal(calculate({ fixedExpenses: [weekly] }).fixedAmount, 50)
})

test('monthly end-of-month clamping does not drift the next occurrence', () => {
  const bill = { id: 'month', amount: 10, frequency: 'monthly', due_day: 31, anchor_date: '2024-01-31' }
  assert.deepEqual(schedule([bill], '2024-01-01', '2024-03-31').occurrences.map(row => row.due_date), ['2024-01-31', '2024-02-29', '2024-03-31'])
})

test('annual expense reserves only the full due-month amount, never a monthly allocation', () => {
  const bill = { id: 'annual', amount: 120, frequency: 'yearly', anchor_date: '2025-12-08' }
  assert.equal(calculate({ fixedExpenses: [bill] }).fixedAmount, 0)
  assert.equal(calculate({ fixedExpenses: [bill], periodMonth: '2026-12' }).fixedAmount, 120)
  assert.equal(getNextRecurringDate(bill, '2026-10-04'), '2026-12-08')
})

test('leap-day yearly anchor recovers on leap years', () => {
  const bill = { id: 'leap', frequency: 'yearly', anchor_date: '2024-02-29' }
  assert.equal(getNextRecurringDate(bill, '2025-02-01'), '2025-02-28')
  assert.equal(getNextRecurringDate(bill, '2028-02-01'), '2028-02-29')
})

test('paid and skipped weekly resolutions affect only their exact occurrence', () => {
  const result = calculate({ fixedExpenses: [weekly], fixedExpenseOccurrences: [
    { fixed_expense_id: 'class', status: 'paid', due_date: '2026-10-02', transaction_id: 'paid' },
    { fixed_expense_id: 'class', status: 'skipped', due_date: '2026-10-09' },
    { fixed_expense_id: 'class', status: 'paid', due_date: '2026-09-25' },
  ], transactions: [{ id: 'paid', type: 'expense', amount: 10, transaction_date: '2026-10-01' }] })
  assert.equal(result.fixedAmount, 30)
  assert.equal(result.spentAmount, 10)
  assert.equal(result.safeToSpend, 960)
})

test('early payment affects its payment month and resolves the future due occurrence', () => {
  const annual = { id: 'annual', amount: 120, frequency: 'yearly', anchor_date: '2025-12-08' }
  const transactions = [{ id: 'early', type: 'expense', amount: 120, transaction_date: '2026-10-04', recurring_expense_id: 'annual', recurring_due_date: '2026-12-08' }]
  assert.equal(calculate({ fixedExpenses: [annual], transactions }).spentAmount, 120)
  const december = calculate({ fixedExpenses: [annual], transactions, periodMonth: '2026-12' })
  assert.equal(december.spentAmount, 0)
  assert.equal(december.fixedAmount, 0)
})

test('explicit linked upcoming payment reserves once without resolving sibling payments', () => {
  const result = calculate({ fixedExpenses: [weekly], transactions: [{ id: 'pending', type: 'expense', amount: 10,
    payment_status: 'upcoming', transaction_date: '2026-10-16', recurring_expense_id: 'class', recurring_due_date: '2026-10-16' }] })
  assert.equal(result.fixedAmount, 40)
  assert.equal(result.upcomingAmount, 10)
  assert.equal(result.safeToSpend, 950)
})

test('inactive, not-yet-started and ended rules generate no out-of-range occurrences', () => {
  assert.equal(schedule([{ ...weekly, active: false }]).occurrences.length, 0)
  assert.deepEqual(schedule([{ ...weekly, starts_on: '2026-10-10', ends_on: '2026-10-24' }]).occurrences.map(row => row.due_date), ['2026-10-16', '2026-10-23'])
  assert.equal(getNextRecurringDate({ ...weekly, ends_on: '2026-10-01' }, '2026-10-04'), null)
})

test('malformed rules and currency mismatch return issues, never fabricated obligations', () => {
  const result = getRecurringObligations({ expenses: [{ ...weekly, anchor_date: null }, { id: 'bad', frequency: 'daily' },
    { id: 'date', starts_on: '2026-02-30' }, { ...weekly, id: 'foreign', currency: 'CNY' }], start: '2026-10-01', end: '2026-10-31', currency: 'USD' })
  assert.equal(result.amount, 0)
  assert.ok(result.issues.some(row => row.reason === 'missing_recurring_anchor'))
  assert.ok(result.issues.some(row => row.reason === 'recurring_currency_mismatch'))
  assert.throws(() => schedule([], 'bad', '2026-10-31'), RangeError)
})

test('weekly dates remain calendar-aligned across DST and monthly legacy behavior remains intact', () => {
  const dates = schedule([{ ...weekly, anchor_date: '2026-03-01' }], '2026-03-01', '2026-03-31').occurrences.map(row => row.due_date)
  assert.deepEqual(dates, ['2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29'])
  assert.equal(calculate({ fixedExpenses: [{ id: 'legacy', amount: 20, starts_on: '2026-10-14' }] }).fixedAmount, 20)
  assert.equal(calculate({ fixedExpenses: [{ id: 'legacy-end', amount: 20, due_day: 31, ends_on: '2026-10-14' }] }).fixedAmount, 20)
})

test('resolution and transaction links from another space never discharge an obligation', () => {
  const bill = { ...weekly, space_id: 'mine' }
  const result = calculate({ fixedExpenses: [bill], fixedExpenseOccurrences: [{ fixed_expense_id: 'class',
    space_id: 'other', due_date: '2026-10-02', status: 'skipped' }], transactions: [{ id: 'foreign', type: 'expense',
    amount: 10, space_id: 'other', transaction_date: '2026-10-02', recurring_expense_id: 'class', recurring_due_date: '2026-10-02' }] })
  assert.equal(result.fixedAmount, 50)
})

test('weekly series-only linkage never silently resolves every payment in the month', () => {
  const result = calculate({ fixedExpenses: [weekly], transactions: [{ id: 'ambiguous', type: 'expense', amount: 10,
    transaction_date: '2026-10-02', recurring_expense_id: 'class' }] })
  assert.equal(result.fixedAmount, 50)
})

test('changing a monthly due day never reopens an already resolved month', () => {
  const result = calculate({ fixedExpenses: [{ id: 'monthly', amount: 20, due_day: 20 }],
    fixedExpenseOccurrences: [{ fixed_expense_id: 'monthly', due_date: '2026-10-01', status: 'skipped' }] })
  assert.equal(result.fixedAmount, 0)
})
