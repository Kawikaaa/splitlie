const columns = ['source_account_id', 'target_account_id', 'source_amount', 'target_amount', 'source_currency', 'target_currency', 'source_version', 'target_version', 'transfer_date', 'note']
const scope = ({ userId, spaceId }) => { if (!userId || !spaceId) throw Error('Authenticated transfer scope required') }
function payload(input) {
  if (!input || Object.keys(input).some(k => !columns.includes(k)) || columns.some(k => input[k] == null)) throw Error('Complete transfer payload required')
  return Object.fromEntries(columns.map(k => [k, input[k]]))
}
export function createTransferRepository(client) {
  const find = ({ userId, spaceId, id }) => client.from('account_transfers').select('*').eq('user_id', userId).eq('space_id', spaceId).eq('id', id).single()
  return {
    get(input) {
      scope(input)
      if (!input.id) throw Error('Transfer identity required')
      return find(input)
    },
    async list({ userId, spaceId, before = null, limit = 20 }) {
      scope({ userId, spaceId })
      let query = client.from('account_transfers').select('*').eq('user_id', userId).eq('space_id', spaceId)
      if (before) {
        if (!/^[0-9T:Z.+-]+$/.test(before.created_at) || !/^[0-9a-f-]{36}$/i.test(before.id)) throw Error('Invalid transfer cursor')
        query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
      }
      return query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit)
    },
    async save({ userId, spaceId, id, expectedUpdatedAt = null, draft }) {
      scope({ userId, spaceId })
      if (!id) throw Error('Stable transfer ID required')
      const data = payload(draft)
      if (expectedUpdatedAt) return client.from('account_transfers').update(data).eq('id', id).eq('user_id', userId).eq('space_id', spaceId).eq('updated_at', expectedUpdatedAt).select('*').single()
      const response = await client.from('account_transfers').insert({ ...data, id, user_id: userId, space_id: spaceId }).select('*').single()
      if (response.error?.code !== '23505' && !response.error?.message?.includes('TRANSFER_CONFLICT')) return response
      // Retry after an uncertain response must not apply a second movement.
      const existing = await find({ userId, spaceId, id })
      if (existing.error || existing.data?.status !== 'completed' || columns.some(k => ['source_version','target_version'].includes(k) ? false : String(existing.data[k]) !== String(data[k]))) return { data: null, error: { code: 'PGRST116', message: 'TRANSFER_CONFLICT' } }
      return existing
    },
    cancel({ userId, spaceId, id, expectedUpdatedAt }) {
      scope({ userId, spaceId })
      if (!id || !expectedUpdatedAt) throw Error('Latest transfer version required')
      return client.from('account_transfers').update({ status: 'cancelled' }).eq('id', id).eq('user_id', userId).eq('space_id', spaceId).eq('updated_at', expectedUpdatedAt).select('*').single()
    },
  }
}
