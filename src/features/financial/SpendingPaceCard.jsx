import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function SpendingPaceCard({ result, currency }) {
  const { t, locale } = useLanguage()
  const { pace } = result
  const percent = value => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value)
  const daily = value => value === null ? '—' : t('perDay', { amount: formatCurrency(value, currency) })
  return (
    <section className="panel spending-pace-panel">
      <div className="panel-heading"><div><p className="eyebrow">{t('spendingPlan')}</p><h2>{t('spendingPace')}</h2></div></div>
      <p className="pace-status">{t(`pace_${pace.status}`)}</p>
      <dl className="pace-metrics">
        <div><dt>{t('periodProgress')}</dt><dd>{percent(pace.periodProgress)}</dd></div>
        <div><dt>{t('planUsage')}</dt><dd>{pace.planUsage === null ? '—' : percent(pace.planUsage)}</dd></div>
        <div><dt>{t('currentDailyPace')}</dt><dd>{daily(pace.currentDailyPace)}</dd></div>
        <div><dt>{t('comfortableDailyPace')}</dt><dd>{daily(pace.comfortableDailyPace)}</dd></div>
      </dl>
      {pace.comfortableDailyPace !== null && pace.status !== 'not_started' && <p className="muted">{t('comfortablePaceCopy', { amount: formatCurrency(pace.comfortableDailyPace, currency), days: pace.remainingDays })}</p>}
    </section>
  )
}
