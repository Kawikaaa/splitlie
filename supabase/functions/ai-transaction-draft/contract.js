// Shared by Edge and browser. Model output is untrusted, review-only draft data.
export const AI_CONTRACT_VERSION = 1
export const AI_TEXT_LIMIT = 300
export const AI_CURRENCIES = ['USD', 'CAD', 'CNY', 'EUR', 'GBP', 'JPY', 'AUD', 'HKD', 'SGD', 'KRW']
export const AI_CATEGORIES = ['Food', 'Groceries', 'Housing', 'Transportation', 'Shopping', 'Entertainment', 'Health', 'Education', 'Income', 'Other']
const fields = ['kind', 'amount', 'currency', 'category', 'description', 'date']
export function calendarDate(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
export function blockedIntent(text) {
  return /\b(refund|reimbursement|transfer|repayment|reembolso|transferencia|remboursement)\b|退款|退钱|退回|转账|转入|转出|还款|返金|振込|送金|환불|송금|상환/i.test(text)
}
export function literalAmounts(text) {
  const withoutDates = text.replace(/\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/g, ' ').replace(/\d{1,2}月\d{1,2}日?|\b\d{1,2}[/-]\d{1,2}\b/g, ' ')
  return [...withoutDates.matchAll(/\d+(?:[.,]\d+)?/g)].map(match => Number(match[0].replace(',', '.')))
}
export function validateAiDraft(value, { text, today, fallbackCurrency }) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) return null
  if (blockedIntent(text) || !['expense', 'income'].includes(value.kind)) return null
  if (value.amount !== null && (typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 9999999999.99)) return null
  if (!AI_CURRENCIES.includes(value.currency) || !AI_CATEGORIES.includes(value.category)) return null
  if ((value.kind === 'income') !== (value.category === 'Income')) return null
  if (typeof value.description !== 'string' || value.description.length > 120 || /[\u0000-\u001f<>]/.test(value.description)) return null
  if (value.date !== null && !calendarDate(value.date)) return null
  if (!calendarDate(today) || !AI_CURRENCIES.includes(fallbackCurrency)) return null
  const literals = literalAmounts(text)
  if (literals.length > 1) return null
  if (value.amount !== null && literals.length === 1 && value.amount !== literals[0]) return null
  if (value.amount !== null && !literals.length && !/[零一二三四五六七八九十百千万两]|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred)\b/i.test(text)) return null
  const codes = [...text.toUpperCase().matchAll(/USD|CAD|CNY|RMB|EUR|GBP|JPY|AUD|HKD|SGD|KRW/g)].map(match => match[0] === 'RMB' ? 'CNY' : match[0])
  if (new Set(codes).size > 1 || (codes.length && value.currency !== codes[0])) return null
  const dates = text.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || []
  if (dates.some(date => !calendarDate(date) || date !== value.date)) return null
  const names = [['USD', /美元|美金|US\$/i], ['CAD', /加元|加币|C\$/i], ['JPY', /日元|円/i], ['HKD', /港元|港币|HK\$/i], ['SGD', /新加坡元|新币|S\$/i], ['AUD', /澳元|澳币|A\$/i], ['EUR', /欧元|€/i], ['GBP', /英镑|£/i], ['KRW', /韩元|₩/i]]
  const named = names.find(([, pattern]) => pattern.test(text))?.[0]
  if (named && value.currency !== named) return null
  const relative = /大前天/.test(text) ? -3 : /前天|\b(?:the\s+)?day before yesterday\b/i.test(text) ? -2 : /昨天|\byesterday\b/i.test(text) ? -1 : /明天|\btomorrow\b/i.test(text) ? 1 : /今天|\btoday\b/i.test(text) ? 0 : null
  if (relative !== null) {
    const expected = new Date(`${today}T12:00:00Z`)
    expected.setUTCDate(expected.getUTCDate() + relative)
    if (value.date !== expected.toISOString().slice(0, 10)) return null
  }
  return { ok: true, source: 'ai', amount: value.amount == null ? '' : String(value.amount), currency: value.currency, type: value.kind, category: value.category, description: value.description.trim(), date: value.date || today, needsReview: true, confidence: 0 }
}
