import { CalendarClock, Check, Pencil, SkipForward } from '../../icons'
import { Link } from 'react-router-dom'
import CategoryIcon from '../../components/CategoryIcon'
import { getLanguageLocale, useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { getUpcomingBills } from './upcomingBills.js'

export { getUpcomingBills } from './upcomingBills.js'

export default function UpcomingBillsCard({ bills, currency, busyId, onResolve, error }) {
  const { language, t } = useLanguage()
  if (bills.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  const dateLabel = (value) => new Intl.DateTimeFormat(getLanguageLocale(language), {
    month: 'short', day: 'numeric',
  }).format(new Date(`${value}T12:00:00`))

  return (
    <section className="panel upcoming-bills-panel">
      <div className="panel-heading upcoming-bills-heading">
        <div>
          <p className="eyebrow"><CalendarClock size={15} /> {t('dueSoon')}</p>
          <h2>{t('upcomingBills')}</h2>
          <p className="muted">{t('upcomingBillsCopy', { count: bills.length })}</p>
        </div>
        <Link className="secondary button-link" to="/budget"><Pencil size={15} /> {t('manage')}</Link>
      </div>
      <div className="upcoming-bills-list">
        {bills.map((bill) => (
          <article className="upcoming-bill-row" key={bill.id}>
            <CategoryIcon category={bill.category} />
            <div className="upcoming-bill-copy">
              <strong>{bill.name}</strong>
              <span className={bill.due_date < today ? 'overdue' : ''}>
                {bill.due_date < today ? t('overdue') : t('dueOn')} · {dateLabel(bill.due_date)}
              </span>
            </div>
            <strong className="upcoming-bill-amount">{formatCurrency(bill.amount, currency)}</strong>
            <div className="upcoming-bill-actions">
              <button className="secondary compact" type="button" disabled={busyId === bill.id} onClick={() => onResolve(bill.id, 'skipped')}><SkipForward size={15} /> {t('skipThisMonth')}</button>
              <button className="primary compact" type="button" disabled={busyId === bill.id} onClick={() => onResolve(bill.id, 'paid')}><Check size={15} /> {t('markPaid')}</button>
            </div>
          </article>
        ))}
      </div>
      {error && <div className="auth-message error upcoming-bill-error">{error}</div>}
    </section>
  )
}
