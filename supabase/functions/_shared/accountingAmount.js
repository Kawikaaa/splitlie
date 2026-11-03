export function hasAccountingAmount(transaction) {
  if (!transaction) return false
  if (transaction.base_amount == null && transaction.base_currency && transaction.currency && transaction.base_currency !== transaction.currency) return false
  const status = transaction.conversion_status || 'converted'
  return !['pending', 'failed'].includes(status) &&
    Number.isFinite(Number(transaction.base_amount ?? transaction.amount))
}

export function getAccountingAmount(transaction) {
  if (!hasAccountingAmount(transaction)) return null
  return Number(transaction.base_amount ?? transaction.amount)
}
