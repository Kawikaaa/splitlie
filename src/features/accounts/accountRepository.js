import { validateManualAccount } from './accountEngine.js'

const fields = ['name', 'type', 'balance', 'currency', 'include_in_total', 'institution', 'note']
function scope(userId, spaceId) {
  if (!userId || !spaceId) throw new Error('An authenticated personal account scope is required.')
}
function payload(input) {
  const errors = validateManualAccount(input)
  if (errors.length) throw new Error(errors.join(', '))
  const result = Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]))
  result.name = result.name.trim()
  result.balance = Number(result.balance)
  return result
}

// Client injection keeps storage adapters testable and avoids loading Auth/React
// inside calculation services. RLS remains the actual authorization boundary.
export function createAccountRepository(client) {
  return {
    async list({ userId, spaceId, includeArchived = false }) {
      scope(userId, spaceId)
      const rows = []
      for (let offset = 0; ; offset += 1000) {
        let query = client.from('financial_accounts').select('*').eq('user_id', userId).eq('space_id', spaceId)
        if (!includeArchived) query = query.is('archived_at', null)
        const { data, error } = await query.order('id').range(offset, offset + 999)
        if (error) return { data: null, error }
        rows.push(...data)
        if (data.length < 1000) return { data: rows, error: null }
      }
    },
    create({ userId, spaceId, account }) {
      scope(userId, spaceId)
      return client.from('financial_accounts').insert({ ...payload(account), user_id: userId, space_id: spaceId }).select('*').single()
    },
    update({ userId, spaceId, id, expectedUpdatedAt, changes }) {
      scope(userId, spaceId)
      if (!id || !expectedUpdatedAt) throw new Error('The latest account version is required.')
      // Complete forms are validated first; only sent fields are written.
      // Metadata edits must omit balance/currency to retain balance freshness.
      if (!changes || Object.keys(changes).some(key => !fields.includes(key))) throw new Error('Unsupported account change.')
      if (Object.keys(changes).length === 0) throw new Error('An account change is required.')
      return client.from('financial_accounts').update(changes).eq('id', id).eq('user_id', userId).eq('space_id', spaceId).eq('updated_at', expectedUpdatedAt).select('*').single()
    },
    archive({ userId, spaceId, id, expectedUpdatedAt }) {
      scope(userId, spaceId)
      if (!id || !expectedUpdatedAt) throw new Error('The latest account version is required.')
      // Soft removal is recoverable; no destructive DELETE path is exposed.
      return client.from('financial_accounts').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).eq('space_id', spaceId).eq('updated_at', expectedUpdatedAt).select('*').single()
    },
    restore({ userId, spaceId, id, expectedUpdatedAt }) {
      scope(userId, spaceId)
      if (!id || !expectedUpdatedAt) throw new Error('The latest account version is required.')
      return client.from('financial_accounts').update({ archived_at: null }).eq('id', id).eq('user_id', userId).eq('space_id', spaceId).eq('updated_at', expectedUpdatedAt).select('*').single()
    },
  }
}
