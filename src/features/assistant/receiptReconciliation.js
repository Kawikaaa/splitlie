import { moneyUnits } from '../../../supabase/functions/ai-assistant/contract.js'

export const ADJUSTMENTS = ['tax', 'tip', 'discount']
export const adjustmentMode = (receipt, field) => receipt.adjustment_modes?.[field]
  || (receipt[field] == null || receipt[field] === '' ? 'unknown' : 'additional')

// Unknown is not zero. Included amounts must not be added to line totals again.
export function reconcileReceipt(receipt, total = receipt?.total) {
  const issues = [], unknown = []
  const totalUnits = moneyUnits(String(total ?? ''))
  if (totalUnits === null || totalUnits <= 0n) issues.push({ field: 'total', code: 'amount' })
  const items = Array.isArray(receipt?.items) ? receipt.items : []
  if (!items.length) unknown.push('items')
  if (items.length > 60) issues.push({ field: 'items', code: 'lines' })
  let sum = 0n
  items.forEach((item, index) => {
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120 || /[\u0000-\u001f\u007f]/.test(item.name)) issues.push({ field: `item-${index}-name`, code: 'name', index })
    if (item.quantity != null && item.quantity !== '' && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 10000)) issues.push({ field: `item-${index}-quantity`, code: 'quantity', index })
    if (item.amount == null || item.amount === '') { unknown.push(`item-${index}-amount`); return }
    const units = moneyUnits(String(item.amount), true)
    if (units === null) issues.push({ field: `item-${index}-amount`, code: 'amount', index })
    else sum += units
  })
  ADJUSTMENTS.forEach(field => {
    const mode = adjustmentMode(receipt || {}, field), value = receipt?.[field]
    if (!['unknown', 'included', 'additional', 'not_applicable'].includes(mode)) { issues.push({ field, code: 'mode' }); return }
    if (value != null && value !== '' && moneyUnits(String(value)) === null) issues.push({ field, code: 'amount' })
    if (mode === 'unknown' || (mode === 'additional' && (value == null || value === ''))) unknown.push(field)
    if (mode === 'additional' && moneyUnits(String(value ?? '')) !== null) sum += (field === 'discount' ? -1n : 1n) * moneyUnits(String(value))
  })
  const difference = issues.length || unknown.length ? null : sum - totalUnits
  return { status: issues.length ? 'invalid' : unknown.length ? 'unverifiable' : difference === 0n ? 'balanced' : 'difference', difference, issues, unknown }
}

export function receiptCanConfirm(receipt, total) {
  const result = reconcileReceipt(receipt, total)
  if (result.status === 'invalid') return false
  return result.status === 'balanced' || (receipt.exception_confirmed === true
    && typeof receipt.review_reason === 'string' && receipt.review_reason.trim().length >= 3
    && receipt.review_reason.trim().length <= 240 && !/[\u0000-\u001f\u007f]/.test(receipt.review_reason))
}
