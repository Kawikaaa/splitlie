import { getAccountingAmount } from './accountingAmount.js'

export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const TYPES = new Set(['expense', 'income', 'refund', 'transfer', 'credit_card_payment'])

// Manual and future imported rows share this boundary. Never infer type from description.
export function normalizeFinancialTransactions(transactions = [], { currency } = {}) {
  const seen = new Set()
  const originals = new Map(transactions.filter(row => row.id).map(row => [row.id, row]))
  const issues = []
  const rows = []
  for (const item of transactions) {
    if (item.id && seen.has(item.id)) continue
    if (item.id) seen.add(item.id)
    const type = item.type || item.transaction_type
    const date = item.transaction_date || item.date
    const amount = getAccountingAmount(item)
    const calendarDate = new Date(`${date}T12:00:00`)
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(calendarDate.getTime())
      && calendarDate.getDate() === Number(date.slice(8, 10)) && calendarDate.getMonth() + 1 === Number(date.slice(5, 7))
    const problem = !TYPES.has(type) ? 'unsupported_type'
      : !validDate ? 'invalid_date'
        : (item.base_amount ?? item.amount) == null || amount === null || !Number.isFinite(amount) || amount < 0 ? 'invalid_accounting_amount'
          : currency && (item.base_currency || item.currency || currency) !== currency ? 'currency_mismatch' : null
    if (problem) { issues.push({ id: item.id, reason: problem }); continue }
    const parent = originals.get(item.parent_transaction_id)
    const validParent = parent?.type === 'expense' && (!item.space_id || parent.space_id === item.space_id)
    if (type === 'refund' && !validParent) issues.push({ id: item.id, reason: 'refund_parent_unavailable' })
    const paid = (item.payment_status || 'paid') === 'paid'
    const eligible = !item.is_excluded && !item.is_excluded_from_spending
    rows.push({
      ...item, type, transaction_date: date,
      category: type === 'refund' && validParent ? parent.category || 'Other' : item.category || 'Other',
      accountingAmount: amount,
      // Refunds reduce spending on their received date, not the original expense date.
      spendingAmount: paid && eligible ? (type === 'expense' ? amount : type === 'refund' ? -amount : 0) : 0,
      incomeAmount: paid && !item.is_excluded && type === 'income' ? amount : 0,
      obligationAmount: !paid && item.payment_status === 'upcoming' && eligible && type === 'expense' ? amount : 0,
    })
  }
  return { rows, issues }
}

export function summarizeFinancialTransactions(transactions, options = {}) {
  const { rows, issues } = normalizeFinancialTransactions(transactions, options)
  const selected = rows.filter(row => (!options.month || row.transaction_date.slice(0, 7) === options.month)
    && (!options.throughDate || row.transaction_date <= options.throughDate))
  const expenses = roundMoney(selected.reduce((sum, row) => sum + row.spendingAmount, 0))
  const income = roundMoney(selected.reduce((sum, row) => sum + row.incomeAmount, 0))
  return { expenses, income, net: roundMoney(income - expenses), rows: selected, issues }
}
