import { roundMoney } from '../financial/transactionSemantics.js'

export const SIGNAL_TYPES = Object.freeze({
  category_shift: 'CATEGORY_SPIKE', positive_signal: 'CATEGORY_CHANGE', large_purchase: 'LARGE_PURCHASE',
  frequency_change: 'FREQUENCY_SPIKE', small_purchase_accumulation: 'SMALL_SPEND_ACCUMULATION',
  spending_pace: 'SPENDING_PACE', recurring_upcoming: 'RECURRING_UPCOMING',
})

export function buildSignalEngine({ analytics, result, upcomingBills = [], quality, now = new Date() }) {
  if (quality.state === 'load_failed') return { signals: [], worthNoticing: [], unavailable: ['financial_data'] }
  const monthPeriod = { start: `${result.month}-01`, end: `${result.month}-${String(result.pace.daysInPeriod).padStart(2, '0')}` }
  const candidates = [...analytics.signals]
  const make = (type, currentValue, baselineValue, significance, metadata = {}, timePeriod = monthPeriod) => ({
    type, category: null, currentValue, baselineValue, absoluteChange: roundMoney(currentValue - (baselineValue || 0)),
    percentageChange: null, transactionCount: null, baselineTransactionCount: null, contributingTransactions: [],
    timePeriod, direction: 'higher', significance, history: [], metadata,
  })
  if (result.hasPlan && ['faster', 'over_plan'].includes(result.pace.status)) {
    candidates.push(make('spending_pace', result.spentAmount, result.budgetAmount * result.pace.periodProgress,
      Math.max(0, result.spentAmount - result.budgetAmount * result.pace.periodProgress), { ...result.pace }))
  }
  if (upcomingBills.length) {
    const amount = roundMoney(upcomingBills.reduce((sum, bill) => sum + Number(bill.amount), 0))
    if (Number.isFinite(amount) && amount > 0) candidates.push(make('recurring_upcoming', amount, null, amount,
      { count: upcomingBills.length, bills: upcomingBills.map(bill => ({ id: bill.occurrence_key || bill.id, name: bill.name, dueDate: bill.due_date })) }))
  }
  const signals = candidates.map(signal => ({
    ...signal, id: `${signal.type}:${signal.category || 'all'}:${signal.timePeriod.start}`,
    signalType: SIGNAL_TYPES[signal.type], severity: signal.type === 'spending_pace' && result.pace.status === 'over_plan' ? 'attention' : 'info',
    confidence: ['category_shift', 'positive_signal', 'frequency_change'].includes(signal.type) ? 'observed_history' : 'recorded_data',
    createdAt: new Date(now).toISOString(), relatedTransactionIds: signal.contributingTransactions.map(row => row.id).filter(Boolean),
    metadata: { ...signal.metadata, dataState: quality.state, completeness: quality.completeness },
  })).sort((a, b) => b.significance - a.significance || a.id.localeCompare(b.id))
  // Curation avoids repeating the same purchase across multiple headlines.
  const selected = []
  for (const signal of signals) {
    if (selected.some(item => item.id === signal.id || (item.category && item.category === signal.category)
      || (item.relatedTransactionIds.length && signal.relatedTransactionIds.length
        && item.relatedTransactionIds.some(id => signal.relatedTransactionIds.includes(id))))) continue
    selected.push(signal)
    if (selected.length === 3) break
  }
  return { signals, worthNoticing: selected,
    unavailable: !analytics.baseline.ready ? ['comparative_history'] : [] }
}
