import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { createAssistantHandler } from './handler.js'
import { buildWeeklyFacts } from './facts.js'
import { weeklyFingerprintInput, selectWeeklyReports } from './cache.js'
import { reserveAssistantQuota } from './quota.js'
const env = (name: string) => Deno.env.get(name)
const fingerprint = async (value: unknown) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))].map(x => x.toString(16).padStart(2, '0')).join('')
Deno.serve(createAssistantHandler({
  env,
  async authenticate(authorization: string) {
    const client = createClient(env('SUPABASE_URL')!, env('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
    const { data, error } = await client.auth.getUser()
    return error || !data.user ? null : { user: data.user, client }
  },
  async reserveQuota(userId: string, spaceId: string, task: string) {
    // Privileged client is used ONLY for quotas, never reading ledgers.
    const client = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    return reserveAssistantQuota(client, userId, spaceId, task)
  },
  async loadWeekly({ user, client }: any, body: any, range: any) {
    const space = await client.from('spaces').select('id,type,currency,created_by').eq('id', body.spaceId).eq('created_by', user.id).eq('type', 'personal').single()
    if (space.error) return null
    const rows: any[] = []
    for (let page = 0; page < 6; page++) {
      const result = await client.from('transactions').select('id,space_id,parent_transaction_id,type,amount,currency,base_amount,base_currency,category,payment_status,transaction_date,conversion_status,updated_at')
        .eq('space_id', body.spaceId).eq('created_by', user.id).gte('transaction_date', range.historyStart).lte('transaction_date', range.through).order('id').range(page * 1000, page * 1000 + 999)
      if (result.error) return null
      rows.push(...result.data)
      if (result.data.length < 1000) break
      if (page === 5) return null // Never turn a truncated ledger into a complete report.
    }
    const known = new Set(rows.map(row => row.id))
    const parents = [...new Set(rows.filter(row => row.type === 'refund' && row.parent_transaction_id && !known.has(row.parent_transaction_id)).map(row => row.parent_transaction_id))]
    for (let offset = 0; offset < parents.length; offset += 200) {
      const result = await client.from('transactions').select('id,space_id,type,category,amount,currency,base_amount,base_currency,payment_status,transaction_date,conversion_status,updated_at').eq('space_id', body.spaceId).eq('created_by', user.id).eq('type','expense').in('id', parents.slice(offset,offset+200))
      if (result.error) return null
      rows.push(...result.data)
    }
    const facts = buildWeeklyFacts(rows, body.today, space.data.currency, range.start)
    const hash = await fingerprint(weeklyFingerprintInput(rows, facts, { language:body.language, goal:body.goal || 'understand', model:env('AI_PARSER_MODEL') || 'qwen3.8-flash' }))
    const result = await client.from('ai_weekly_reports').select('*').eq('user_id', user.id).eq('space_id', body.spaceId).eq('week_start', range.start).eq('language', body.language).order('created_at', { ascending: false }).limit(10)
    if (result.error) return null
    return { facts, hash, ...selectWeeklyReports(result.data, facts, hash, body.goal || 'understand') }
  },
  async saveWeekly({ user, client }: any, body: any, weekly: any, output: any, model: string) {
    const payload = { user_id: user.id, space_id: body.spaceId, week_start: weekly.facts.start, language: body.language, goal: body.goal || 'understand', facts_hash: weekly.hash, facts: weekly.facts, output, model, prompt_version: 'weekly-select-v2' }
    const result = await client.from('ai_weekly_reports').insert(payload).select('*').single()
    if (!result.error) return result.data
    if (result.error.code === '23505') {
      const existing = await client.from('ai_weekly_reports').select('*').eq('user_id', user.id).eq('space_id', body.spaceId).eq('facts_hash', weekly.hash).single()
      if (!existing.error) return existing.data
    }
    throw new Error('REPORT_SAVE_FAILED')
  },
  async findDuplicates({ user, client }: any, spaceId: string, imageHash: string, receipt: any) {
    const byHash = await client.from('transactions').select('id,transaction_date,amount,currency,description').eq('space_id', spaceId).eq('created_by', user.id).eq('receipt_data->>image_hash', imageHash).limit(3)
    if (byHash.error) throw new Error('DUPLICATE_CHECK_FAILED')
    let similar: any[] = []
    if (receipt.total && receipt.date && receipt.currency && receipt.merchant) {
      const result = await client.from('transactions').select('id,transaction_date,amount,currency,description').eq('space_id', spaceId).eq('created_by', user.id).eq('type', 'expense').eq('transaction_date', receipt.date).eq('amount', receipt.total).eq('currency', receipt.currency).eq('description', receipt.merchant).limit(3)
      if (result.error) throw new Error('DUPLICATE_CHECK_FAILED')
      similar = result.data
    }
    return [...new Map([...byHash.data, ...similar].map(row => [row.id, row])).values()]
  },
}))
