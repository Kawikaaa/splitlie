import { getAccountingAmount } from '../../services/currency/currencyService.js'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/dateKeys.js'

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function hasMonthlyTotalBudget(budgets = []) {
  return budgets.some(item => item?.category === '__TOTAL__')
}

export function calculateSafeToSpend({ transactions = [], monthlyBudget = 0, fixedExpenses = [], fixedExpenseOccurrences = [], currentDate = new Date(), currency = 'USD' }) {
  const now = new Date(currentDate)
  const month = getLocalMonthKey(now)
  const monthStart = `${month}-01`
  const monthEnd = getLocalDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const spentAmount = transactions
    .filter((item) => item.type === 'expense' && (item.payment_status || 'paid') === 'paid')
    .filter((item) => item.transaction_date?.slice(0, 7) === month)
    .reduce((sum, item) => {
      const amount = getAccountingAmount(item)
      return amount === null ? sum : sum + amount
    }, 0)
  const resolvedFixedIds = new Set(fixedExpenseOccurrences.map((item) => item.fixed_expense_id))
  const recurringItems = fixedExpenses
    .filter((item) => !resolvedFixedIds.has(item.id))
    .filter((item) => item.active !== false && (item.currency || currency) === currency)
    .filter((item) => (!item.starts_on || item.starts_on <= monthEnd) && (!item.ends_on || item.ends_on >= monthStart))
    .map((item) => ({ id: item.id, name: item.name, category: item.category || 'Other', amount: Number(item.amount || 0), dueDay: item.due_day }))
  const budgetAmount = roundMoney(monthlyBudget)
  const fixedAmount = roundMoney(recurringItems.reduce((sum, item) => sum + item.amount, 0))
  const spent = roundMoney(spentAmount)
  const usedAmount = roundMoney(fixedAmount + spent)
  const safeToSpend = roundMoney(budgetAmount - usedAmount)
  const usedPercent = budgetAmount > 0 ? Math.max(0, Math.round((usedAmount / budgetAmount) * 100)) : 0
  return { budgetAmount, fixedAmount, spentAmount: spent, usedAmount, usedPercent, safeToSpend, fixedExpenses: recurringItems }
}
