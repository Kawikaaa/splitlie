import { normalizeFinancialTransactions } from '../financial/transactionSemantics.js'

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const average = (values) => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
const toDate = (value) => new Date(`${value}T12:00:00`)
const dayKey = (date) => {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeek(date) {
  const next = new Date(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  next.setHours(12, 0, 0, 0)
  return next
}

function expenseRows(transactions) {
  return normalizeFinancialTransactions(transactions).rows.flatMap((item) => {
    if (!item.spendingAmount) return []
    return [{ ...item, accountingAmount: item.spendingAmount }]
  })
}

function sumByCategory(rows) {
  const totals = new Map()
  rows.forEach((item) => totals.set(item.category, round((totals.get(item.category) || 0) + item.accountingAmount)))
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}

function countByCategory(rows) {
  const counts = new Map()
  rows.filter(item => item.type === 'expense').forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1))
  return counts
}

function contribution(item) {
  return {
    id: item.id,
    description: item.description || item.category || 'Transaction',
    category: item.category,
    amount: item.accountingAmount,
    date: item.transaction_date,
  }
}

export const SIGNAL_THRESHOLDS = Object.freeze({
  minimumBaselineWeeks: 2,
  categoryPercent: 25,
  categoryAbsolute: 10,
  frequencyMultiplier: 1.6,
  frequencyAbsolute: 2,
  smallPurchaseLimit: 10,
  smallPurchaseCount: 5,
  smallPurchaseTotal: 30,
  largePurchaseMinimum: 50,
  largePurchaseShare: 0.35,
})

