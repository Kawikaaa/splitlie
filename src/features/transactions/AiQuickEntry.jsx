import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { getToday } from './transactionUtils'
import { parseAiTransaction } from './aiTransactionService'

export default function AiQuickEntry({ active, text, spaceId, fallbackCurrency, disabled, onResult, onBusy }) {
  const { language, t } = useLanguage()
  const [status, setStatus] = useState('idle')
  const request = useRef({ id: 0, controller: null, pending: false })
  const trigger = useRef(null)
  const pending = status === 'pending'
  const cancel = () => {
    request.current.id += 1
    request.current.controller?.abort()
    request.current.pending = false
    onBusy(false)
    setStatus('idle')
    trigger.current?.focus()
  }
  useEffect(() => {
    request.current.id += 1
    request.current.controller?.abort()
    request.current.pending = false
    setStatus('idle')
    onBusy(false)
    return () => { request.current.id += 1; request.current.controller?.abort(); onBusy(false) }
  }, [active, text, spaceId, fallbackCurrency, language, onBusy])

  async function send() {
    if (request.current.pending) return
    request.current.pending = true
    if (request.current.controller && !request.current.controller.signal.aborted) request.current.controller.abort()
    const id = ++request.current.id
    const controller = new AbortController()
    request.current.controller = controller
    setStatus('pending'); onBusy(true)
    const result = await parseAiTransaction(text, {
      consent: true, spaceId, fallbackCurrency, today: getToday(), language, signal: controller.signal,
      invoke: (...args) => supabase ? supabase.functions.invoke(...args) : Promise.resolve({ data: null, error: {} }),
    })
    if (request.current.id !== id || controller.signal.aborted) return
    request.current.pending = false
    onBusy(false)
    if (result.ok) { setStatus('idle'); onResult(result); return }
    setStatus(['NOT_CONFIGURED'].includes(result.code) ? 'notConfigured' :
      ['QUOTA_EXHAUSTED', 'FREE_QUOTA_STOPPED'].includes(result.code) ? 'quota' :
      ['UNSUPPORTED_INTENT', 'REVIEW_REQUIRED', 'INVALID_OUTPUT'].includes(result.code) ? 'review' : 'unavailable')
  }
  return <div className="ai-quick-entry" hidden={!active}>
    <button ref={trigger} className="ai-parse-trigger" type="button" disabled={disabled || pending || !text.trim() || text.length > 300}
      aria-expanded={status === 'consent'} onClick={() => setStatus('consent')}>{t('aiParse')}</button>
    {status === 'idle' && <span>{t('aiOptional')}</span>}
    {status === 'consent' && <div className="ai-parse-consent">
      <p>{t('aiConsentCopy')}</p>
      <div><button className="secondary" type="button" onClick={cancel}>{t('cancel')}</button>
        <button className="primary" type="button" disabled={disabled} onClick={() => void send()}>{t('aiSend')}</button></div>
    </div>}
    {pending && <><p role="status">{t('aiParsing')}</p><button className="ai-parse-trigger" type="button" onClick={cancel}>{t('cancel')}</button></>}
    {!['idle', 'consent', 'pending'].includes(status) && <p role="status">{t({ notConfigured: 'aiNotConfigured', quota: 'aiQuota', review: 'aiReviewFailed', unavailable: 'aiUnavailable' }[status])}</p>}
  </div>
}
