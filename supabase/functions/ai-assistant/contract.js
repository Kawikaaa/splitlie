import { AI_CURRENCIES, calendarDate } from '../ai-transaction-draft/contract.js'

export const ASSISTANT_VERSION = 1
export const GOALS = ['understand', 'flexible', 'subscriptions', 'steady']
export const LANGUAGES = ['en', 'zh', 'ja', 'ko', 'es']
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const moneyUnits = (value, signed = false) => {
  if (typeof value !== 'string' || !(signed ? /^-?\d{1,10}(?:\.\d{1,4})?$/ : /^\d{1,10}(?:\.\d{1,4})?$/).test(value)) return null
  const negative = value.startsWith('-'), [whole, fraction = ''] = value.replace('-', '').split('.')
  return (negative ? -1n : 1n) * (BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0')))
}
const text = (value, limit) => typeof value === 'string' && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value)
const keys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === allowed.length && Object.keys(value).every(key => allowed.includes(key))

export function validateReceipt(value) {
  if (!keys(value, ['merchant', 'date', 'currency', 'total', 'items', 'tax', 'tip', 'discount', 'uncertain'])) return false
  if (!(value.merchant === null || text(value.merchant, 120)) || !(value.date === null || calendarDate(value.date)) || !(value.currency === null || AI_CURRENCIES.includes(value.currency))) return false
  if (!(value.total === null || (moneyUnits(value.total) !== null && moneyUnits(value.total) > 0n))) return false
  if (!['tax', 'tip', 'discount'].every(key => value[key] === null || moneyUnits(value[key]) !== null)) return false
  if (!Array.isArray(value.items) || value.items.length > 60 || !value.items.every(item => keys(item, ['name', 'quantity', 'amount']) && text(item.name, 120) && item.name.trim() && (item.quantity === null || (typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 10000)) && (item.amount === null || moneyUnits(item.amount, true) !== null))) return false
  return Array.isArray(value.uncertain) && value.uncertain.length <= 10 && value.uncertain.every(item => ['merchant', 'date', 'currency', 'total', 'items', 'tax', 'tip', 'discount', 'not_receipt'].includes(item))
}

// A deliberately separate task: missing itemization is not a reconciliation
// failure when the user asked only for a transaction total.
export function receiptFromSummary(value) {
  if (!keys(value, ['merchant','date','currency','total','uncertain'])) return null
  if (!Array.isArray(value.uncertain) || value.uncertain.some(field => !['merchant','date','currency','total','not_receipt'].includes(field))) return null
  const receipt = { ...value, items:[], tax:null, tip:null, discount:null }
  return validateReceipt(receipt) ? receipt : null
}

// Only canvas-reencoded baseline/progressive JPEGs are accepted. No EXIF, comments,
// remote URLs or unbounded decompression dimensions can reach the provider.
export function inspectJpeg(data) {
  if (typeof data !== 'string' || data.length > 1400000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4) return null
  let bytes
  try { bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0)) } catch { return null }
  if (bytes.length < 20 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return null
  let size = null, position = 2
  while (position < bytes.length - 2) {
    if (bytes[position++] !== 255) return null
    while (bytes[position] === 255) position++
    const marker = bytes[position++]
    if (marker === 218) return size
    if (marker === 217 || marker === 0 || marker === 216 || marker === 254 || (marker >= 225 && marker <= 239)) return null
    const length = bytes[position] * 256 + bytes[position + 1]
    if (length < 2 || position + length > bytes.length) return null
    if ([192, 194].includes(marker)) {
      if (length < 8) return null
      const height = bytes[position + 3] * 256 + bytes[position + 4], width = bytes[position + 5] * 256 + bytes[position + 6]
      if (!width || !height || Math.max(width, height) > 2048 || width * height > 2400000) return null
      size = { width, height, bytes: bytes.length }
    }
    position += length
  }
  return null
}

export function stripJpegMetadata(bytes) {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('INVALID_IMAGE')
  const parts = [bytes.slice(0,2)]; let position=2
  while(position<bytes.length-2) {
    const start=position
    if(bytes[position++]!==255) throw new Error('INVALID_IMAGE')
    while(bytes[position]===255)position++
    const marker=bytes[position++]
    if(marker===218) { parts.push(bytes.slice(start)); const result=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length}return result }
    const length=bytes[position]*256+bytes[position+1]
    if(length<2 || position+length>bytes.length)throw new Error('INVALID_IMAGE')
    position+=length
    if(marker!==254 && !(marker>=225 && marker<=239))parts.push(bytes.slice(start,position))
  }
  throw new Error('INVALID_IMAGE')
}

export function reportOptions(facts, goal = 'understand') {
  const options = []
  if (facts.comparable && facts.baselineWeeks >= 2 && facts.average > 0 && Math.abs(facts.net - facts.average) >= 10 && Math.abs(facts.net - facts.average) / facts.average >= .25) options.push({ id: 'comparison', factId: 'comparison', kind: facts.net > facts.average ? 'higher' : 'lower' })
  if (goal === 'flexible' && facts.categories[0]?.amount >= 50 && facts.net > 0 && facts.categories[0].amount >= facts.net * .5) options.push({ id: 'category', factId: 'category:0', kind: 'category' })
  if (facts.largest && facts.net > 0 && facts.largest.amount >= 50 && facts.largest.amount >= facts.net * .35) options.push({ id: 'large', factId: 'largest', kind: 'large' })
  if (facts.refunds > 0) options.push({ id: 'refunds', factId: 'refunds', kind: 'refunds' })
  const actions = options.length ? [{ id: 'track', factId: 'week' }] : []
  if (options.some(option => option.id === 'category') && goal !== 'steady') actions.push({ id: 'review_category', factId: 'category:0' })
  if (options.some(option => option.id === 'large')) actions.push({ id: 'review_purchase', factId: 'largest' })
  // No evidence of subscription cadence is inferred from aggregated amounts.
  return { observations: options, actions }
}

export function validateReport(output, facts, goal) {
  if (!keys(output, ['observations', 'action']) || !Array.isArray(output.observations) || output.observations.length > 2) return false
  if (output.observations.length === 0) return output.action === null
  const options = reportOptions(facts, goal)
  return new Set(output.observations).size === output.observations.length && output.observations.every(id => options.observations.some(item => item.id === id)) && options.actions.some(item => item.id === output.action)
}
