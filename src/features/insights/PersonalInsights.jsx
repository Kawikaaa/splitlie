import ModalSurface from '../../components/ModalSurface'
import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarCheck, Check, CircleAlert, ListFilter, Sparkles, X } from '../../icons'
import CategoryIcon from '../../components/CategoryIcon'
import { getCategoryTranslationKey } from '../../components/CategorySelect'
import { getLanguageLocale, useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

function money(value, currency) { return formatCurrency(value || 0, currency) }
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

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
  const max = rows[0]?.amount || 1
  return (
    <section className="fin-card fin-breakdown-card">
      <div className="fin-card-heading"><div><p className="eyebrow">{t('whereItWent')}</p><h2>{t('spendingBreakdown')}</h2></div></div>
      {rows.length === 0 ? <div className="empty-state">{t('notEnoughSpendingData')}</div> : (
        <div className="fin-breakdown-list">
          {rows.map((item) => (
            <div className="fin-breakdown-row" key={item.category}>
              <span className="fin-category-icon"><CategoryIcon category={item.category} /></span>
              <div className="fin-breakdown-copy"><span>{t(getCategoryTranslationKey(item.category))}</span><div className="fin-breakdown-track"><i style={{ width: `${Math.max(5, item.amount / max * 100)}%` }} /></div></div>
              <strong>{money(item.amount, currency)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function WeeklyRecapDetail({ analytics, currency, onClose }) {
  const { t } = useLanguage()
  const { weekly } = analytics
  const maxHistory = Math.max(weekly.total, ...weekly.history.map((item) => item.value), 1)
  return (
    <InsightDialog label={t('weeklyRecap')} onClose={onClose}>
      <p className="eyebrow">{t('thisWeek')}</p>
      <h2>{t('weeklyRecap')}</h2>
      <p className="insight-period">{weekly.start} · {weekly.end}</p>
      <div className="insight-hero-value"><strong>{money(weekly.total, currency)}</strong><span>{t('spentThisWeek')}</span></div>
      <p className="insight-comparison">
        {weekly.hasReliableBaseline
          ? t(weekly.absoluteChange <= 0 ? 'belowWeeklyAverage' : 'aboveWeeklyAverage', { amount: money(Math.abs(weekly.absoluteChange), currency) })
          : t('buildingBaselineCopy')}
      </p>
      {weekly.history.length > 0 && (
        <div className="insight-history" aria-label={t('recentWeeklyPattern')}>
          {weekly.history.map((item, index) => <div key={item.label}><span>{t('weekNumber', { count: index + 1 })}</span><i style={{ height: `${Math.max(8, item.value / maxHistory * 100)}%` }} /><strong>{money(item.value, currency)}</strong></div>)}
          <div className="current"><span>{t('thisWeek')}</span><i style={{ height: `${Math.max(8, weekly.total / maxHistory * 100)}%` }} /><strong>{money(weekly.total, currency)}</strong></div>
        </div>
      )}
      <div className="insight-section">
        <h3>{t('meaningfulChanges')}</h3>
        {weekly.meaningfulChanges.length === 0 ? <p className="muted">{t(weekly.hasReliableBaseline ? 'noMeaningfulChanges' : 'buildingBaseline')}</p> : weekly.meaningfulChanges.map((item) => (
          <div className="insight-change-row" key={item.category}>
            <CategoryIcon category={item.category} />
            <span><strong>{t(getCategoryTranslationKey(item.category))}</strong><small>{t(item.absoluteChange <= 0 ? 'belowRecentAverage' : 'aboveRecentAverage', { amount: money(Math.abs(item.absoluteChange), currency) })}</small></span>
            <b>{money(item.currentValue, currency)}</b>
          </div>
        ))}
      </div>
      {weekly.largestPurchase && <div className="insight-section"><h3>{t('largestPurchase')}</h3><div className="insight-transaction-row"><span><strong>{weekly.largestPurchase.description}</strong><small>{weekly.largestPurchase.date}</small></span><b>{money(weekly.largestPurchase.amount, currency)}</b></div></div>}
    </InsightDialog>
  )
}

export function WeeklyRecapCard({ analytics, currency }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
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
        <div className="weekly-change-list">
          {changes.length > 0 ? changes.map((item) => (
            <div className="weekly-change-row" key={item.category}>
              <CategoryIcon category={item.category} />
              <span><strong>{t(getCategoryTranslationKey(item.category))}</strong><small>{t(item.absoluteChange <= 0 ? 'belowRecentAverage' : 'aboveRecentAverage', { amount: money(Math.abs(item.absoluteChange), currency) })}</small></span>
            </div>
          )) : <p className="weekly-calm-state">{t(weekly.hasReliableBaseline ? 'noMeaningfulChanges' : 'buildingBaselineCopy')}</p>}
        </div>
        <button className="insight-link" type="button" onClick={() => setOpen(true)}>{t('viewWeeklyRecap')} <ArrowRight size={16} /></button>
      </section>
      {open && <WeeklyRecapDetail analytics={analytics} currency={currency} onClose={() => setOpen(false)} />}
    </>
  )
}

function signalCopy(signal, t, currency) {
  const category = t(getCategoryTranslationKey(signal.category))
  if (signal.type === 'category_shift') return { title: t('categoryRunningHigher', { category }), description: t('aboveRecentAverage', { amount: money(Math.abs(signal.absoluteChange), currency) }) }
  if (signal.type === 'positive_signal') return { title: t('categoryStayedLower', { category }), description: t('belowRecentAverage', { amount: money(Math.abs(signal.absoluteChange), currency) }) }
  if (signal.type === 'frequency_change') return { title: t('categoryMoreFrequent', { category }), description: t('frequencyComparison', { current: signal.transactionCount, baseline: Math.round(signal.baselineTransactionCount) }) }
  if (signal.type === 'small_purchase_accumulation') return { title: t('smallPurchasesAddedUp'), description: t('smallPurchaseSummary', { count: signal.transactionCount, amount: money(signal.currentValue, currency) }) }
  return { title: t('onePurchaseChangedTotal'), description: signal.contributingTransactions[0]?.description || category }
}

function SignalDetail({ signal, currency, activeSpace, onClose }) {
  const { t } = useLanguage()
  const copy = signalCopy(signal, t, currency)
  const stored = readJson(`splitlie:weekly-checkins:${activeSpace.id}`, [])
  const related = Array.isArray(stored) ? stored.find((item) => typeof item === 'object' && item.week === signal.timePeriod.start) : null
  const history = [...(signal.history || []), { label: t('thisWeek'), value: signal.type === 'frequency_change' ? signal.transactionCount : signal.currentValue }]
  const max = Math.max(...history.map((item) => item.value), 1)
  return (
    <InsightDialog label={copy.title} onClose={onClose}>
      <p className="eyebrow">{t('moneySignal')}</p><h2>{copy.title}</h2><p className="insight-comparison">{copy.description}</p>
      <div className="insight-hero-value"><strong>{money(signal.currentValue, currency)}</strong><span>{t('thisWeek')}</span></div>
      <div className="insight-section"><h3>{t('whatChanged')}</h3><p>{signal.type === 'frequency_change' ? t('frequencyDetail', { current: signal.transactionCount, baseline: Math.round(signal.baselineTransactionCount) }) : t('valueDetail', { current: money(signal.currentValue, currency), baseline: money(signal.baselineValue, currency) })}</p></div>
      {signal.contributingTransactions.length > 0 && <div className="insight-section"><h3>{t('whatContributed')}</h3>{signal.contributingTransactions.map((item) => <div className="insight-transaction-row" key={item.id || `${item.date}-${item.amount}`}><span><strong>{item.description}</strong><small>{item.date}</small></span><b>{money(item.amount, currency)}</b></div>)}</div>}
      {history.length > 1 && <div className="insight-section"><h3>{t('comparedWithPattern')}</h3><div className="signal-history-list">{history.map((item, index) => <div key={`${item.label}-${index}`}><span>{item.label}</span><i><b style={{ width: `${Math.max(5, item.value / max * 100)}%` }} /></i><strong>{signal.type === 'frequency_change' ? Math.round(item.value) : money(item.value, currency)}</strong></div>)}</div></div>}
      {related && <div className="insight-section reflection-context"><h3>{t('yourReflection')}</h3><p>{t('youSaid')} <strong>{t(related.feeling)}</strong></p>{related.tags?.length > 0 && <small>{related.tags.map((tag) => t(tag)).join(' · ')}</small>}</div>}
    </InsightDialog>
  )
}

export function MoneySignalsPanel({ analytics, currency, activeSpace }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(null)
  const signals = analytics.signals.slice(0, 4)
  return (
    <>
      <section className="fin-card fin-signals-card">
        <div className="fin-card-heading"><div><p className="eyebrow">{t('worthNoticing')}</p><h2>{t('moneySignals')}</h2></div><span className="fin-heading-icon"><Sparkles size={19} /></span></div>
        {signals.length === 0 ? <div className="fin-signal-empty"><Sparkles size={18} /><div><strong>{t('buildingBaseline')}</strong><span>{t('buildingBaselineCopy')}</span></div></div> : <div className="fin-signal-list">{signals.map((signal) => { const copy = signalCopy(signal, t, currency); const Icon = signal.direction === 'lower' ? ArrowDownRight : signal.type === 'large_purchase' ? CircleAlert : ArrowUpRight; return <button className={`fin-signal ${signal.direction === 'lower' ? 'positive' : 'info'}`} type="button" key={`${signal.type}-${signal.category}`} onClick={() => setSelected(signal)}><Icon size={18} /><span><strong>{copy.title}</strong><small>{copy.description}</small></span><ArrowRight size={16} /></button> })}</div>}
      </section>
      {selected && <SignalDetail signal={selected} currency={currency} activeSpace={activeSpace} onClose={() => setSelected(null)} />}
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

export function ReflectionPanel({ analytics, activeSpace, currency }) {
  const { language, t } = useLanguage()
  const checkKey = `splitlie:weekly-checkins:${activeSpace.id}`
  const legacyKey = `splitly:weekly-checkins:${activeSpace.id}`
  const initial = readJson(checkKey, readJson(legacyKey, []))
  const normalized = Array.isArray(initial) ? initial.map((item) => typeof item === 'string' ? { week: item, completed: true } : item) : []
  const existing = normalized.find((item) => item.week === analytics.weekly.start)
  const [records, setRecords] = useState(normalized)
  const [feeling, setFeeling] = useState(existing?.feeling || '')
  const [tags, setTags] = useState(existing?.tags || [])
  const [complete, setComplete] = useState(Boolean(existing?.completed))
  const [contextOpen, setContextOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const feelingOptions = ['comfortable', 'aboutRight', 'higherThanLiked']
  const tagOptions = ['diningOut', 'socialActivities', 'shoppingReason', 'transportationReason', 'travelReason', 'unexpectedExpense', 'otherReason']
  const completedWeeks = new Set(records.filter((item) => item?.completed).map((item) => item.week))
  if (complete) completedWeeks.add(analytics.weekly.start)
  const streakWeeks = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(`${analytics.weekly.start}T12:00:00`)
    date.setDate(date.getDate() - ((7 - index) * 7))
    const week = date.toISOString().slice(0, 10)
    return {
      week,
      complete: completedWeeks.has(week),
      current: week === analytics.weekly.start,
      label: new Intl.DateTimeFormat(getLanguageLocale(language), { month: 'short', day: 'numeric' }).format(date),
    }
  })
  let currentStreak = 0
  for (let index = streakWeeks.length - 1; index >= 0 && streakWeeks[index].complete; index -= 1) currentStreak += 1

  const calendarDate = new Date(`${analytics.weekly.start}T12:00:00`)
  const calendarYear = calendarDate.getFullYear()
  const calendarMonth = calendarDate.getMonth()
  const firstDayOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calendarDays = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  const dateKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const completedDates = new Set(records.filter((item) => item?.completed).map((item) => {
    if (!item.completedAt) return item.week
    const completedAt = new Date(item.completedAt)
    return Number.isNaN(completedAt.getTime()) ? item.week : dateKey(completedAt)
  }))
  if (complete && !existing?.completedAt) completedDates.add(analytics.weekly.start)
  const todayKey = dateKey(new Date())
  const calendarMonthLabel = new Intl.DateTimeFormat(getLanguageLocale(language), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(calendarYear, calendarMonth, 1))
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(getLanguageLocale(language), {
    weekday: 'narrow',
  }).format(new Date(2026, 0, 5 + index)))

  function toggleTag(tag) { setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]) }
  function finish() {
    if (!feeling) return
    const record = { week: analytics.weekly.start, feeling, tags, completed: true, completedAt: new Date().toISOString() }
    const next = [...records.filter((item) => item.week !== analytics.weekly.start), record]
    setRecords(next); setComplete(true); localStorage.setItem(checkKey, JSON.stringify(next))
  }

  return (
    <>
      <article className="fin-card fin-checkin-card awareness-checkin-card">
        <div className="checkin-heading"><span className="checkin-icon">{complete ? <Check size={19} /> : <CalendarCheck size={19} />}</span><div><p className="eyebrow">{t('weeklyCheckIn')}</p><h2>{complete ? t('checkInComplete') : t('howSpendingFelt')}</h2></div></div>
        {complete ? <div className="checkin-complete-layout">
          <div className="checkin-complete"><strong>{feeling ? t(feeling) : t('checkInCompleteCopy')}</strong>{tags.length > 0 && <span>{tags.map((tag) => t(tag)).join(' · ')}</span>}<small>{t('checkInSaved')}</small></div>
          <button className="checkin-calendar-trigger" type="button" onClick={() => setCalendarOpen(true)}><CalendarCheck size={18} /><span>{t('viewStreakCalendar')}</span><strong>{currentStreak} {t(currentStreak === 1 ? 'week' : 'weeks')}</strong></button>
        </div> : <>
          <div className="checkin-options">{feelingOptions.map((value) => <button className={feeling === value ? 'active' : ''} type="button" key={value} onClick={() => setFeeling(value)}>{t(value)}</button>)}</div>
          <div className="checkin-actions"><button className="checkin-context-trigger" type="button" disabled={!feeling} onClick={() => setContextOpen(true)}><ListFilter size={15} aria-hidden="true" /><span>{tags.length > 0 ? t('contextSelected', { count: tags.length }) : t('addContext')}</span></button><button className="checkin-submit" type="button" disabled={!feeling} onClick={finish}>{t('completeCheckIn')}</button></div>
        </>}
      </article>
      {contextOpen && <InsightDialog className="checkin-context-modal" label={t('whatContributedFeeling')} onClose={() => setContextOpen(false)}><div className="checkin-context-heading"><span><ListFilter size={20} aria-hidden="true" /></span><div><p className="eyebrow">{t('weeklyCheckIn')}</p><h2>{t('whatContributedFeeling')}</h2></div></div><div className="checkin-context-options">{tagOptions.map((tag) => <button className={tags.includes(tag) ? 'active' : ''} type="button" key={tag} onClick={() => toggleTag(tag)}><span>{t(tag)}</span>{tags.includes(tag) && <Check size={14} aria-hidden="true" />}</button>)}</div><div className="checkin-context-footer"><span>{t('contextSelected', { count: tags.length })}</span><button className="checkin-context-done" type="button" onClick={() => setContextOpen(false)}>{t('done')}</button></div></InsightDialog>}
      {calendarOpen && <InsightDialog label={t('viewStreakCalendar')} onClose={() => setCalendarOpen(false)}><p className="eyebrow">{t('checkInStreak')}</p><h2>{calendarMonthLabel}</h2><div className="checkin-streak modal-calendar"><div><span>{t('checkInStreak')}</span><strong>{currentStreak} {t(currentStreak === 1 ? 'week' : 'weeks')}</strong></div><div className="checkin-streak-calendar" role="grid" aria-label={`${calendarMonthLabel} ${t('checkInStreak')}`}>{weekdayLabels.map((label, index) => <span className="calendar-weekday" role="columnheader" key={`${label}-${index}`}>{label}</span>)}{calendarDays.map((day, index) => { if (!day) return <span className="calendar-day empty" aria-hidden="true" key={`empty-${index}`} />; const key = dateKey(new Date(calendarYear, calendarMonth, day)); const isComplete = completedDates.has(key); const isToday = key === todayKey; return <span className={`calendar-day ${isComplete ? 'complete' : ''} ${isToday ? 'current' : ''}`} role="gridcell" key={key} aria-label={`${day} ${calendarMonthLabel}: ${isComplete ? t('checkInComplete') : t('notCompleted')}`}><b>{day}</b>{isComplete && <Check size={12} aria-hidden="true" />}</span> })}</div><small>{t('completedWeeksMarked')}</small></div></InsightDialog>}
      <MonthlyReflectionEntry analytics={analytics} currency={currency} />
    </>
  )
}
