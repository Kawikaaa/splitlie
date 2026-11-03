// Account movements remain atomic database work. This layer only sends a write
// and, for stable operation retries, verifies an already-persisted identical row.
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort().map(([key, nested]) => [key, canonical(nested)]))
    : value

export async function createPersonalEntry(client, transaction) {
  const result = await client.from('transactions').insert(transaction)
  if (result.error && transaction.id) {
    const existing = await client.from('transactions').select('*')
      .eq('id', transaction.id).eq('space_id', transaction.space_id)
      .eq('created_by', transaction.created_by).maybeSingle()
    if (!existing.error && existing.data && Object.entries(transaction).every(([key, value]) => key === 'receipt_data'
      ? JSON.stringify(canonical(existing.data[key])) === JSON.stringify(canonical(value))
      : String(existing.data[key] ?? '') === String(value ?? ''))) return { data: existing.data, error: null }
  }
  return result
}

export async function updatePersonalEntry(client, { transactionId, spaceId, changes, expectedUpdatedAt }) {
  let query = client.from('transactions').update(changes)
    .eq('id', transactionId).eq('space_id', spaceId)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  return query.select('id').single()
}
