import { roundMoney } from './transactionSemantics.js'

const DAY = 86400000
const FREQUENCIES = new Set(['weekly', 'monthly', 'yearly'])

// Calendar arithmetic uses UTC only as a date container, not as a user's clock.
function day(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}
function key(date) { return date.toISOString().slice(0, 10) }
function clampedDate(year, month, date) {
  const result = new Date(0)
  result.setUTCFullYear(year, month + 1, 0)
  const lastDay = result.getUTCDate()
  result.setUTCFullYear(year, month, Math.min(date, lastDay))
  return result
}
export function recurringOccurrenceKey(expenseId, dueDate) { return `${expenseId}:${dueDate}` }

// An explicit anchor is mandatory for weekly/yearly rules. Monthly legacy rows
// retain due_day and their existing month-scoped behavior without rewriting data.
export function buildRecurringSchedule({ expenses = [], start, end }) {
  const first = day(start), last = day(end)
  if (!first || !last || first > last || last - first > 366 * DAY) {
    throw new RangeError('Recurring schedule requires an ordered range of at most 367 calendar dates.')
  }
  const occurrences = [], issues = [], seen = new Set()
  for (const expense of expenses) {
    if (!expense?.id || seen.has(expense.id)) continue
    seen.add(expense.id)
    const pauses = expense.pause_periods || []
    if (!Array.isArray(pauses) || pauses.some((p, index) => !day(p.paused_after) ||
      (p.resumed_on && (!day(p.resumed_on) || p.resumed_on < p.paused_after)) ||
      (!p.resumed_on && index !== pauses.length - 1) ||
      (index > 0 && p.paused_after < pauses[index - 1].resumed_on))) {
      issues.push({ id: expense.id, reason: 'invalid_recurring_pauses' }); continue
    }
    if (expense.active === false && pauses.length === 0) continue
    const frequency = expense.frequency || 'monthly'
    const anchor = day(expense.anchor_date)
    const dueDay = Number(expense.due_day ?? anchor?.getUTCDate() ?? 1)
    const starts = expense.starts_on ? day(expense.starts_on) : null
    const ends = expense.ends_on ? day(expense.ends_on) : null
    const reason = !FREQUENCIES.has(frequency) ? 'unsupported_recurring_frequency'
      : frequency !== 'monthly' && !anchor ? 'missing_recurring_anchor'
        : expense.anchor_date && !anchor ? 'invalid_recurring_anchor'
          : !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31 ? 'invalid_recurring_due_day'
            : expense.starts_on && !starts || expense.ends_on && !ends || starts && ends && ends < starts ? 'invalid_recurring_date_range' : null
    if (reason) { issues.push({ id: expense.id, reason }); continue }
    const add = date => {
      if (date < first || date > last) return
      if (ends && date > ends && (anchor || frequency !== 'monthly' || key(date).slice(0, 7) !== expense.ends_on.slice(0, 7))) return
      if (anchor && date < anchor) return
      if (starts && date < starts) {
        // Preserve old monthly reservations even when starts_on was entered
        // later in the same month than due_day. New anchored schedules are exact.
        if (anchor || frequency !== 'monthly' || key(date).slice(0, 7) !== expense.starts_on.slice(0, 7)) return
      }
      const dueDate = key(date)
      if (pauses.some(p => dueDate > p.paused_after && (!p.resumed_on || dueDate < p.resumed_on))) return
      occurrences.push({ ...expense, frequency, due_date: dueDate,
        fixed_expense_id: expense.id, occurrence_key: recurringOccurrenceKey(expense.id, dueDate) })
    }
    if (frequency === 'weekly') {
      const offset = Math.max(0, Math.ceil((first - anchor) / (7 * DAY)))
      for (let time = anchor.getTime() + offset * 7 * DAY; time <= last.getTime(); time += 7 * DAY) add(new Date(time))
    } else if (frequency === 'yearly') {
      for (let year = first.getUTCFullYear(); year <= last.getUTCFullYear(); year++) {
        add(clampedDate(year, anchor.getUTCMonth(), anchor.getUTCDate()))
      }
    } else {
      const cursor = clampedDate(first.getUTCFullYear(), first.getUTCMonth(), 1)
      while (cursor <= last) {
        add(clampedDate(cursor.getUTCFullYear(), cursor.getUTCMonth(), dueDay))
        cursor.setUTCMonth(cursor.getUTCMonth() + 1)
      }
    }
  }
  occurrences.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.occurrence_key.localeCompare(b.occurrence_key))
  return { occurrences, issues }
}

export function isRecurringOccurrenceResolved(bill, resolutions = []) {
  return resolutions.some(row => {
    if (row.fixed_expense_id !== bill.fixed_expense_id || !['paid', 'skipped'].includes(row.status)) return false
    if (bill.space_id && row.space_id && bill.space_id !== row.space_id) return false
    if (row.due_date) return row.due_date === bill.due_date ||
      (bill.frequency === 'monthly' && row.due_date.slice(0, 7) === bill.due_date.slice(0, 7))
    // Old fixtures/data without due_date can only resolve one monthly occurrence.
    return bill.frequency === 'monthly' && (!row.occurrence_month || row.occurrence_month.slice(0, 7) === bill.due_date.slice(0, 7))
  })
}

export function recurringTransactionMatches(bill, transaction) {
  if ((transaction.recurring_expense_id || transaction.fixed_expense_id) !== bill.fixed_expense_id) return false
  if (bill.space_id && transaction.space_id && bill.space_id !== transaction.space_id) return false
  if (transaction.recurring_due_date) return transaction.recurring_due_date === bill.due_date
  // A date-less series link is insufficient evidence for weekly/yearly rules.
  return bill.frequency === 'monthly' && transaction.transaction_date?.slice(0, 7) === bill.due_date.slice(0, 7)
}

export function getRecurringObligations({ expenses = [], resolutions = [], transactions = [], start, end, currency }) {
  const schedule = buildRecurringSchedule({ expenses, start, end })
  const issues = [...schedule.issues]
  const invalidAmounts = new Set(), invalidCurrencies = new Set()
  const occurrences = schedule.occurrences.filter(bill => {
    if (isRecurringOccurrenceResolved(bill, resolutions)) return false
    if (transactions.some(row => (row.spendingAmount > 0 || row.obligationAmount > 0) && recurringTransactionMatches(bill, row))) return false
    const amount = Number(bill.amount)
    if (bill.amount == null || !Number.isFinite(amount) || amount < 0) {
      if (!invalidAmounts.has(bill.id)) issues.push({ id: bill.id, reason: 'invalid_recurring_amount' })
      invalidAmounts.add(bill.id); return false
    }
    if (currency && (bill.currency || currency) !== currency) {
      if (!invalidCurrencies.has(bill.id)) issues.push({ id: bill.id, reason: 'recurring_currency_mismatch' })
      invalidCurrencies.add(bill.id); return false
    }
    return true
  }).map(bill => ({ ...bill, amount: roundMoney(Number(bill.amount)) }))
  return { occurrences, issues, amount: roundMoney(occurrences.reduce((sum, bill) => sum + bill.amount, 0)) }
}

export function getNextRecurringDate(expense, fromDate) {
  const from = day(fromDate)
  if (!from) throw new RangeError('Invalid calendar date.')
  const until = new Date(from.getTime() + 366 * DAY)
  return buildRecurringSchedule({ expenses: [expense], start: fromDate, end: key(until) }).occurrences[0]?.due_date || null
}
