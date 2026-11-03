import ModalSurface from '../../components/ModalSurface'
import WeeklyAssistant from '../assistant/WeeklyAssistant'
import AssistantActionReview from '../assistant/AssistantActionReview'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getToday } from '../transactions/transactionUtils'
import { shiftDay, weekRange } from '../../../supabase/functions/ai-assistant/facts.js'
import { readReviewContext, reviewWeekOptions, reviewSnapshotFacts, weeklyEvidenceUrl } from './reviewNavigation'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, CalendarCheck, Check, CircleAlert, ListFilter, Sparkles, X } from '../../icons'
import CategoryIcon from '../../components/CategoryIcon'
import { getCategoryTranslationKey } from '../../components/CategorySelect'
import { getLanguageLocale, useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { CONTEXT_TAGS, FEELINGS, countWeeklyStreak, localDateKey } from './weeklyCheckins'

function money(value, currency) { return formatCurrency(value || 0, currency) }

function InsightDialog({ children, className = '', label, onClose }) {
  const { t } = useLanguage()
  return (
    <div className="modal-backdrop insight-modal-backdrop" onMouseDown={onClose}>
      <ModalSurface as="section" onClose={onClose} busy={false} className={`insight-detail-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button insight-modal-close" type="button" onClick={onClose} aria-label={t('close')}><X size={18} /></button>
        {children}
      </ModalSurface>
    </div>
  )
}

export function SpendingBreakdownCard({ analytics, currency }) {
  const { t } = useLanguage()
  const rows = analytics.categoryBreakdown.slice(0, 5)
  const max = Math.max(rows[0]?.amount || 0, 1)
  return (
    <section className="fin-card fin-breakdown-card">
      <div className="fin-card-heading"><div><p className="eyebrow">{t('whereItWent')}</p><h2>{t('spendingBreakdown')}</h2></div></div>
      {rows.length === 0 ? <div className="empty-state">{t('notEnoughSpendingData')}</div> : (
        <div className="fin-breakdown-list">
          {rows.map((item) => (
            <div className="fin-breakdown-row" key={item.category}>
              <span className="fin-category-icon"><CategoryIcon category={item.category} /></span>
              <div className="fin-breakdown-copy"><span>{t(getCategoryTranslationKey(item.category))}</span><div className="fin-breakdown-track"><i style={{ width: `${item.amount > 0 ? Math.min(100, Math.max(5, item.amount / max * 100)) : 0}%` }} /></div></div>
              <strong>{money(item.amount, currency)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function WeeklyRecapDetail({ currency, onClose, spaceId, userId, weekStart, onWeekChange, client }) {
  const { language, t } = useLanguage()
  const [snapshot,setSnapshot] = useState(null)
  const today=getToday(),range=weekRange(today,weekStart),currentWeek=weekRange(today).start
  const facts=reviewSnapshotFacts(snapshot,{userId,spaceId,language,weekStart})
  const displayCurrency=facts?.currency || currency
  const maxHistory=facts?Math.max(facts.net,...facts.history.map(item=>item.net),1):1
  const comparison=facts?.comparable&&typeof facts.average==='number'
  return <InsightDialog label={t('weeklyRecap')} onClose={onClose}>
    <h2>{t('weeklyRecap')}</h2>
    <label className="assistant-goal weekly-review-period">{t('assistantWeek')}<select value={weekStart} disabled={snapshot?.weekStart===weekStart&&snapshot.pending} onChange={event=>onWeekChange(event.target.value)}>
      {reviewWeekOptions(today,weekStart).map(start=><option key={start} value={start}>{start} · {t(start===currentWeek?'assistantWeekSoFar':'assistantWeekComplete')}</option>)}
    </select></label>
    <p className="insight-period">{range.start} · {range.through}</p>
    {!facts ? <div className="weekly-review-loading" role="status"><p>{t(snapshot?.error?'reviewLoadFailed':'reviewLoading')}</p></div> : <div className="weekly-review-snapshot" aria-label={t('reviewSnapshot')} aria-busy={snapshot.loading}>
      <div className="insight-hero-value"><strong>{money(facts.net,displayCurrency)}</strong><span>{t('reviewNetSpending')}</span></div>
      <dl className="weekly-review-totals"><div><dt>{t('reviewGross')}</dt><dd>{money(facts.gross,displayCurrency)}</dd></div><div><dt>{t('reviewRefunds')}</dt><dd>{money(facts.refunds,displayCurrency)}</dd></div></dl>
      <p className="muted">{t('reviewCount',{count:facts.count})}</p>
      {snapshot.error&&<p role="status">{t('reviewSummaryRetained')}</p>}
      <Link className="assistant-text-button" to={weeklyEvidenceUrl(facts,'week',spaceId)}>{t('reviewViewEntries')} <ArrowRight size={16}/></Link>
      <p className="insight-comparison">{comparison?t(facts.net<=facts.average?'belowWeeklyAverage':'aboveWeeklyAverage',{amount:money(Math.abs(facts.net-facts.average),displayCurrency)}):t('buildingBaselineCopy')}</p>
      {comparison&&<small className="muted">{t('assistantMatchedDays',{days:facts.comparisonDays,count:facts.baselineWeeks})}</small>}
      {facts.history.length>0&&facts.net>=0&&facts.history.every(item=>item.net>=0)&&<details className="weekly-review-history"><summary>{t('reviewHistory')}</summary><div className="insight-history" aria-label={t('recentWeeklyPattern')}>
        {[...facts.history].reverse().map(item=><div key={item.start}><span>{item.start}</span><i style={{height:(item.net>0?Math.max(8,item.net/maxHistory*100):0)+'%'}}/><strong>{money(item.net,displayCurrency)}</strong></div>)}
        <div className="current"><span>{t('reviewSnapshot')}</span><i style={{height:(facts.net>0?Math.max(8,facts.net/maxHistory*100):0)+'%'}}/><strong>{money(facts.net,displayCurrency)}</strong></div>
      </div></details>}
      <div className="insight-section"><h3>{t('spendingBreakdown')}</h3>
        {facts.categories.length===0?<p className="muted">{t('reviewNoCategory')}</p>:facts.categories.slice(0,5).map(item=><Link className="insight-change-row weekly-review-category" key={item.category} to={weeklyEvidenceUrl(facts,'category:'+item.category,spaceId)}><CategoryIcon category={item.category}/><span><strong>{t(getCategoryTranslationKey(item.category))}</strong></span><b>{money(item.amount,displayCurrency)}</b><ArrowRight size={16}/></Link>)}
      </div>
      {facts.largest&&<div className="insight-section"><h3>{t('largestPurchase')}</h3><Link className="insight-transaction-row weekly-review-category" to={weeklyEvidenceUrl(facts,'largest',spaceId)}><span><strong>{t(getCategoryTranslationKey(facts.largest.category))}</strong><small>{facts.largest.date}</small></span><b>{money(facts.largest.amount,displayCurrency)}</b><ArrowRight size={16}/></Link></div>}
    </div>}
    <WeeklyAssistant key={userId+':'+spaceId} spaceId={spaceId} userId={userId} client={client} selectedWeek={weekStart} onWeekChange={onWeekChange} hideWeekPicker onSnapshot={setSnapshot}/>
  </InsightDialog>
}

export function WeeklyRecapCard({ analytics, currency, spaceId, userId, client }) {
  const { t } = useLanguage()
  const [params,setParams] = useSearchParams()
  const today=getToday(),selectedWeek=readReviewContext(params,{spaceId,today})
  const changeWeek=week=>setParams(current=>{const next=new URLSearchParams(current);next.set('reviewWeek',week);next.set('reviewSpace',spaceId);return next})
  const closeReview=()=>setParams(current=>{const next=new URLSearchParams(current);next.delete('reviewWeek');next.delete('reviewSpace');return next},{replace:true})
  const { weekly } = analytics
  const changes = weekly.meaningfulChanges.slice(0, 3)
  return (
    <>
      <section className="fin-card fin-weekly-card fin-awareness-card">
        <div className="fin-card-heading fin-weekly-heading"><div><p className="eyebrow">{t('thisWeek')}</p><h2>{money(weekly.total, currency)} {t('spent').toLowerCase()}</h2></div><small>{weekly.start} · {weekly.end}</small></div>
        <div className={`weekly-baseline ${weekly.absoluteChange <= 0 ? 'positive' : ''}`}>
          {weekly.hasReliableBaseline
            ? <><span>{weekly.absoluteChange <= 0 ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}</span><strong>{t(weekly.absoluteChange <= 0 ? 'belowWeeklyAverage' : 'aboveWeeklyAverage', { amount: money(Math.abs(weekly.absoluteChange), currency) })}</strong></>
            : <><Sparkles size={17} /><strong>{t('buildingBaseline')}</strong></>}
        </div>
        {weekly.hasReliableBaseline && <small className="weekly-comparison-scope">{t('assistantMatchedDays', { days: weekly.comparisonDays, count: weekly.baselineWeekCount })}</small>}
        <div className="weekly-change-list">
          {changes.length > 0 ? changes.map((item) => (
            <div className="weekly-change-row" key={item.category}>
              <CategoryIcon category={item.category} />
              <span><strong>{t(getCategoryTranslationKey(item.category))}</strong><small>{t(item.absoluteChange <= 0 ? 'belowRecentAverage' : 'aboveRecentAverage', { amount: money(Math.abs(item.absoluteChange), currency) })}</small></span>
            </div>
          )) : <p className="weekly-calm-state">{t(weekly.hasReliableBaseline ? 'noMeaningfulChanges' : 'buildingBaselineCopy')}</p>}
        </div>
        <button className="insight-link" type="button" onClick={() => changeWeek(shiftDay(weekRange(today).start,-7))}>{t('viewWeeklyRecap')} <ArrowRight size={16} /></button>
      </section>
      {selectedWeek && <WeeklyRecapDetail currency={currency} spaceId={spaceId} userId={userId} weekStart={selectedWeek} onWeekChange={changeWeek} onClose={closeReview} client={client} />}
    </>
  )
}

function signalCopy(signal, t, currency) {
  if (signal.type === 'spending_pace') return { title: t('signalPaceTitle'), description: signal.metadata.status === 'over_plan' ? t('pace_over_plan') : t('signalPaceCopy', { spent: Math.round(signal.metadata.planUsage * 100), elapsed: Math.round(signal.metadata.periodProgress * 100) }) }
  if (signal.type === 'recurring_upcoming') return { title: t('signalBillsTitle'), description: t('signalBillsCopy', { count: signal.metadata.count, amount: money(signal.currentValue, currency) }) }
  const category = t(getCategoryTranslationKey(signal.category))
  if (signal.type === 'category_shift') return { title: t('categoryRunningHigher', { category }), description: t('aboveRecentAverage', { amount: money(Math.abs(signal.absoluteChange), currency) }) }
  if (signal.type === 'positive_signal') return { title: t('categoryStayedLower', { category }), description: t('belowRecentAverage', { amount: money(Math.abs(signal.absoluteChange), currency) }) }
  if (signal.type === 'frequency_change') return { title: t('categoryMoreFrequent', { category }), description: t('frequencyComparison', { current: signal.transactionCount, baseline: Math.round(signal.baselineTransactionCount) }) }
  if (signal.type === 'small_purchase_accumulation') return { title: t('smallPurchasesAddedUp'), description: t('smallPurchaseSummary', { count: signal.transactionCount, amount: money(signal.currentValue, currency) }) }
  return { title: t('onePurchaseChangedTotal'), description: signal.contributingTransactions[0]?.description || category }
}

function SignalDetail({ signal, currency, checkins, onClose }) {
  const { t } = useLanguage()
  const copy = signalCopy(signal, t, currency)
  const related = checkins.records.find(item => item.week === signal.timePeriod.start && item.feeling)
  const history = [...(signal.history || []), { label: t('thisWeek'), value: signal.type === 'frequency_change' ? signal.transactionCount : signal.currentValue }]
  const max = Math.max(...history.map((item) => item.value), 1)
  return (
    <InsightDialog label={copy.title} onClose={onClose}>
      <p className="eyebrow">{t('moneySignal')}</p><h2>{copy.title}</h2><p className="insight-comparison">{copy.description}</p>
      <div className="insight-hero-value"><strong>{signal.type === 'frequency_change' ? signal.transactionCount : money(signal.currentValue, currency)}</strong><span>{t(['spending_pace', 'recurring_upcoming'].includes(signal.type) ? 'thisMonth' : 'thisWeek')}</span></div>
      <div className="insight-section"><h3>{t('whatChanged')}</h3><p>{signal.type === 'frequency_change' ? t('frequencyDetail', { current: signal.transactionCount, baseline: Math.round(signal.baselineTransactionCount) }) : ['category_shift', 'positive_signal'].includes(signal.type) ? t('valueDetail', { current: money(signal.currentValue, currency), baseline: money(signal.baselineValue, currency) }) : copy.description}</p><small className="muted">{t('signalRecordedBasis')}</small></div>
      {signal.type === 'recurring_upcoming' && <div className="insight-section">{signal.metadata.bills.map(item => <div className="insight-transaction-row" key={item.id}><strong>{item.name}</strong><small>{item.dueDate}</small></div>)}</div>}
      {signal.contributingTransactions.length > 0 && <div className="insight-section"><h3>{t('whatContributed')}</h3>{signal.contributingTransactions.map((item) => <div className="insight-transaction-row" key={item.id || `${item.date}-${item.amount}`}><span><strong>{item.description}</strong><small>{item.date}</small></span><b>{money(item.amount, currency)}</b></div>)}</div>}
      {history.length > 1 && <div className="insight-section"><h3>{t('comparedWithPattern')}</h3><div className="signal-history-list">{history.map((item, index) => <div key={`${item.label}-${index}`}><span>{item.label}</span><i><b style={{ width: `${Math.max(5, item.value / max * 100)}%` }} /></i><strong>{signal.type === 'frequency_change' ? Math.round(item.value) : money(item.value, currency)}</strong></div>)}</div></div>}
      {related && <div className="insight-section reflection-context"><h3>{t('yourReflection')}</h3><p>{t('youSaid')} <strong>{t(related.feeling)}</strong></p>{related.tags?.length > 0 && <small>{related.tags.map((tag) => t(tag)).join(' · ')}</small>}</div>}
    </InsightDialog>
  )
}

export function MoneySignalsPanel({ analytics, currency, checkins }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(null)
  const signals = analytics.worthNoticing || analytics.signals.slice(0, 3)
  return (
    <>
      <section className="fin-card fin-signals-card">
        <div className="fin-card-heading"><div><p className="eyebrow">{t('worthNoticing')}</p><h2>{t('moneySignals')}</h2></div><span className="fin-heading-icon"><Sparkles size={19} /></span></div>
        {signals.length === 0 ? <div className="fin-signal-empty"><Sparkles size={18} /><div><strong>{t(analytics.baseline.ready ? 'noMeaningfulChanges' : 'buildingBaseline')}</strong><span>{t(analytics.baseline.ready ? 'signalRecordedBasis' : 'buildingBaselineCopy')}</span></div></div> : <div className="fin-signal-list">{signals.map((signal) => { const copy = signalCopy(signal, t, currency); const Icon = signal.direction === 'lower' ? ArrowDownRight : signal.type === 'recurring_upcoming' ? CalendarCheck : signal.type === 'large_purchase' ? CircleAlert : ArrowUpRight; return <button className={`fin-signal ${signal.type === 'positive_signal' ? 'positive' : 'info'}`} type="button" key={signal.id || `${signal.type}-${signal.category}`} onClick={() => setSelected(signal)}><Icon size={18} /><span><strong>{copy.title}</strong><small>{copy.description}</small></span><ArrowRight size={16} /></button> })}</div>}
      </section>
      {selected && <SignalDetail signal={selected} currency={currency} checkins={checkins} onClose={() => setSelected(null)} />}
    </>
  )
}

function MonthlyReflectionEntry({ analytics, currency }) {
  const { language, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const reflection = analytics.monthlyReflection
  const month = new Intl.DateTimeFormat(getLanguageLocale(language), { month: 'long' }).format(new Date(`${reflection.monthKey}-15T12:00:00`))
  if (!reflection.ready) return null
  return (
    <>
      <article className="fin-card monthly-reflection-entry"><div><p className="eyebrow">{t('monthlyReflectionReady', { month })}</p><h2>{money(reflection.total, currency)} {t('spent').toLowerCase()}</h2><p>{reflection.changePercent == null ? t('buildingMonthlyPattern') : t(reflection.changePercent <= 0 ? 'belowPreviousMonth' : 'abovePreviousMonth', { percent: Math.abs(reflection.changePercent) })} · {t('patternsFound', { count: reflection.patternCount })}</p></div><button className="insight-link" type="button" onClick={() => setOpen(true)}>{t('viewMonth', { month })} <ArrowRight size={16} /></button></article>
      {open && <InsightDialog label={t('monthlyReflection')} onClose={() => setOpen(false)}><p className="eyebrow">{t('monthlyReflection')}</p><h2>{month}</h2><div className="insight-hero-value"><strong>{money(reflection.total, currency)}</strong><span>{t('spentThisMonth')}</span></div><p className="insight-comparison">{reflection.changePercent == null ? t('buildingMonthlyPattern') : t(reflection.changePercent <= 0 ? 'belowPreviousMonth' : 'abovePreviousMonth', { percent: Math.abs(reflection.changePercent) })}</p><div className="insight-section"><h3>{t('recurringPatterns')}</h3><p>{t('patternsFound', { count: reflection.patternCount })}</p></div></InsightDialog>}
    </>
  )
}

export function ReflectionPanel({ analytics, currency, checkins, activeSpace, userId }) {
  const { language, t } = useLanguage()
  const { records, loading, error, saving } = checkins
  const existing = records.find(item => item.week === analytics.weekly.start)
  const [draftFeeling, setFeeling] = useState('')
  const [draftTags, setTags] = useState([])
  const feeling = existing?.feeling || draftFeeling
  const tags = existing?.tags || draftTags
  const complete = Boolean(existing?.completed)
  const [contextOpen, setContextOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const feelingOptions = FEELINGS
  const tagOptions = CONTEXT_TAGS
  const currentStreak = countWeeklyStreak(records, analytics.weekly.start)
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const calendarYear = calendarDate.getFullYear()
  const calendarMonth = calendarDate.getMonth()
  const firstDayOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calendarDays = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  const dateKey = localDateKey
  const completedDates = new Set(records.filter(item => item.completed && item.completedDate).map(item => item.completedDate))
  const todayKey = dateKey(new Date())
  const calendarMonthLabel = new Intl.DateTimeFormat(getLanguageLocale(language), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(calendarYear, calendarMonth, 1))
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(getLanguageLocale(language), {
    weekday: 'narrow',
  }).format(new Date(2026, 0, 5 + index)))

  function toggleTag(tag) { setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]) }
  async function finish() {
    if (!feeling || saving || loading) return
    const now = new Date()
    await checkins.save({ week: analytics.weekly.start, feeling, tags, completed: true, completedAt: now.toISOString(), completedDate: dateKey(now) })
  }

  return (
    <>
      <article className="fin-card fin-checkin-card awareness-checkin-card">
        <div className="checkin-heading"><span className="checkin-icon">{complete ? <Check size={19} /> : <CalendarCheck size={19} />}</span><div><p className="eyebrow">{t('weeklyCheckIn')}</p><h2>{complete ? t('checkInComplete') : t('howSpendingFelt')}</h2></div></div>
        {loading ? <p className="muted" role="status">{t('checkinLoading')}</p> : error === 'load' ? <div role="alert"><p>{t('checkinLoadError')}</p><button className="insight-link" type="button" onClick={checkins.retry}>{t('retry')}</button></div> : complete ? <div className="checkin-complete-layout">
          <div className="checkin-complete"><strong>{feeling ? t(feeling) : t('checkInCompleteCopy')}</strong>{tags.length > 0 && <span>{tags.map((tag) => t(tag)).join(' · ')}</span>}<small>{t('checkInSaved')}</small></div>
          <button className="checkin-calendar-trigger" type="button" onClick={() => setCalendarOpen(true)}><CalendarCheck size={18} /><span>{t('viewStreakCalendar')}</span><strong>{currentStreak} {t(currentStreak === 1 ? 'week' : 'weeks')}</strong></button>
        </div> : <>
          <div className="checkin-options">{feelingOptions.map((value) => <button disabled={saving} className={feeling === value ? 'active' : ''} type="button" key={value} onClick={() => setFeeling(value)}>{t(value)}</button>)}</div>
          {error === 'save' && <p role="alert">{t('checkinSaveError')}</p>}
          <div className="checkin-actions"><button className="checkin-context-trigger" type="button" disabled={!feeling || saving} onClick={() => setContextOpen(true)}><ListFilter size={15} aria-hidden="true" /><span>{tags.length > 0 ? t('contextSelected', { count: tags.length }) : t('addContext')}</span></button><button className="checkin-submit" type="button" disabled={!feeling || saving} onClick={finish}>{t(saving ? 'saving' : 'completeCheckIn')}</button></div>
          <button className="insight-link" type="button" onClick={() => setCalendarOpen(true)}>{t('viewStreakCalendar')} · {currentStreak} {t(currentStreak === 1 ? 'week' : 'weeks')}</button>
        </>}
        {activeSpace?.id && userId && <AssistantActionReview userId={userId} spaceId={activeSpace.id} weekStart={analytics.weekly.start} />}
      </article>
      {contextOpen && <InsightDialog className="checkin-context-modal" label={t('whatContributedFeeling')} onClose={() => setContextOpen(false)}><div className="checkin-context-heading"><span><ListFilter size={20} aria-hidden="true" /></span><div><p className="eyebrow">{t('weeklyCheckIn')}</p><h2>{t('whatContributedFeeling')}</h2></div></div><div className="checkin-context-options">{tagOptions.map((tag) => <button className={tags.includes(tag) ? 'active' : ''} type="button" key={tag} onClick={() => toggleTag(tag)}><span>{t(tag)}</span>{tags.includes(tag) && <Check size={14} aria-hidden="true" />}</button>)}</div><div className="checkin-context-footer"><span>{t('contextSelected', { count: tags.length })}</span><button className="checkin-context-done" type="button" onClick={() => setContextOpen(false)}>{t('done')}</button></div></InsightDialog>}
      {calendarOpen && <InsightDialog label={t('viewStreakCalendar')} onClose={() => setCalendarOpen(false)}><p className="eyebrow">{t('checkInStreak')}</p><div className="checkin-month-navigation"><button className="icon-button" type="button" aria-label={t('checkinPreviousMonth')} onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}><ArrowLeft size={18} /></button><h2>{calendarMonthLabel}</h2><button className="icon-button" type="button" aria-label={t('checkinNextMonth')} onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}><ArrowRight size={18} /></button></div><div className="checkin-streak modal-calendar"><div><span>{t('checkInStreak')}</span><strong>{currentStreak} {t(currentStreak === 1 ? 'week' : 'weeks')}</strong></div><div className="checkin-streak-calendar" role="grid" aria-label={`${calendarMonthLabel} ${t('checkInStreak')}`}>{weekdayLabels.map((label, index) => <span className="calendar-weekday" role="columnheader" key={`${label}-${index}`}>{label}</span>)}{calendarDays.map((day, index) => { if (!day) return <span className="calendar-day empty" aria-hidden="true" key={`empty-${index}`} />; const key = dateKey(new Date(calendarYear, calendarMonth, day)); const isComplete = completedDates.has(key); const isToday = key === todayKey; return <span className={`calendar-day ${isComplete ? 'complete' : ''} ${isToday ? 'current' : ''}`} role="gridcell" key={key} aria-label={`${day} ${calendarMonthLabel}: ${isComplete ? t('checkInComplete') : t('notCompleted')}`}><b>{day}</b>{isComplete && <Check size={12} aria-hidden="true" />}</span> })}</div><small>{t('checkinDatesMarked')}</small>{records.some(item => !item.completedDate) && <small>{t('checkinUnknownDates')}</small>}</div></InsightDialog>}
      <MonthlyReflectionEntry analytics={analytics} currency={currency} />
    </>
  )
}
