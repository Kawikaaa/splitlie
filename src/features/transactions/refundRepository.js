export function refundRemaining(original, refunds = [], editingId) {
  const spent = Number(original?.amount)
  if (!Number.isFinite(spent) || spent <= 0) return null
  let refunded = 0
  const seen = new Set()
  for (const row of refunds) {
    if (row.id === editingId || seen.has(row.id)) continue
    if (!row.id) return null
    seen.add(row.id)
    const amount = Number(row.amount)
    if (!Number.isFinite(amount) || amount <= 0 || row.parent_transaction_id !== original.id || row.currency !== original.currency) return null
    refunded += amount
  }
  const remaining = Math.round((spent - refunded) * 1000000) / 1000000
  return remaining < 0 ? null : Math.max(0, remaining)
}

export function createRefundRepository(client) {
  return {
    async context({ userId, spaceId, originalId }) {
      if (!userId || !spaceId || !originalId) throw new Error('Refund scope required')
      const original = await client.from('transactions').select('*').eq('id', originalId).eq('space_id', spaceId).eq('created_by', userId).single()
      if (original.error) throw original.error
      if (original.data.type !== 'expense' || original.data.payment_status !== 'paid') throw new Error('REFUND_ORIGINAL')
      const refunds = []
      for (let offset = 0; ; offset += 500) {
        const page = await client.from('transactions').select('id,amount,currency,parent_transaction_id')
          .eq('space_id', spaceId).eq('created_by', userId).eq('parent_transaction_id', originalId).order('id').range(offset, offset + 499)
        if (page.error) throw page.error
        refunds.push(...page.data)
        if (page.data.length < 500) break
      }
      return { original: original.data, refunds }
    },
  }
}
