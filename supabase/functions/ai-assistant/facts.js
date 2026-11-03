import { calendarDate, AI_CURRENCIES } from '../ai-transaction-draft/contract.js'
import { normalizeFinancialTransactions, roundMoney as round } from '../_shared/financialSemantics.js'
export function shiftDay(date, days) { const result = new Date(`${date}T12:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10) }
export function weekRange(today, selectedStart) {
  if (!calendarDate(today)) throw new Error('INVALID_DATE')
  const date = new Date(`${today}T12:00:00Z`), currentStart = shiftDay(today, -((date.getUTCDay() + 6) % 7))
  const start = selectedStart ?? currentStart
  if (!calendarDate(start) || new Date(`${start}T12:00:00Z`).getUTCDay() !== 1 || start > currentStart || start < shiftDay(currentStart, -364)) throw new Error('INVALID_WEEK')
  const end = shiftDay(start, 6), through = today < end ? today : end
  return { start, end, historyStart: shiftDay(start, -28), through, comparisonDays: Math.round((new Date(`${through}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86400000) + 1, complete: end < today }
}
export function buildWeeklyFacts(rows, today, currency, selectedStart) {
  if (!AI_CURRENCIES.includes(currency)) throw new Error('INVALID_CURRENCY')
  const range = weekRange(today, selectedStart)
  // Use the same boundary as budgets, analytics and Safe to Spend. Parent rows
  // outside the reporting window may resolve refund categories, but never totals.
  const normalized = normalizeFinancialTransactions(rows, { currency })
  const valid = normalized.rows.filter(row => row.transaction_date >= range.historyStart && row.transaction_date <= range.through && ['expense','refund'].includes(row.type) && (row.payment_status || 'paid') === 'paid' && !row.is_excluded && !row.is_excluded_from_spending)
    .map(row => ({ id: row.id, date: row.transaction_date, amount: row.accountingAmount, type: row.type, category: row.category })).sort((a,b) => String(a.id).localeCompare(String(b.id)))
  const sourceDates = new Map(rows.map(row => [row.id, row.transaction_date]))
  const issues = normalized.issues.filter(issue => { const date = sourceDates.get(issue.id); return !calendarDate(date) || (date >= range.historyStart && date <= range.through) })
  const excluded = issues.filter(issue => issue.reason !== 'refund_parent_unavailable').length
  const current = valid.filter(row => row.date >= range.start)
  const expenses = current.filter(row => row.type === 'expense'), refunds = current.filter(row => row.type === 'refund')
  const history = Array.from({ length: 4 }, (_, index) => {
    const start = shiftDay(range.start, -7 * (index + 1)), through = shiftDay(start, range.comparisonDays - 1)
    const selected = valid.filter(row => row.date >= start && row.date <= through)
    return { start, through, count: selected.length, net: round(selected.reduce((sum, row) => sum + (row.type === 'refund' ? -row.amount : row.amount), 0)) }
  }).filter(week => week.count > 0)
  const categories = new Map()
  for (const row of current) categories.set(row.category, (categories.get(row.category) || 0) + (row.type === 'refund' ? -row.amount : row.amount))
  const gross = round(expenses.reduce((sum, row) => sum + row.amount, 0)), returned = round(refunds.reduce((sum, row) => sum + row.amount, 0))
  const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0]
  return { version: 2, ...range, currency, gross, refunds: returned, net: round(gross - returned), count: expenses.length, excluded,
    comparable: issues.length === 0 && history.length >= 2,
    baselineWeeks: history.length, average: history.length ? round(history.reduce((sum, week) => sum + week.net, 0) / history.length) : null,
    categories: [...categories].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
    largest: largest ? { id: largest.id, amount: largest.amount, category: largest.category, date: largest.date } : null,
    history,
  }
}

// Persisted JSON is untrusted, even when RLS confirms ownership. Old v1 reports
// are deliberately not rendered under the new comparison contract.
export function validWeeklyFacts(facts) {
  if (!facts || facts.version !== 2 || !AI_CURRENCIES.includes(facts.currency)) return false
  if (!['start','end','through','historyStart'].every(key => calendarDate(facts[key])) || facts.start > facts.through || facts.through > facts.end || facts.end !== shiftDay(facts.start, 6) || facts.historyStart !== shiftDay(facts.start, -28) || new Date(`${facts.start}T12:00:00Z`).getUTCDay() !== 1) return false
  if (!Number.isInteger(facts.comparisonDays) || facts.comparisonDays < 1 || facts.comparisonDays > 7 || shiftDay(facts.start, facts.comparisonDays - 1) !== facts.through || typeof facts.comparable !== 'boolean') return false
  if (!['gross','refunds','net'].every(key => typeof facts[key] === 'number' && Number.isFinite(facts[key])) || facts.gross < 0 || facts.refunds < 0 || round(facts.gross - facts.refunds) !== facts.net) return false
  if (!['count','excluded','baselineWeeks'].every(key => Number.isInteger(facts[key]) && facts[key] >= 0) || facts.baselineWeeks > 4 || !(facts.average === null || typeof facts.average === 'number' && Number.isFinite(facts.average))) return false
  if (!Array.isArray(facts.categories) || facts.categories.length > 100 || !facts.categories.every(row => row && typeof row.category === 'string' && row.category.length <= 120 && typeof row.amount === 'number' && Number.isFinite(row.amount))) return false
  if (!Array.isArray(facts.history) || facts.history.length !== facts.baselineWeeks || !facts.history.every(week => week && calendarDate(week.start) && week.start >= facts.historyStart && week.start < facts.start && week.through === shiftDay(week.start, facts.comparisonDays - 1) && Number.isInteger(week.count) && week.count > 0 && typeof week.net === 'number' && Number.isFinite(week.net))) return false
  return facts.largest === null || (!!facts.largest && typeof facts.largest.id === 'string' && Number.isFinite(facts.largest.amount) && facts.largest.amount >= 0 && typeof facts.largest.category === 'string' && calendarDate(facts.largest.date) && facts.largest.date >= facts.start && facts.largest.date <= facts.through)
}
