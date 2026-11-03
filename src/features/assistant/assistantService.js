import { ASSISTANT_VERSION } from '../../../supabase/functions/ai-assistant/contract.js'
export async function requestAssistant(invoke, body, signal) {
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) controller.abort()
  const timer = setTimeout(abort, body.task === 'receipt_summary' ? 16000 : 32000)
  try {
    if (controller.signal.aborted) return { ok: false, code: 'TIMEOUT' }
    const { data, error } = await invoke('ai-assistant', { body: { ...body, version: ASSISTANT_VERSION }, signal: controller.signal })
    if (controller.signal.aborted) return { ok: false, code: 'TIMEOUT' }
    if (error || data?.version !== ASSISTANT_VERSION) {
      let code = data?.code
      try { code ||= (await error?.context?.json())?.code } catch { /* offline */ }
      return { ok: false, code: code || 'UNAVAILABLE' }
    }
    return { ok: true, ...data }
  } catch { return { ok: false, code: controller.signal.aborted ? 'TIMEOUT' : 'UNAVAILABLE' } }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}
export const assistantErrorKey = code => ['QUOTA_EXHAUSTED', 'FREE_QUOTA_STOPPED'].includes(code) ? 'aiQuota' : code === 'REVIEW_VERSION_REQUIRED' ? 'assistantServerUpdate' : code === 'NOT_CONFIGURED' ? 'aiNotConfigured' : code === 'INVALID_IMAGE' ? 'receiptInvalidImage' : code === 'REVIEW_REQUIRED' ? 'aiReviewFailed' : 'assistantError'
