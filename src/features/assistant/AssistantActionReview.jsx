import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { getToday } from '../transactions/transactionUtils'
import './Assistant.css'
export default function AssistantActionReview({ userId, spaceId, weekStart, client = supabase }) {
  const { t } = useLanguage(), [rows, setRows] = useState([]), [error, setError] = useState(false), [busy, setBusy] = useState(false), generation = useRef(0), lock = useRef(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  useEffect(() => {
    const id = ++generation.current; setRows([]); setError(false); setBusy(false); lock.current = false
    client.from('ai_assistant_actions').select('id,kind,review_date,feedback').eq('user_id', userId).eq('space_id', spaceId).eq('feedback', 'accepted').lte('review_date', getToday()).order('review_date').limit(5).then(result => {
      if (id !== generation.current) return
      if (result.error) setError(true); else setRows(result.data)
    })
    return () => { generation.current++ }
  }, [userId, spaceId, weekStart, reloadVersion])
  async function finish(row, feedback) {
    if (lock.current) return
    const id = generation.current; lock.current = true; setBusy(true); setError(false)
    const result = await client.from('ai_assistant_actions').update({ feedback }).eq('id', row.id).eq('user_id', userId).eq('space_id', spaceId).eq('feedback', 'accepted').select('id').single()
    if (id !== generation.current) return
    lock.current = false; setBusy(false)
    if (result.error) setError(true); else setRows(previous => previous.filter(item => item.id !== row.id))
  }
  if (!rows.length && !error) return null
  return <section className="assistant-checkin-review" aria-label={t('assistantPastActions')}><h3>{t('assistantPastActions')}</h3>{rows.map(row => <div className="assistant-history-row" key={row.id}><p>{t(`action_${row.kind}`)}</p><small>{t('assistantReviewOn', { date: row.review_date })}</small><div className="assistant-buttons"><button className="secondary" type="button" disabled={busy} onClick={() => void finish(row, 'helpful')}>{t('assistantHelpful')}</button><button className="secondary" type="button" disabled={busy} onClick={() => void finish(row, 'not_helpful')}>{t('assistantNotHelpful')}</button></div></div>)}{error && <div role="status" className="assistant-error"><p>{t('assistantError')}</p><button type="button" className="assistant-text-button" disabled={busy} onClick={()=>setReloadVersion(value=>value+1)}>{t('retry')}</button></div>}</section>
}
