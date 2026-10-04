import ModalSurface from '../../components/ModalSurface'
import { ArrowDownLeft, ArrowUpRight, ReceiptText, X } from '../../icons'
import { buildBalanceActivity } from './balanceActivity'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

function money(value, currency = 'USD') {
  return formatCurrency(Math.abs(Number(value) || 0), currency)
}

function formatDate(value, locale = 'en-US') {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export default function BalanceDetailsModal({
  balance, transactions, splits, settlements, activeSpace, user, onClose,
}) {
  const { t, language } = useLanguage()
  if (!balance) return null

  const fromName = balance.from.display_name || 'Member'
  const toName = balance.to.display_name || 'Member'
  const debtorName = balance.from.user_id === user?.id ? t('you') : fromName
  const creditorName = balance.to.user_id === user?.id ? t('you') : toName
  const currency = activeSpace.currency || 'USD'
  const activity = buildBalanceActivity({ balance, transactions, splits, settlements })

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <ModalSurface as="section" onClose={onClose} busy={false} className="balance-details-modal" role="dialog" aria-modal="true"
        aria-labelledby="balance-details-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('balanceBreakdown')}</p>
            <h2 id="balance-details-title">
              {t('owes', { from: debtorName, to: creditorName })}
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t('closeDetails')}>
            <X size={19} />
          </button>
        </div>

        <div className="balance-details-total">
          <span>{t('outstandingNetBalance')}</span>
          <strong>{money(balance.amount, currency)}</strong>
        </div>

        <p className="balance-details-explanation">
          {t('balanceExplanation')}
        </p>

        <div className="balance-activity-list">
          {activity.length === 0 ? (
            <div className="empty-state">{t('noSourceActivity')}</div>
          ) : activity.map((item) => {
            const increasesDebt = item.impact > 0
            return (
              <div className="balance-activity-row" key={item.id}>
                <div className={`balance-activity-icon ${increasesDebt ? 'increase' : 'decrease'}`}>
                  {item.kind === 'settlement' ? <ArrowDownLeft size={16} />
                    : increasesDebt ? <ArrowUpRight size={16} /> : <ReceiptText size={16} />}
                </div>
                <div className="balance-activity-main">
                  <strong>{item.description}</strong>
                  <span>
                    {formatDate(item.date, language === 'zh' ? 'zh-CN' : 'en-US')} · {item.kind === 'transaction'
                      ? t('sharedTransaction')
                      : item.kind === 'reversal'
                        ? t('settlementReversal')
                        : t('repayment')}
                  </span>
                </div>
                <div className={`balance-activity-impact ${increasesDebt ? 'increase' : 'decrease'}`}>
                  <strong>{increasesDebt ? '+' : '−'}{money(item.impact, currency)}</strong>
                  <span>{increasesDebt ? t('added') : t('reduced')}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="primary" type="button" onClick={onClose}>{t('done')}</button>
        </div>
      </ModalSurface>
    </div>
  )
}