export function buildPersonalAnalytics({ transactions = [], budgets = [], now = new Date() } = {}) {
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  const monthKey = dayKey(today).slice(0, 7)
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 15, 12)
  const previousMonthKey = dayKey(previousMonthDate).slice(0, 7)
  const rows = expenseRows(transactions).filter(item => item.transaction_date <= dayKey(today))
  const currentMonthRows = rows.filter((item) => item.transaction_date.slice(0, 7) === monthKey)
  const previousMonthRows = rows.filter((item) => item.transaction_date.slice(0, 7) === previousMonthKey)
  const categoryBreakdown = sumByCategory(currentMonthRows)

  const weekStart = startOfWeek(today)
  const nextWeekStart = addDays(weekStart, 7)
  const inRange = (item, from, to) => {
    const date = toDate(item.transaction_date)
    return date >= from && date < to
  }
  const currentWeekRows = rows.filter((item) => inRange(item, weekStart, nextWeekStart))
  const currentWeekTotal = round(currentWeekRows.reduce((sum, item) => sum + item.accountingAmount, 0))
  const weekCategories = sumByCategory(currentWeekRows)
  const currentCounts = countByCategory(currentWeekRows)

  const historicalWeeks = Array.from({ length: 4 }, (_, index) => {
    const start = addDays(weekStart, -7 * (index + 1))
    const end = addDays(start, 7)
    const weekRows = rows.filter((item) => inRange(item, start, end))
    return {
      start: dayKey(start),
      end: dayKey(addDays(end, -1)),
      rows: weekRows,
      total: round(weekRows.reduce((sum, item) => sum + item.accountingAmount, 0)),
      categories: new Map(sumByCategory(weekRows).map((item) => [item.category, item.amount])),
      counts: countByCategory(weekRows),
    }
  })
  const baselineWeeks = historicalWeeks.filter((week) => week.rows.length > 0)
  const baselineWeekCount = baselineWeeks.length
  const hasReliableBaseline = baselineWeekCount >= SIGNAL_THRESHOLDS.minimumBaselineWeeks
  const baselineTotal = average(baselineWeeks.map((week) => week.total))
  const absoluteChange = round(currentWeekTotal - baselineTotal)
  const changePercent = hasReliableBaseline && baselineTotal > 0 ? Math.round((absoluteChange / baselineTotal) * 100) : null

  const categories = new Set([...weekCategories.map((item) => item.category), ...baselineWeeks.flatMap((week) => [...week.categories.keys()])])
  const categoryPatterns = [...categories].map((category) => {
    const currentValue = weekCategories.find((item) => item.category === category)?.amount || 0
    const baselineValue = average(baselineWeeks.map((week) => week.categories.get(category) || 0))
    const transactionCount = currentCounts.get(category) || 0
    const baselineTransactionCount = average(baselineWeeks.map((week) => week.counts.get(category) || 0))
    const categoryChange = round(currentValue - baselineValue)
    const percentageChange = baselineValue > 0 ? Math.round((categoryChange / baselineValue) * 100) : null
    const contributingTransactions = currentWeekRows.filter((item) => item.category === category)
      .sort((a, b) => b.accountingAmount - a.accountingAmount).slice(0, 3).map(contribution)
    return { category, currentValue, baselineValue, absoluteChange: categoryChange, percentageChange, transactionCount, baselineTransactionCount, contributingTransactions }
  })

  const meaningfulChanges = hasReliableBaseline
    ? categoryPatterns.filter((item) => item.baselineValue >= 10 && Math.abs(item.absoluteChange) >= SIGNAL_THRESHOLDS.categoryAbsolute && Math.abs(item.percentageChange) >= SIGNAL_THRESHOLDS.categoryPercent)
      .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange)).slice(0, 3)
    : []

  const period = { start: dayKey(weekStart), end: dayKey(addDays(nextWeekStart, -1)) }
  const signals = meaningfulChanges.map((item) => ({
    type: item.absoluteChange < 0 ? 'positive_signal' : 'category_shift',
    category: item.category,
    currentValue: item.currentValue,
    baselineValue: item.baselineValue,
    absoluteChange: item.absoluteChange,
    percentageChange: item.percentageChange,
    transactionCount: item.transactionCount,
    baselineTransactionCount: item.baselineTransactionCount,
    contributingTransactions: item.contributingTransactions,
    timePeriod: period,
    direction: item.absoluteChange < 0 ? 'lower' : 'higher',
    significance: Math.abs(item.absoluteChange),
    relatedCheckIn: null,
    history: baselineWeeks.map((week) => ({ label: week.start, value: week.categories.get(item.category) || 0 })).reverse(),
  }))

  if (hasReliableBaseline) {
    categoryPatterns.filter((item) => item.baselineTransactionCount >= 1 && item.transactionCount - item.baselineTransactionCount >= SIGNAL_THRESHOLDS.frequencyAbsolute && item.transactionCount >= item.baselineTransactionCount * SIGNAL_THRESHOLDS.frequencyMultiplier)
      .sort((a, b) => (b.transactionCount - b.baselineTransactionCount) - (a.transactionCount - a.baselineTransactionCount)).slice(0, 1)
      .forEach((item) => signals.push({
        type: 'frequency_change', category: item.category, currentValue: item.currentValue, baselineValue: item.baselineValue,
        absoluteChange: item.absoluteChange, percentageChange: item.percentageChange, transactionCount: item.transactionCount,
        baselineTransactionCount: item.baselineTransactionCount, contributingTransactions: item.contributingTransactions,
        timePeriod: period, direction: 'higher', significance: (item.transactionCount - item.baselineTransactionCount) * 8,
        relatedCheckIn: null, history: baselineWeeks.map((week) => ({ label: week.start, value: week.counts.get(item.category) || 0 })).reverse(),
      }))
  }

  const smallPurchases = currentWeekRows.filter((item) => item.type === 'expense' && item.accountingAmount > 0 && item.accountingAmount < SIGNAL_THRESHOLDS.smallPurchaseLimit)
  const smallPurchaseTotal = round(smallPurchases.reduce((sum, item) => sum + item.accountingAmount, 0))
  if (smallPurchases.length >= SIGNAL_THRESHOLDS.smallPurchaseCount && smallPurchaseTotal >= SIGNAL_THRESHOLDS.smallPurchaseTotal) {
    signals.push({
      type: 'small_purchase_accumulation', category: 'Other', currentValue: smallPurchaseTotal, baselineValue: 0,
      absoluteChange: smallPurchaseTotal, percentageChange: null, transactionCount: smallPurchases.length, baselineTransactionCount: null,
      contributingTransactions: [...smallPurchases].sort((a, b) => b.accountingAmount - a.accountingAmount).slice(0, 3).map(contribution),
      timePeriod: period, direction: 'higher', significance: smallPurchaseTotal, relatedCheckIn: null, history: [],
    })
  }

  const largestPurchase = currentWeekRows.filter(item => item.type === 'expense').sort((a, b) => b.accountingAmount - a.accountingAmount)[0] || null
  if (largestPurchase && largestPurchase.accountingAmount >= SIGNAL_THRESHOLDS.largePurchaseMinimum && largestPurchase.accountingAmount >= currentWeekTotal * SIGNAL_THRESHOLDS.largePurchaseShare) {
    signals.push({
      type: 'large_purchase', category: largestPurchase.category, currentValue: largestPurchase.accountingAmount, baselineValue: baselineTotal,
      absoluteChange: largestPurchase.accountingAmount, percentageChange: Math.round((largestPurchase.accountingAmount / Math.max(currentWeekTotal, 1)) * 100),
      transactionCount: 1, baselineTransactionCount: null, contributingTransactions: [contribution(largestPurchase)],
      timePeriod: period, direction: 'higher', significance: largestPurchase.accountingAmount, relatedCheckIn: null, history: [],
    })
  }

  const categoryBudgets = budgets.filter((item) => item.category && item.category !== '__TOTAL__' && Number(item.amount) > 0)
  const currentByCategory = new Map(categoryBreakdown.map((item) => [item.category, item.amount]))
  const budgetStatuses = categoryBudgets.map((item) => {
    const spent = currentByCategory.get(item.category) || 0
    const limit = Number(item.amount)
    return { category: item.category, spent, limit, percent: Math.round((spent / limit) * 100), onTrack: spent <= limit }
  })

  const dedupedSignals = signals.sort((a, b) => b.significance - a.significance)
    .filter((signal, index, list) => list.findIndex((item) => item.type === signal.type && item.category === signal.category) === index)
  const previousWeek = historicalWeeks[0]
  const previousMonthTotal = round(previousMonthRows.reduce((sum, item) => sum + item.accountingAmount, 0))
  const currentMonthTotal = round(currentMonthRows.reduce((sum, item) => sum + item.accountingAmount, 0))
  const monthChangePercent = previousMonthTotal > 0 ? Math.round(((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100) : null

  return {
    monthKey,
    categoryBreakdown,
    currentMonthTotal,
    weekly: {
      start: period.start, end: period.end, total: currentWeekTotal, previousTotal: previousWeek?.total || 0,
      averageTotal: baselineTotal, baselineWeekCount, hasReliableBaseline, absoluteChange, changePercent,
      topCategory: weekCategories[0] || null, meaningfulChanges, largestChange: meaningfulChanges[0] || null,
      largestPurchase: largestPurchase ? contribution(largestPurchase) : null,
      budgetsOnTrack: budgetStatuses.filter((item) => item.onTrack).length, budgetCount: budgetStatuses.length,
      history: baselineWeeks.map((week) => ({ label: week.start, value: week.total })).reverse(),
    },
    budgetStatuses,
    // Comparative rules above already require a baseline. Absolute facts do not.
    signals: dedupedSignals,
    baseline: { ready: hasReliableBaseline, weekCount: baselineWeekCount },
    monthlyReflection: {
      ready: today.getDate() >= 25 && currentMonthRows.length >= 3,
      monthKey, total: currentMonthTotal, previousTotal: previousMonthTotal, changePercent: monthChangePercent,
      patternCount: dedupedSignals.length,
    },
  }
}
