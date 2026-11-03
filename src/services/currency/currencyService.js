export const SUPPORTED_CURRENCIES = Object.freeze([
  { code: 'USD', name: 'US Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
])

const SUPPORTED_CODES = new Set(
  SUPPORTED_CURRENCIES.map((currency) => currency.code)
)

export function normalizeCurrency(value, fallback = 'USD') {
  const code = String(value || '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : fallback
}

export function isSupportedCurrency(value) {
  return SUPPORTED_CODES.has(normalizeCurrency(value, ''))
}

export function getCurrencyFractionDigits(currency, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizeCurrency(currency),
  }).resolvedOptions().maximumFractionDigits
}

export function roundCurrency(value, currency = 'USD', locale = 'en-US') {
  const digits = getCurrencyFractionDigits(currency, locale)
  const factor = 10 ** digits
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor
}

export function convertCurrency({ amount, rate, toCurrency = 'USD' }) {
  const numericAmount = Number(amount)
  const numericRate = Number(rate)

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error('A valid non-negative amount is required for conversion.')
  }

  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    throw new Error('A valid positive exchange rate is required for conversion.')
  }

  return roundCurrency(numericAmount * numericRate, toCurrency)
}

export { hasAccountingAmount, getAccountingAmount } from '../../../supabase/functions/_shared/accountingAmount.js'

export function getAccountingCurrency(transaction, fallback = 'USD') {
  return normalizeCurrency(
    transaction?.base_currency || fallback
  )
}

