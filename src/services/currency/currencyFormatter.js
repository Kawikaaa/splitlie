import { normalizeCurrency } from './currencyService.js'

export function formatCurrency(
  value,
  currency = 'USD',
  locale = 'en-US',
  options = {}
) {
  const numericValue = Number(value)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizeCurrency(currency),
    ...options,
  }).format(Number.isFinite(numericValue) ? numericValue : 0)
}
