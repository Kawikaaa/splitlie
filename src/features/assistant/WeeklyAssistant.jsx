import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { getCategoryTranslationKey } from '../../components/CategorySelect'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { getToday } from '../transactions/transactionUtils'
import { GOALS, reportOptions, validateReport } from '../../../supabase/functions/ai-assistant/contract.js'
import { shiftDay, weekRange, validWeeklyFacts } from '../../../supabase/functions/ai-assistant/facts.js'
import { requestAssistant, assistantErrorKey } from './assistantService'
import { weeklyEvidenceUrl, reviewWeekOptions } from '../insights/reviewNavigation'
import './Assistant.css'

export const sourceUrl = weeklyEvidenceUrl

export default function WeeklyAssistant({ spaceId, userId, client = supabase, selectedWeek, onWeekChange, onSnapshot, hideWeekPicker = false }) {
  const { language, t } = useLanguage(), epoch = useRef(0), controller = useRef(null), mutation = useRef(false)
  const [goal, setGoal] = useState('understand'), [state, setState] = useState(null), [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [consent, setConsent] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0), [initialFailed, setInitialFailed] = useState(false)
  const today = getToday()
  const currentWeek = weekRange(today).start
  const [internalWeek, setInternalWeek] = useState(() => shiftDay(currentWeek, -7))
  const weekStart = selectedWeek || internalWeek
  const setWeekStart = onWeekChange || setInternalWeek
  const scope = `${userId}:${spaceId}:${language}:${weekStart}`, previousScope = useRef('')
  async function load(nextGoal, task = 'weekly_read', signal, id = epoch.current) {
    const result = await requestAssistant((...args) => client.functions.invoke(...args), { task, today, language, spaceId, weekStart, weeklyVersion: 2, goal: nextGoal, consent: task === 'weekly' }, signal)
    if (id !== epoch.current || signal?.aborted) return
    if (result.ok && validWeeklyFacts(result.facts) && result.facts.start === weekStart) {
      // Never trust stored JSON merely because it belongs to this user.
      if (result.report && (!validWeeklyFacts(result.report.facts) || result.report.facts.start !== weekStart || !validateReport(result.report.output, result.facts, nextGoal))) result.report = null
      if (result.previousReport && (!validWeeklyFacts(result.previousReport.facts) || result.previousReport.facts.start !== weekStart || !validateReport(result.previousReport.output, result.previousReport.facts, result.previousReport.goal))) result.previousReport = null
      setState({ ...result, scope, goal: nextGoal })
    } else setError(result.ok ? 'assistantServerUpdate' : assistantErrorKey(result.code))
    setLoading(false); setPending(false)
  }
  useEffect(() => {
    const id = ++epoch.current; controller.current = new AbortController(); const signal = controller.current.signal
    setLoading(true); if (previousScope.current !== scope) { setState(null); setActions([]) } previousScope.current = scope
    setError(''); setConsent(false); setPending(false); setSaved(false); setInitialFailed(false); mutation.current = false
    async function initialize() {
      const [preferences, history] = await Promise.all([
        client.from('ai_assistant_preferences').select('goal').eq('user_id', userId).eq('space_id', spaceId).maybeSingle(),
        client.from('ai_assistant_actions').select('*,ai_weekly_reports(facts,output)').eq('user_id', userId).eq('space_id', spaceId).order('review_date', { ascending: false }).limit(20),
      ])
      if (id !== epoch.current) return
      if (preferences.error || history.error) { setInitialFailed(true); setError('assistantError'); setLoading(false); return }
      const nextGoal = GOALS.includes(preferences.data?.goal) ? preferences.data.goal : 'understand'
      setGoal(nextGoal); setActions(history.data || []); await load(nextGoal, 'weekly_read', signal, id)
    }
    void initialize()
    return () => { epoch.current++; controller.current?.abort() }
  }, [spaceId, userId, language, today, weekStart, reloadVersion])
  async function changeGoal(nextGoal, clear = false) {
    if (mutation.current || pending) return
    const id = epoch.current; mutation.current = true; setPending(true); setError(''); setSaved(false); setConsent(false)
    const result = clear ? await client.from('ai_assistant_preferences').delete().eq('user_id', userId).eq('space_id', spaceId) : await client.from('ai_assistant_preferences').upsert({ user_id: userId, space_id: spaceId, goal: nextGoal })
    if (id !== epoch.current) return
    mutation.current = false
    if (result.error) { setInitialFailed(true); setError('assistantError'); setPending(false); return }
    setGoal(nextGoal); await load(nextGoal, 'weekly_read', controller.current.signal, id)
  }
  async function generate() {
    if (pending || mutation.current) return
    const id = epoch.current; mutation.current = true
    setPending(true); setConsent(false); setError(''); setSaved(false)
    await load(goal, 'weekly', controller.current.signal)
    if (id === epoch.current) mutation.current = false
  }
  async function feedback(record, feedback) {
    if (mutation.current || pending) return
    if (!record.id && (retained || weeklyAction)) return
    const id = epoch.current; mutation.current = true; setPending(true); setError(''); setSaved(false)
    const payload = record.id ? { ...record, feedback } : { user_id: userId, space_id: spaceId, report_id: state.report.id, kind: state.report.output.action, feedback, review_date: shiftDay(currentWeek, 7) }
    delete payload.ai_weekly_reports
    const result = await client.from('ai_assistant_actions').upsert(payload, { onConflict: 'user_id,report_id' }).select('*,ai_weekly_reports(facts,output)').single()
    if (id !== epoch.current) return
    mutation.current = false; setPending(false)
    if (result.error) { setInitialFailed(true); setError('assistantError'); return }
    setActions(previous => [result.data, ...previous.filter(item => item.report_id !== result.data.report_id)]); setSaved(true)
  }
  // Hide out-of-scope content during render, before effects run. Failed reads
  // retain the prior same-scope snapshot and use its own facts/goal for evidence.
  const visibleState = state?.scope === scope ? state : null
  useEffect(()=>{onSnapshot?.({userId,spaceId,language,weekStart,facts:visibleState?.facts || null,loading,pending,error})},[onSnapshot,userId,spaceId,language,weekStart,visibleState,loading,pending,error])
  const report = visibleState?.report || visibleState?.previousReport
  const facts = report?.facts || visibleState?.facts
  const reportGoal = report?.goal || visibleState?.goal || goal
  const retained = !!report && (report !== visibleState?.report || visibleState?.goal !== goal || !!error || loading)
  const options = facts ? reportOptions(facts, reportGoal) : null
  const currentAction = actions.find(item => item.report_id === report?.id)
  const weeklyAction = actions.find(item => item.feedback !== 'ignored' && item.ai_weekly_reports?.facts?.start === weekStart)
  const category = facts?.categories[0] ? t(getCategoryTranslationKey(facts.categories[0].category)) : ''
  function observation(option) {
    const amount = option.id === 'category' ? facts.categories[0].amount : option.id === 'large' ? facts.largest.amount : option.id === 'refunds' ? facts.refunds : option.id === 'comparison' ? facts.average : facts.net
    return t(`observation_${option.kind}`, { amount: formatCurrency(amount, facts.currency), category })
  }
  const goalControls = <><label className="assistant-goal">{t('assistantGoal')}<select value={goal} disabled={loading || pending} onChange={event => void changeGoal(event.target.value)}>{GOALS.map(value => <option key={value} value={value}>{t(`goal_${value}`)}</option>)}</select></label><div className="assistant-row"><small>{t('assistantGoalCopy')}</small><button type="button" className="assistant-text-button" disabled={loading || pending} onClick={() => void changeGoal('understand', true)}>{t('assistantClearGoal')}</button></div></>
  const basis = facts && <><p className="assistant-muted">{t('assistantQuality')}</p><small>{facts.baselineWeeks >= 2 ? t('assistantBaseline', { count: facts.baselineWeeks }) : t('assistantNoBaseline')}</small></>
  return <section className="weekly-assistant" aria-label={t('assistantTitle')} aria-busy={loading || pending}>
    <h3>{t('assistantTitle')}</h3>
    {!hideWeekPicker && <label className="assistant-goal">{t('assistantWeek')}<select value={weekStart} disabled={pending} onChange={event => setWeekStart(event.target.value)}>{reviewWeekOptions(today,weekStart).map(start=><option key={start} value={start}>{start} · {shiftDay(start,6)} · {t(start===currentWeek?'assistantWeekSoFar':'assistantWeekComplete')}</option>)}</select></label>}
    {!report && goalControls}
    {loading && <p role="status">{t('loading')}</p>}
    {facts && <>
      <p className="assistant-scope">{t('assistantScope', { start: facts.start, through: facts.through, count: facts.count, currency: facts.currency })}</p>
      <small>{t('assistantRecordedOnly')}</small>
      {facts.comparable && <small>{t('assistantMatchedDays', { days: facts.comparisonDays, count: facts.baselineWeeks })}</small>}
      {!!facts.excluded && <p className="assistant-error">{t('assistantExcluded', { count: facts.excluded })}</p>}
      {!report && basis}
      {visibleState.stale && !report && <p role="status">{t('assistantStale')}</p>}
      {retained && <p role="status">{t('assistantRetained')}</p>}
      {(!report && !options.observations.length || report?.output.observations.length === 0) && <p>{t('assistantQuiet')}</p>}
      {report && <div className="assistant-report">
        <ul>{report.output.observations.map(id => { const option = options.observations.find(item => item.id === id); return <li key={id}><p>{observation(option)}</p><Link to={sourceUrl(facts, option.factId, spaceId)}>{t('assistantEvidence')}</Link></li> })}</ul>
        {report.output.action && <div className="assistant-action"><h4>{t('assistantAction')}</h4><p>{t(`action_${report.output.action}`)}</p><Link to={sourceUrl(facts, options.actions.find(item => item.id === report.output.action).factId, spaceId)}>{t('assistantEvidence')}</Link>
          {goal === 'subscriptions' && <Link to="/budget">{t('fixedExpenses')}</Link>}
          {!currentAction && !weeklyAction ? <div className="assistant-buttons"><button type="button" className="primary" disabled={pending || retained} onClick={() => void feedback({}, 'accepted')}>{t('assistantAccept')}</button><button type="button" className="secondary" disabled={pending || retained} onClick={() => void feedback({}, 'ignored')}>{t('assistantIgnore')}</button>{report.output.action === 'review_purchase' && <><button type="button" className="assistant-text-button" disabled={pending || retained} onClick={() => void feedback({}, 'one_off')}>{t('assistantOneOff')}</button><button type="button" className="assistant-text-button" disabled={pending || retained} onClick={() => void feedback({}, 'necessary')}>{t('assistantNecessary')}</button></>}</div> : <p>{t('assistantFeedbackSaved')}</p>}
        </div>}
        <details className="assistant-basis"><summary>{t('assistantBasis')}</summary><div>{goalControls}{basis}<small>{t('assistantSavedAt', { date: new Date(report.created_at).toLocaleString(language) })}</small></div></details>
      </div>}
      {(!report || retained) && options.observations.length > 0 && !consent && <button type="button" className="secondary" disabled={loading || pending} onClick={() => setConsent(true)}>{t('weeklyConsent')}</button>}
    </>}
    {consent && visibleState && <div className="assistant-consent"><p>{t('weeklyPrivacy')}</p><div className="assistant-buttons"><button type="button" className="secondary" onClick={() => setConsent(false)}>{t('cancel')}</button><button type="button" className="primary" onClick={() => void generate()}>{t('weeklySend')}</button></div></div>}
    {pending && <p role="status">{t('assistantWorking')}</p>}
    {error && <div role="status" className="assistant-error"><p>{t(error)}</p><button type="button" className="assistant-text-button" disabled={pending} onClick={() => { if (initialFailed) { setReloadVersion(value => value + 1); return } setError(''); setLoading(true); void load(goal, 'weekly_read', controller.current.signal) }}>{t('retry')}</button></div>}
    {saved && <p role="status">{t('assistantFeedbackSaved')}</p>}
    {previousScope.current === scope && actions.some(item => item.feedback !== 'ignored') && <div className="assistant-history"><h4>{t('assistantPastActions')}</h4>{actions.filter(item => item.feedback !== 'ignored').map(item => <div key={item.id} className="assistant-history-row"><p>{t(`action_${item.kind}`)}</p><small>{t('assistantReviewOn', { date: item.review_date })} · {t({ accepted: 'assistantAccepted', completed: 'assistantCompleted', helpful: 'assistantHelpful', not_helpful: 'assistantNotHelpful', one_off: 'assistantOneOff', necessary: 'assistantNecessary' }[item.feedback])}</small>
      {validWeeklyFacts(item.ai_weekly_reports?.facts) && <Link to={sourceUrl(item.ai_weekly_reports.facts, reportOptions(item.ai_weekly_reports.facts).actions.find(option => option.id === item.kind)?.factId || 'week', spaceId)}>{t('assistantEvidence')}</Link>}
      {item.feedback === 'accepted' && <div className="assistant-buttons">{(today >= item.review_date ? ['helpful', 'not_helpful'] : ['completed']).map(value => <button type="button" key={value} className="secondary" disabled={pending} onClick={() => void feedback(item, value)}>{t({ helpful: 'assistantHelpful', not_helpful: 'assistantNotHelpful', completed: 'assistantCompleted' }[value])}</button>)}</div>}
    </div>)}</div>}
  </section>
}
