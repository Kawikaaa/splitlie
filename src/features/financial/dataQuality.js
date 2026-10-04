import { normalizeFinancialTransactions } from './transactionSemantics.js'
import { getLocalDateKey } from '../../utils/dateKeys.js'

const dayOrdinal = key => Date.parse(`${key}T00:00:00Z`) / 86400000

export function assessFinancialData({ transactions = [], result, now = new Date(), loadFailed = false }) {
  const today = getLocalDateKey(now)
  const { rows, issues } = normalizeFinancialTransactions(transactions, { currency: result.currency })
  const relevant = rows.filter(row => !row.is_excluded && row.transaction_date <= today
    && ['expense', 'income', 'refund'].includes(row.type))
  // This is entry freshness, not a claim that every purchase has been recorded.
  const entryDates = relevant.map(row => {
    const entered = row.created_at ? new Date(row.created_at) : null
    return entered && Number.isFinite(entered.getTime()) && entered <= now ? getLocalDateKey(entered) : row.transaction_date
  }).sort()
  const lastEntryDate = entryDates.at(-1) || null
  const daysSinceEntry = lastEntryDate ? Math.max(0, dayOrdinal(today) - dayOrdinal(lastEntryDate)) : null
  const state = loadFailed ? 'load_failed' : issues.length || result.issues.length ? 'review_needed'
    : !relevant.length ? 'no_records' : daysSinceEntry >= 5 ? 'stale' : 'recent_entry'
  return {
    state, lastEntryDate, daysSinceEntry, hasPlan: result.hasPlan,
    recordedCount: relevant.filter(row => row.transaction_date.slice(0, 7) === result.month && (row.payment_status || 'paid') === 'paid').length,
    obligationCount: result.fixedExpenses.length + result.upcomingTransactions.length,
    issueCount: Math.max(issues.length, result.issues.length),
    freshnessSource: relevant.some(row => !row.created_at) ? 'entry_or_transaction_date' : 'created_at',
    // No confidence score or fake completeness percentage.
    completeness: 'not_verified',
  }
}
