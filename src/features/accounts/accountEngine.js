import { convertCurrency, roundCurrency } from '../../services/currency/currencyService.js'
import { getLocalDateKey } from '../../utils/dateKeys.js'

export const ACCOUNT_TYPES = Object.freeze(['checking', 'savings', 'cash', 'credit_card', 'campus_card', 'digital_wallet', 'other'])
const types = new Set(ACCOUNT_TYPES)
const currencyCode = value => typeof value === 'string' && /^[A-Z]{3}$/.test(value)
const numeric = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value))
const decimalPlaces = value => {
  const [mantissa, exponent = '0'] = String(Number(value)).toLowerCase().split('e')
  return Math.max(0, (mantissa.split('.')[1]?.replace(/0+$/, '').length || 0) - Number(exponent))
}
const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
const dateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

// The UI and persistence boundary use positive credit-card balances as debt,
// never available credit. No transaction is allowed to mutate a manual balance.
export function validateManualAccount(input) {
  const errors = []
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) errors.push('invalid_account_name')
  if (!types.has(input.type)) errors.push('invalid_account_type')
  if (!currencyCode(input.currency)) errors.push('invalid_account_currency')
  if (!numeric(input.balance) || Number(input.balance) < 0 || Number(input.balance) >= 1e14) errors.push('invalid_account_balance')
  else if (decimalPlaces(input.balance) > 4) errors.push('invalid_account_precision')
  if (typeof input.include_in_total !== 'boolean') errors.push('invalid_account_inclusion')
  for (const [field, limit] of [['institution', 120], ['note', 1000]]) {
    if (input[field] != null && (typeof input[field] !== 'string' || input[field].length > limit)) errors.push(`invalid_account_${field}`)
  }
  return errors
}

// Quotes are supplied by an adapter (the existing FX service), not invented by
// this engine. They must specify the direction, provider and actual rate date.
export function calculateAccountTotals({ accounts = [], quotes = [], currency, userId, spaceId, now = new Date(), readFailed = false }) {
  if (!currencyCode(currency)) throw new RangeError('An explicit display currency is required.')
  const clock = new Date(now)
  if (!Number.isFinite(clock.getTime())) throw new RangeError('A valid calculation clock is required.')
  if (readFailed) return { state: 'unavailable', currency, assetTotal: null, debtTotal: null, netTotal: null, rows: [], issues: [{ reason: 'account_read_failed' }] }
  const rows = [], issues = [], seen = new Map()
  let assets = 0, debts = 0, assetComplete = true, debtComplete = true, estimated = false
  for (const account of accounts) {
    if (!account || !account.id) { issues.push({ reason: 'missing_account_id' }); assetComplete = debtComplete = false; continue }
    if ((userId && account.user_id !== userId) || (spaceId && account.space_id !== spaceId)) {
      issues.push({ id: account.id, reason: 'account_scope_mismatch' }); assetComplete = debtComplete = false; continue
    }
    if (account.archived_at) continue
    if (seen.has(account.id)) {
      const previous = seen.get(account.id)
      if (['balance', 'currency', 'type', 'include_in_total', 'balance_updated_at'].some(field => previous[field] !== account[field])) {
        issues.push({ id: account.id, reason: 'conflicting_account_duplicate' }); assetComplete = debtComplete = false
      }
      continue
    }
    seen.set(account.id, account)
    const errors = validateManualAccount(account)
    if (!['manual', 'synced'].includes(account.balance_source)) errors.push('invalid_balance_source')
    if (!timestamp(account.balance_updated_at) || Date.parse(account.balance_updated_at) > clock.getTime()) errors.push('invalid_balance_timestamp')
    const isDebt = account.type === 'credit_card'
    if (errors.length) {
      issues.push(...errors.map(reason => ({ id: account.id, reason })))
      if (account.include_in_total !== false) { if (isDebt) debtComplete = false; else assetComplete = false }
      continue
    }
    const balance = Number(account.balance)
    let baseAmount = null, conversion = null
    if (account.currency === currency || balance === 0) baseAmount = roundCurrency(balance, currency)
    else {
      const candidates = quotes.filter(q => q.from_currency === account.currency && q.to_currency === currency &&
        numeric(q.rate) && Number(q.rate) > 0 && dateKey(q.rate_date) && q.rate_date <= getLocalDateKey(clock) &&
        typeof q.provider === 'string' && q.provider.trim() && q.provider !== 'unknown')
      // Ambiguous quotes never silently pick a rate.
      const unique = new Map(candidates.map(q => [`${q.rate}:${q.rate_date}:${q.provider}`, q]))
      if (unique.size === 1) {
        conversion = [...unique.values()][0]
        baseAmount = convertCurrency({ amount: balance, rate: conversion.rate, toCurrency: currency })
        if (!Number.isFinite(baseAmount) || Math.abs(baseAmount) >= 1e14) { baseAmount = null; conversion = null }
      }
      if (baseAmount == null && account.include_in_total) {
        issues.push({ id: account.id, reason: unique.size > 1 ? 'ambiguous_account_fx' : 'missing_account_fx' })
        if (isDebt) debtComplete = false; else assetComplete = false
      }
    }
    rows.push({ ...account, balance, isDebt, baseAmount, conversion,
      balanceAgeDays: Math.floor((clock.getTime() - Date.parse(account.balance_updated_at)) / 86400000),
      estimated: Boolean(conversion) })
    if (!account.include_in_total || baseAmount == null) continue
    if (isDebt) debts += baseAmount; else assets += baseAmount
    if (conversion) estimated = true
  }
  const knownAssetSubtotal = roundCurrency(assets, currency), knownDebtSubtotal = roundCurrency(debts, currency)
  if (!Number.isFinite(assets) || assets >= 1e14 || !Number.isFinite(debts) || debts >= 1e14) {
    issues.push({ reason: 'account_total_out_of_range' }); assetComplete = debtComplete = false
  }
  return {
    state: issues.length ? 'needs_review' : rows.length ? 'ready' : 'empty', currency, rows, issues, estimated,
    assetTotal: assetComplete ? knownAssetSubtotal : null, debtTotal: debtComplete ? knownDebtSubtotal : null,
    netTotal: assetComplete && debtComplete ? roundCurrency(assets - debts, currency) : null,
    knownAssetSubtotal, knownDebtSubtotal,
    // Zero and partial totals are not claims of a complete financial picture.
    complete: assetComplete && debtComplete,
  }
}
