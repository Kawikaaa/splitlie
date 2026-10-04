function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function buildBalanceActivity({ balance, transactions, splits, settlements }) {
  if (!balance?.from?.user_id) return []

  const debtorId = balance.from.user_id
  const activity = []

  transactions
    .filter((transaction) =>
      transaction.type === 'expense' && transaction.split_type !== 'none'
    )
    .forEach((transaction) => {
      const share = splits
        .filter((split) =>
          split.transaction_id === transaction.id && split.user_id === debtorId
        )
        .reduce((total, split) => total + (Number(split.amount) || 0), 0)

      const accountingAmount = getAccountingAmount(transaction)
      if (accountingAmount === null) return

      const paid = transaction.paid_by === debtorId
        ? accountingAmount
        : 0
      const impact = roundMoney(share - paid)

      if (Math.abs(impact) < 0.01) return

      activity.push({
        id: `transaction-${transaction.id}`,
        kind: 'transaction',
        description: transaction.description || transaction.category || 'Transaction',
        date: transaction.transaction_date,
        impact,
      })
    })

  settlements.forEach((settlement) => {
    let impact = 0
    if (settlement.from_user === debtorId) impact -= Number(settlement.amount) || 0
    if (settlement.to_user === debtorId) impact += Number(settlement.amount) || 0
    impact = roundMoney(impact)

    if (Math.abs(impact) < 0.01) return

    activity.push({
      id: `settlement-${settlement.id}`,
      kind: settlement.entry_type === 'reversal' ? 'reversal' : 'settlement',
      description:
        settlement.entry_type === 'reversal'
          ? settlement.reversal_reason || 'Settlement reversed'
          : settlement.note || 'Settlement recorded',
      date: settlement.settlement_date,
      impact,
    })
  })

  return activity.sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  )
}
import { getAccountingAmount } from '../../services/currency/currencyService'
