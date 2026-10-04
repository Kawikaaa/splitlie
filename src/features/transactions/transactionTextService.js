import { supabase } from '../../lib/supabase'
import { normalizeCurrency } from '../../services/currency/currencyService.js'
import { getToday } from './transactionUtils.js'
import { parseQuickTransaction } from './quickTransactionParser.js'

const VALID_CATEGORIES = new Set([
  'Food', 'Groceries', 'Housing', 'Transportation', 'Shopping',
  'Entertainment', 'Health', 'Education', 'Income', 'Other',
])

function validateAiResult(data) {
  const amount = Number(data?.amount)
  const currency = normalizeCurrency(data?.currency, '')
  const type = data?.type === 'income' ? 'income' : data?.type === 'expense' ? 'expense' : ''
  const category = String(data?.category || '')
  const date = String(data?.date || '')

  if (!Number.isFinite(amount) || amount <= 0 || !currency || !type || !VALID_CATEGORIES.has(category) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  return {
    ok: true,
    amount: String(amount),
    currency,
    type,
    category: type === 'income' ? 'Income' : category,
    description: String(data.description || '').trim().slice(0, 120),
    date,
    confidence: Math.max(0, Math.min(1, Number(data.confidence) || 0)),
    needsReview: Boolean(data.needs_review),
    reviewReason: String(data.review_reason || '').slice(0, 160),
    source: 'ai',
  }
}

export async function parseTransactionText(text, { fallbackCurrency = 'USD', language = 'en' } = {}) {
  const today = getToday()
  const deterministic = parseQuickTransaction(text, { fallbackCurrency, today })

  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-transaction', {
        body: { text, today, language, fallbackCurrency: normalizeCurrency(fallbackCurrency) },
      })
      const validated = !error && validateAiResult(data)
      if (validated) {
        // Explicit amounts, currency codes and dates are deterministic facts.
        // Never let a probabilistic model overwrite them.
        return {
          ...validated,
          amount: deterministic.ok ? deterministic.amount : validated.amount,
          currency: deterministic.explicitCurrency ? deterministic.currency : validated.currency,
          date: deterministic.explicitDate ? deterministic.date : validated.date,
        }
      }
    } catch {
      // Network, provider, or function configuration errors intentionally fall
      // through to the private, instant local parser.
    }
  }

  return { ...deterministic, source: 'local' }
}
