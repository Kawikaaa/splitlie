import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateSafeToSpend, hasMonthlyTotalBudget } from './calculateSafeToSpend.js'
import { getUpcomingBills } from './upcomingBills.js'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/dateKeys.js'

test('keeps month and date keys on the user local calendar near UTC rollover', () => {
  const lateEvening = new Date(2026, 8, 30, 23, 30)

  assert.equal(getLocalMonthKey(lateEvening), '2026-09')
  assert.equal(getLocalDateKey(lateEvening), '2026-09-30')
})

test('distinguishes a missing budget from an explicitly zero budget', () => {
  assert.equal(hasMonthlyTotalBudget([]), false)
  assert.equal(hasMonthlyTotalBudget([{ category: 'Food', amount: 200 }]), false)
  assert.equal(hasMonthlyTotalBudget([{ category: '__TOTAL__', amount: 0 }]), true)
})

test('calculates plan minus incurred spending and all unpaid obligations', () => {
  const result = calculateSafeToSpend({
    currentDate: new Date('2026-09-15T12:00:00'),
    monthlyBudget: 1000,
    currency: 'USD',
    transactions: [
      { id: 'paid', type: 'expense', payment_status: 'paid', transaction_date: '2026-09-08', amount: 120 },
      { id: 'future', type: 'expense', payment_status: 'upcoming', transaction_date: '2026-09-20', amount: 90 },
      { id: 'income', type: 'income', payment_status: 'paid', transaction_date: '2026-09-01', amount: 500 },
    ],
    fixedExpenses: [
      { id: 'rent', name: 'Rent', amount: 400, currency: 'USD', active: true, starts_on: '2026-09-01' },
      { id: 'old', name: 'Old plan', amount: 25, currency: 'USD', active: false },
      { id: 'phone', name: 'Phone', amount: 40, currency: 'USD', active: true },
    ],
    fixedExpenseOccurrences: [{ fixed_expense_id: 'phone', status: 'paid' }],
  })

  assert.equal(result.spentAmount, 120)
  assert.equal(result.fixedAmount, 400)
  assert.equal(result.upcomingAmount, 90)
  assert.equal(result.safeToSpend, 390)
})

test('respects the selected local month for historical budget views', () => {
  const result = calculateSafeToSpend({
    currentDate: new Date(2026, 8, 15, 12),
    monthlyBudget: 300,
    transactions: [{ type: 'expense', payment_status: 'paid', transaction_date: '2026-09-02', amount: 25 }],
  })
  assert.equal(result.spentAmount, 25)
  assert.equal(result.safeToSpend, 275)
})

test('upcoming bills exclude inactive, resolved and not-yet-started expenses', () => {
  const bills = getUpcomingBills([
    { id: 'active', name: 'Phone', due_day: 27, active: true, starts_on: '2026-09-01' },
    { id: 'inactive', name: 'Old plan', due_day: 26, active: false },
    { id: 'future', name: 'Future', due_day: 26, active: true, starts_on: '2026-10-01' },
    { id: 'resolved', name: 'Rent', due_day: 25, active: true },
  ], [{ fixed_expense_id: 'resolved', status: 'skipped', occurrence_month: '2026-09-01' }], '2026-09', new Date('2026-09-24T12:00:00'))

  assert.deepEqual(bills.map((item) => item.id), ['active'])
})
