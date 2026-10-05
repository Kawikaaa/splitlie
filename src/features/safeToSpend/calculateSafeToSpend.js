import { normalizeFinancialTransactions, roundMoney } from '../financial/transactionSemantics.js'
import { calculateSpendingPace } from '../financial/spendingPace.js'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/dateKeys.js'
import { getRecurringObligations, isRecurringOccurrenceResolved } from '../financial/recurringEngine.js'

export function hasMonthlyTotalBudget(budgets = []) {
  return budgets.some(item => item?.category === '__TOTAL__')
}

export function calculateSafeToSpend({ transactions = [], monthlyBudget = 0, hasPlan = true, fixedExpenses = [], fixedExpenseOccurrences = [], currentDate = new Date(), periodMonth, currency = 'USD', goalReserves = [], safetyBuffer = { enabled: false, amount: 0 } }) {
  const now = new Date(currentDate)
  const month = periodMonth || getLocalMonthKey(now)
  const [year, monthNumber] = month.split('-').map(Number)
  const monthStart = `${month}-01`
  const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
  const { rows, issues } = normalizeFinancialTransactions(transactions, { currency })
  const monthRows = rows.filter(row => row.transaction_date.slice(0, 7) === month)
  const spentAmount = monthRows.filter(row => row.transaction_date <= getLocalDateKey(now)).reduce((sum, row) => sum + row.spendingAmount, 0)
  const resolved = fixedExpenseOccurrences.filter(row => (!row.occurrence_month || row.occurrence_month.slice(0, 7) === month) && ['paid', 'skipped'].includes(row.status))
  const recurring = getRecurringObligations({ expenses: fixedExpenses, resolutions: fixedExpenseOccurrences,
    transactions: rows, start: monthStart, end: monthEnd, currency })
  issues.push(...recurring.issues)
  const recurringItems = recurring.occurrences.map(item => ({ ...item, category: item.category || 'Other', dueDay: item.due_day }))
  const resolvedTransactionIds = new Set(resolved.map(row => row.transaction_id).filter(Boolean))
  const upcomingTransactions = monthRows.filter(row => row.obligationAmount > 0 && !resolvedTransactionIds.has(row.id)
    && !isRecurringOccurrenceResolved({ fixed_expense_id: row.recurring_expense_id || row.fixed_expense_id,
      frequency: fixedExpenses.find(item => item.id === (row.recurring_expense_id || row.fixed_expense_id))?.frequency || 'monthly',
      due_date: row.recurring_due_date || row.transaction_date }, fixedExpenseOccurrences))
  const budgetAmount = roundMoney(Math.max(0, Number(monthlyBudget) || 0))
  const fixedAmount = roundMoney(recurringItems.reduce((sum, item) => sum + item.amount, 0))
  const spent = roundMoney(spentAmount)
  const upcomingAmount = roundMoney(upcomingTransactions.reduce((sum, row) => sum + row.obligationAmount, 0))
  const obligationAmount = roundMoney(fixedAmount + upcomingAmount)
  const goalReserveAmount = roundMoney(goalReserves.filter(item => item.include_in_safe_to_spend === true && item.currency === currency && (!item.month || item.month === month)).reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0))
  const bufferAmount = safetyBuffer.enabled === true ? roundMoney(Math.max(0, Number(safetyBuffer.amount) || 0)) : 0
  const usedAmount = roundMoney(obligationAmount + spent + goalReserveAmount + bufferAmount)
  const safeToSpend = roundMoney(budgetAmount - usedAmount)
  const usedPercent = budgetAmount > 0 ? Math.max(0, Math.round((usedAmount / budgetAmount) * 100)) : 0
  const breakdown = [
    { key: 'spendingPlan', amount: budgetAmount },
    { key: 'incurredSpending', amount: spent ? -spent : 0 },
    { key: 'upcomingObligations', amount: obligationAmount ? -obligationAmount : 0 },
    ...(goalReserveAmount ? [{ key: 'goalReserve', amount: -goalReserveAmount }] : []),
    ...(bufferAmount ? [{ key: 'safetyBuffer', amount: -bufferAmount }] : []),
  ]
  return { month, currency, hasPlan, budgetAmount, fixedAmount, upcomingAmount, obligationAmount, goalReserveAmount, bufferAmount,
    spentAmount: spent, usedAmount, usedPercent, safeToSpend, fixedExpenses: recurringItems, upcomingTransactions, breakdown, issues,
    pace: calculateSpendingPace({ month, now, planAmount: budgetAmount, hasPlan, spentAmount: spent, safeToSpend }) }
}
