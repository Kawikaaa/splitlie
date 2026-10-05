import { calculateSafeToSpend, hasMonthlyTotalBudget } from '../safeToSpend/calculateSafeToSpend.js'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/dateKeys.js'

const events = new Map()
const scopeKey = ({ userId, spaceId, month }) => `${userId}:${spaceId}:${month}`
const stable = value => JSON.stringify(value, Object.keys(value).sort())
const fingerprint = rows => rows.map(row => stable(row)).sort().join('|')

export function calculateState(state, context, now) {
  return calculateSafeToSpend({ ...state, currency: context.currency, currentDate: now,
    periodMonth: context.month, hasPlan: hasMonthlyTotalBudget(state.budgets),
    monthlyBudget: state.budgets.find(row => row.category === '__TOTAL__')?.amount || 0 })
}

export function compareFinancialMutation(before, after, context, now = new Date(), operation = 'transaction', expected = null) {
  if (!['transaction', 'fixedExpense', 'recurring'].includes(operation)) return null
  if (!before || !after || fingerprint(before.budgets) !== fingerprint(after.budgets)) return null
  const changed = field => {
    const previous = new Map(before[field].map(row => [row.id, stable(row)]))
    const current = new Map(after[field].map(row => [row.id, stable(row)]))
    return [...new Set([...previous.keys(), ...current.keys()])].filter(id => previous.get(id) !== current.get(id))
  }
  const transactionIds = changed('transactions')
  const fixedIds = changed('fixedExpenses')
  const occurrenceIds = changed('fixedExpenseOccurrences')
  // If unrelated writes raced with this save, do not attribute their effects to it.
  if (operation === 'transaction' && (transactionIds.length !== 1 || fixedIds.length || occurrenceIds.length)) return null
  if (operation === 'transaction' && expected) {
    const row = after.transactions.find(item => item.id === transactionIds[0])
    if (!row || Object.entries(expected).some(([key, value]) => row[key] !== value)) return null
  }
  if (operation === 'fixedExpense' && (fixedIds.length !== 1 || transactionIds.length || occurrenceIds.length)) return null
  if (operation === 'fixedExpense' && expected?.id && fixedIds[0] !== expected.id) return null
  if (operation === 'recurring' && (occurrenceIds.length !== 1 || transactionIds.length > 1 || fixedIds.length)) return null
  if (operation === 'recurring' && expected?.fixedExpenseId) {
    const occurrence = after.fixedExpenseOccurrences.find(row => row.id === occurrenceIds[0])
    if (occurrence?.fixed_expense_id !== expected.fixedExpenseId) return null
    if (transactionIds.length) {
      const payment = after.transactions.find(row => row.id === transactionIds[0])
      if ((payment?.recurring_expense_id || payment?.fixed_expense_id) !== expected.fixedExpenseId) return null
    }
  }
  const previous = calculateState(before, context, now)
  const current = calculateState(after, context, now)
  if (!previous.hasPlan || previous.issues.length || current.issues.length || !Number.isFinite(current.safeToSpend)) return null
  return { ...context, operation, date: getLocalDateKey(now), createdAt: new Date(now).toISOString(),
    before: previous.safeToSpend, after: current.safeToSpend, planAmount: current.budgetAmount,
    transactionIds, fixedIds, afterFingerprint: fingerprint(after.transactions),
    contributingTransactions: after.transactions.filter(row => transactionIds.includes(row.id)).map(row => ({
      id: row.id, description: row.description || row.category, category: row.category,
      amount: Number(row.base_amount ?? row.amount), date: row.transaction_date,
    })),
    commitmentFingerprint: fingerprint([...after.fixedExpenses, ...after.fixedExpenseOccurrences]),
  }
}

export function rememberFinancialChange(event, context) {
  const key = scopeKey(context)
  if (event) events.set(key, event)
  else events.delete(key)
  if (events.size > 50) events.delete(events.keys().next().value)
}

export function readFinancialChange(context, state, result, now = new Date()) {
  const event = events.get(scopeKey(context))
  if (!event || event.date !== getLocalDateKey(now) || event.after !== result.safeToSpend || event.planAmount !== result.budgetAmount
    || event.currency !== context.currency || event.afterFingerprint !== fingerprint(state.transactions)
    || event.commitmentFingerprint !== fingerprint([...state.fixedExpenses, ...state.fixedExpenseOccurrences])) return null
  return event
}

export function financialContext(spaceId, userId, currency, now = new Date()) {
  return { spaceId, userId, currency, month: getLocalMonthKey(now) }
}

// Best-effort evidence capture is never allowed to turn a successful ledger write into a failure.
export async function finishFinancialChange(before, loadAfter, context, operation = 'transaction', expected = null) {
  try { rememberFinancialChange(compareFinancialMutation(before, await loadAfter(), context, new Date(), operation, expected), context) }
  catch { rememberFinancialChange(null, context) }
}
