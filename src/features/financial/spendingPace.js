import { roundMoney } from './transactionSemantics.js'
import { getLocalMonthKey } from '../../utils/dateKeys.js'

export function calculateSpendingPace({ month, now = new Date(), planAmount, hasPlan, spentAmount, safeToSpend }) {
  const today = new Date(now)
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInPeriod = new Date(year, monthNumber, 0).getDate()
  const currentMonth = getLocalMonthKey(today)
  const elapsedDays = month < currentMonth ? daysInPeriod : month > currentMonth ? 0 : today.getDate()
  // Today is included in elapsed days; comfortable pace covers the days after today.
  const remainingDays = daysInPeriod - elapsedDays
  const periodProgress = elapsedDays / daysInPeriod
  const planUsage = hasPlan && planAmount > 0 ? spentAmount / planAmount : null
  const difference = planUsage === null ? null : planUsage - periodProgress
  return {
    month, daysInPeriod, elapsedDays, remainingDays, periodProgress, planUsage,
    currentDailyPace: elapsedDays ? roundMoney(spentAmount / elapsedDays) : null,
    comfortableDailyPace: hasPlan && remainingDays > 0 && safeToSpend >= 0 ? roundMoney(safeToSpend / remainingDays) : null,
    status: !hasPlan ? 'no_plan' : planAmount <= 0 ? 'zero_plan' : elapsedDays === 0 ? 'not_started'
      : remainingDays === 0 ? 'complete' : safeToSpend < 0 ? 'over_plan'
        : difference > 0.05 ? 'faster' : difference < -0.05 ? 'below' : 'aligned',
  }
}
