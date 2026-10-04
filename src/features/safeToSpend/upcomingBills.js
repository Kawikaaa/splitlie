function dueDateFor(expense, month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${month}-${String(Math.min(expense.due_day || 1, lastDay)).padStart(2, '0')}`
}

export function getUpcomingBills(expenses, occurrences, month, today = new Date()) {
  const resolved = new Set(occurrences.map((item) => item.fixed_expense_id))
  const monthStart = `${month}-01`
  const [year, monthNumber] = month.split('-').map(Number)
  const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
  const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const limit = new Date(`${todayKey}T12:00:00`)
  limit.setDate(limit.getDate() + 7)
  const limitKey = new Date(limit.getTime() - limit.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  return expenses
    .filter((expense) => !resolved.has(expense.id))
    .filter((expense) => expense.active !== false)
    .filter((expense) => (!expense.starts_on || expense.starts_on <= monthEnd) && (!expense.ends_on || expense.ends_on >= monthStart))
    .map((expense) => ({ ...expense, due_date: dueDateFor(expense, month) }))
    .filter((expense) => expense.due_date <= limitKey)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}
