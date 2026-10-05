import { buildRecurringSchedule, isRecurringOccurrenceResolved } from '../financial/recurringEngine.js'
import { getLocalDateKey } from '../../utils/dateKeys.js'

export function getUpcomingBills(expenses, occurrences, month, today = new Date(), wholeMonth = false) {
  const limit = new Date(today)
  limit.setDate(limit.getDate() + 14)
  const [year, number] = month.split('-').map(Number)
  const end = wholeMonth ? `${month}-${String(new Date(year, number, 0).getDate()).padStart(2, '0')}` : getLocalDateKey(limit)
  const start = `${month}-01`
  if (end < start) return []
  return buildRecurringSchedule({ expenses, start, end }).occurrences
    .filter(bill => !isRecurringOccurrenceResolved(bill, occurrences))
}
