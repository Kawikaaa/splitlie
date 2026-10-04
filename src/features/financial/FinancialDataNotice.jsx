import { CircleAlert, ListFilter } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'

export default function FinancialDataNotice({ quality }) {
  const { t, locale } = useLanguage()
  const caution = quality.state !== 'recent_entry'
  const Icon = caution ? CircleAlert : ListFilter
  const date = quality.lastEntryDate ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${quality.lastEntryDate}T12:00:00`)) : null
  return (
    <aside className={`financial-data-notice ${caution ? 'caution' : ''}`} aria-label={t('financialDataBasis')}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{t('financialDataBasis')}</strong>
        <p>{t('recordedDataBasis', { count: quality.recordedCount, obligations: quality.obligationCount })}{date && ` · ${t('lastRecordedEntry', { date })}`}</p>
        <p>{t('signalRecordedBasis')}</p>
        {caution && <p>{t(`data_${quality.state}`, { days: quality.daysSinceEntry })}</p>}
        {!quality.hasPlan && quality.state !== 'load_failed' && <p>{t('pace_no_plan')}</p>}
      </div>
      {quality.state === 'load_failed' && <button className="secondary" onClick={() => window.location.reload()}>{t('retry')}</button>}
    </aside>
  )
}
