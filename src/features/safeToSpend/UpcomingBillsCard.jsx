import { CalendarClock, Check, Pencil, SkipForward } from '../../icons'
import { Link } from 'react-router-dom'
import CategoryIcon from '../../components/CategoryIcon'
import { getLanguageLocale, useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { getUpcomingBills } from './upcomingBills.js'
import { useState } from 'react'
import { getLocalDateKey } from '../../utils/dateKeys.js'
import './Recurring.css'

export { getUpcomingBills } from './upcomingBills.js'

export default function UpcomingBillsCard({ bills, currency, busyId, onResolve, error, wholeMonth = false, showManage = true }) {
  const { language, t } = useLanguage()
  const [paymentDates, setPaymentDates] = useState({})
  if (bills.length === 0) return null

  const today = getLocalDateKey()
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
          <p className="muted recurring-window">{t(wholeMonth ? 'recurringMonthWindow' : 'recurringWindow')}</p>
        </div>
        {showManage && <Link className="secondary button-link" to="/budget"><Pencil size={15} /> {t('manage')}</Link>}
      </div>
      <div className="upcoming-bills-list">
        {bills.map((bill) => (
          <article className="upcoming-bill-row" key={bill.occurrence_key}>
            <CategoryIcon category={bill.category} />
            <div className="upcoming-bill-copy">
              <strong>{bill.name}</strong>
              <span className={bill.due_date < today ? 'overdue' : ''}>
                {bill.due_date < today ? t('overdue') : t('dueOn')} · {dateLabel(bill.due_date)}
              </span>
            </div>
            <strong className="upcoming-bill-amount">{formatCurrency(bill.amount, currency)}</strong>
            <form className="upcoming-bill-actions" onSubmit={event => {
              event.preventDefault()
              if (busyId || !event.currentTarget.reportValidity()) return
              onResolve(bill, 'paid', event.currentTarget.elements.namedItem('paid_on').value)
            }}>
              <label className="recurring-payment-date">{t('recurringPaidOn')}<input name="paid_on" type="date" aria-label={`${t('recurringPaidOn')} · ${bill.name} · ${bill.due_date}`} max={today} required value={paymentDates[bill.occurrence_key] ?? today} disabled={Boolean(busyId)} onInput={event => setPaymentDates(dates => ({ ...dates, [bill.occurrence_key]: event.target.value }))} onChange={event => setPaymentDates(dates => ({ ...dates, [bill.occurrence_key]: event.target.value }))} /></label>
              <button className="secondary compact" type="button" disabled={Boolean(busyId)} onClick={() => onResolve(bill, 'skipped')}><SkipForward size={15} /> {t('skipOccurrence')}</button>
              <button className="primary compact" type="submit" disabled={Boolean(busyId) || !(paymentDates[bill.occurrence_key] ?? today) || (paymentDates[bill.occurrence_key] ?? today) > today}><Check size={15} /> {busyId === bill.occurrence_key ? t('saving') : t('markPaid')}</button>
            </form>
          </article>
        ))}
      </div>
      {error && <div className="auth-message error upcoming-bill-error" role="alert">{error}</div>}
    </section>
  )
}
