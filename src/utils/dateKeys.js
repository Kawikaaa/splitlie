export function getLocalMonthKey(date = new Date()) {
  const value = new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

export function getLocalDateKey(date = new Date()) {
  const value = new Date(date)
  return `${getLocalMonthKey(value)}-${String(value.getDate()).padStart(2, '0')}`
}
