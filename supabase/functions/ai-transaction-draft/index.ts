import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { createAiParserHandler } from './handler.js'
const env = (name: string) => Deno.env.get(name)
Deno.serve(createAiParserHandler({
  env,
  reportProviderFailure: (status: number) => console.warn('AI_PROVIDER_HTTP_ERROR', status),
  async authenticate(authorization: string) {
    const url = env('SUPABASE_URL'), key = env('SUPABASE_ANON_KEY')
    if (!url || !key) return null
    const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
    const { data, error } = await client.auth.getUser()
    return error ? null : data.user
  },
  async reserveQuota(userId: string, spaceId: string) {
    const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return false
    // The privileged client is only used for this service-only quota reservation.
    const client = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await client.rpc('reserve_ai_parse_quota', { p_user_id: userId, p_space_id: spaceId })
    return !error && data === true
  },
}))
