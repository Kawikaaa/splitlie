import { AI_CONTRACT_VERSION, AI_TEXT_LIMIT, blockedIntent, literalAmounts, validateAiDraft } from '../../../supabase/functions/ai-transaction-draft/contract.js'
export async function parseAiTransaction(text, { invoke, consent, today, language, fallbackCurrency, spaceId, signal }) {
  if (consent !== true) return { ok: false, code: 'CONSENT_REQUIRED' }
  if (!text.trim() || text.length > AI_TEXT_LIMIT) return { ok: false, code: 'INVALID_REQUEST' }
  if (blockedIntent(text) || literalAmounts(text).length > 1) return { ok: false, code: 'UNSUPPORTED_INTENT' }
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  if (controller.signal.aborted) return { ok: false, code: 'TIMEOUT' }
  const timer = setTimeout(abort, 15000)
  try {
    const { data, error } = await invoke('ai-transaction-draft', {
      body: { version: AI_CONTRACT_VERSION, consent: true, text, today, language, fallbackCurrency, spaceId }, signal: controller.signal,
    })
    if (controller.signal.aborted) return { ok: false, code: 'TIMEOUT' }
    if (error || !data) {
      let code = data?.code
      try { code ||= (await error?.context?.json())?.code } catch { /* offline or old deployment */ }
      return { ok: false, code: code || 'UNAVAILABLE' }
    }
    if (data.version !== AI_CONTRACT_VERSION) return { ok: false, code: 'INVALID_OUTPUT' }
    return validateAiDraft(data.draft, { text, today, fallbackCurrency }) || { ok: false, code: 'REVIEW_REQUIRED' }
  } catch { return { ok: false, code: controller.signal.aborted ? 'TIMEOUT' : 'UNAVAILABLE' } }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}
