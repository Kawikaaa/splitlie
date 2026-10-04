import { supabase } from '../../lib/supabase'
import { normalizeCurrency } from './currencyService.js'

const rateCache = new Map()
const MAX_ATTEMPTS = 2

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function requestRate(body) {
  let lastError = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.functions.invoke('fx-rate', { body })
    const rate = Number(data?.rate)

    if (!error && Number.isFinite(rate) && rate > 0) {
      return { data, rate }
    }

    lastError = new Error(
      data?.error || error?.message || 'Exchange rate is currently unavailable.'
    )

    if (attempt < MAX_ATTEMPTS) await wait(450)
  }

  throw lastError
}

export async function getExchangeRate({ fromCurrency, toCurrency, date }) {
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60 * 1000
  const localToday = new Date(now.getTime() - offset).toISOString().slice(0, 10)
  // Future/upcoming transactions use the latest rate available today. A
  // provider must never be asked for a date that does not exist yet.
  const rateDate = date && date < localToday ? date : localToday

  if (from === to) {
    return { rate: 1, date: rateDate, provider: 'identity' }
  }

  const cacheKey = `${rateDate}:${from}:${to}`
  if (rateCache.has(cacheKey)) return rateCache.get(cacheKey)

  const { data, rate } = await requestRate({ from, to, date: rateDate })

  const result = {
    rate,
    date: data.date || rateDate,
    provider: data.provider || 'unknown',
  }

  rateCache.set(cacheKey, result)
  return result
}

export function clearExchangeRateCache() {
  rateCache.clear()
}
