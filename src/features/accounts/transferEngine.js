import { getLocalDateKey } from '../../utils/dateKeys.js'

const maxUnits = 1000000000000000000n
export function transferUnits(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const match = /^(\d{1,14})(?:\.(\d{1,4}))?$/.exec(String(value).trim())
  if (!match) return null
  const units = BigInt(match[1]) * 10000n + BigInt((match[2] || '').padEnd(4, '0'))
  return units < maxUnits ? units : null
}
export const transferAccounts = accounts => accounts.filter(a => !a.archived_at && a.type !== 'credit_card' && a.balance_source === 'manual')

// Preview uses exact 4-place decimal units, matching manual account precision.
// The database repeats all checks under row locks and remains authoritative.
export function previewTransfer({ accounts, sourceId, targetId, sourceAmount, targetAmount, original = null, cancel = false }) {
  const source = accounts.find(a => a.id === sourceId), target = accounts.find(a => a.id === targetId)
  if (!source || !target || sourceId === targetId || source.type === 'credit_card' || target.type === 'credit_card' || source.balance_source !== 'manual' || target.balance_source !== 'manual' || source.user_id !== target.user_id || source.space_id !== target.space_id) return { error: 'transferChooseAccounts' }
  if (!cancel && (source.archived_at || target.archived_at)) return { error: 'transferArchived' }
  const sent = transferUnits(sourceAmount), received = transferUnits(source.currency === target.currency ? sourceAmount : targetAmount)
  if (sent == null || received == null || sent <= 0n || received <= 0n) return { error: 'transferInvalidAmount' }
  const deltas = new Map()
  const add = (id, value) => deltas.set(id, (deltas.get(id) || 0n) + value)
  if (original) {
    const oldSent = transferUnits(original.source_amount), oldReceived = transferUnits(original.target_amount)
    if (oldSent == null || oldReceived == null || original.status !== 'completed') return { error: 'transferConflict' }
    add(original.source_account_id, oldSent); add(original.target_account_id, -oldReceived)
  }
  if (!cancel) { add(sourceId, -sent); add(targetId, received) }
  const balances = new Map()
  for (const [id, delta] of deltas) {
    const account = accounts.find(a => a.id === id), current = transferUnits(account?.balance)
    if (current == null || account.user_id !== source.user_id || account.space_id !== source.space_id) return { error: 'transferConflict' }
    const next = current + delta
    if (next < 0n) return { error: 'transferInsufficient' }
    if (next >= maxUnits) return { error: 'transferInvalidAmount' }
    balances.set(id, Number(next) / 10000)
  }
  return { source, target, sent: Number(sent) / 10000, received: Number(received) / 10000, balances }
}

export function validTransferDate(date, today = getLocalDateKey(new Date())) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date && date <= today
}

export function transferError(error) {
  const message = error?.message || ''
  if (/TRANSFER_INSUFFICIENT/.test(message)) return 'transferInsufficient'
  if (/TRANSFER_CONFLICT|TRANSFER_CANCELLED/.test(message) || error?.code === 'PGRST116') return 'transferConflict'
  if (/TRANSFER_ARCHIVED/.test(message)) return 'transferArchived'
  if (['42P01', 'PGRST205'].includes(error?.code)) return 'transferNotReady'
  return 'transferSaveError'
}
