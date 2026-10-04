import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function TransactionAmount({ transaction, fallbackCurrency = 'USD', sign = '' }) {
  const originalCurrency = transaction.currency || fallbackCurrency
  const baseCurrency = transaction.base_currency || fallbackCurrency
  const converted = originalCurrency !== baseCurrency && transaction.base_amount != null
  const conversionUnavailable = ['pending', 'failed'].includes(transaction.conversion_status)

  return (
    <span className="transaction-currency-amount">
      <strong>{sign}{formatCurrency(transaction.amount, originalCurrency)}</strong>
      {converted && <small>≈ {formatCurrency(transaction.base_amount, baseCurrency)}</small>}
      {conversionUnavailable && !converted && <small>{baseCurrency} ·</small>}
    </span>
  )
}
