// Reuse the existing service-only atomic global/user reservation. Per-task
// counters then use a conditional update; a race/error consumes an attempt but
// never opens the provider gate. No new privileged public RPC is necessary.
export async function reserveAssistantQuota(client, userId, spaceId, task, day = new Date().toISOString().slice(0, 10)) {
  if (!['receipt', 'weekly'].includes(task)) return false
  const reservation = await client.rpc('reserve_ai_parse_quota', { p_user_id: userId, p_space_id: spaceId })
  if (reservation.error || reservation.data !== true) return false
  const scope = query => query.eq('quota_day', day).eq('user_id', userId).eq('task', task)
  const current = await scope(client.from('ai_assistant_quotas').select('requests')).maybeSingle()
  if (current.error) return false
  const used = current.data?.requests || 0
  if (used >= (task === 'receipt' ? 4 : 3)) return false
  const result = current.data
    ? await scope(client.from('ai_assistant_quotas').update({ requests: used + 1 })).eq('requests', used).select('requests').maybeSingle()
    : await client.from('ai_assistant_quotas').insert({ quota_day: day, user_id: userId, task, requests: 1 }).select('requests').single()
  return !result.error && result.data?.requests === used + 1
}
