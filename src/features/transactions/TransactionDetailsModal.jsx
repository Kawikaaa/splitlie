import ModalSurface from '../../components/ModalSurface'
import { ArrowRightLeft, CalendarDays, Check, Pencil, ReceiptText, UserRound, UsersRound, X } from '../../icons'
import { getLanguageLocale, useLanguage } from '../../i18n/LanguageContext'
import { getCategoryTranslationKey } from '../../components/CategorySelect'
import { formatCurrency } from '../../services/currency/currencyFormatter'

function money(value, currency = 'USD') {
  return formatCurrency(value, currency)
}

function formatDate(value, locale, noDate) {
  if (!value) return noDate

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

export default function TransactionDetailsModal({
  transaction,
  splits,
  members,
  activeSpace,
  user,
  canManage,
  locked,
  onClose,
  onEdit,
  onDelete,
}) {
  const { language, t } = useLanguage()
  if (!transaction) return null

  const currency = transaction.currency || activeSpace.currency || 'USD'
  const baseCurrency = transaction.base_currency || activeSpace.currency || 'USD'
  const hasConversion = currency !== baseCurrency && transaction.base_amount != null
  const conversionComplete = (transaction.conversion_status || 'converted') === 'converted'
  const description = transaction.description || t(getCategoryTranslationKey(transaction.category)) || t('transaction')
  const payer = members.find((member) => member.user_id === transaction.paid_by)
  const payerName = transaction.paid_by === user?.id
    ? t('you')
    : payer?.display_name || t('member')
  const expense = transaction.type === 'expense'
  const splitType = transaction.split_type || 'none'

  function memberName(userId) {
    if (userId === user?.id) return t('you')
    return members.find((member) => member.user_id === userId)?.display_name || t('member')
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <ModalSurface as="section" onClose={onClose} busy={false}
        className="transaction-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('transactionDetails')}</p>
            <h2 id="transaction-details-title">{description}</h2>
          </div>

          <button className="icon-button" type="button" onClick={onClose} aria-label={t('closeDetails')}>
            <X size={19} />
          </button>
        </div>

        <div className={`transaction-details-amount ${expense ? 'expense' : 'income'}`}>
          <div>
            <span>{hasConversion ? t('originalAmount') : expense ? t('expense') : t('income')}</span>
            <strong>{expense ? '-' : '+'}{money(transaction.amount, currency)}</strong>
          </div>
          {hasConversion && <ArrowRightLeft size={18} aria-hidden="true" />}
          {hasConversion && (
            <div className="transaction-details-base-amount">
              <span>{t('spaceAmount')}</span>
              <strong>{expense ? '-' : '+'}{money(transaction.base_amount, baseCurrency)}</strong>
            </div>
          )}
        </div>

        {hasConversion && (
          <div className="transaction-fx-audit">
            <div>
              <span className={`conversion-status ${conversionComplete ? 'complete' : ''}`}>
                <Check size={13} /> {conversionComplete ? t('conversionComplete') : t('conversionPending')}
              </span>
              <strong>{t('rateUsed', {
                from: currency,
                to: baseCurrency,
                rate: Number(transaction.exchange_rate || 0).toFixed(6),
              })}</strong>
            </div>
            <small>{t('rateDate', { date: formatDate(transaction.exchange_rate_date, getLanguageLocale(language), t('noDate')) })}</small>
          </div>
        )}

        <dl className="transaction-details-grid">
          <div>
            <dt><ReceiptText size={16} /> {t('category')}</dt>
            <dd>{t(getCategoryTranslationKey(transaction.category))}</dd>
          </div>
          <div>
            <dt><CalendarDays size={16} /> {t('date')}</dt>
            <dd>{formatDate(transaction.transaction_date, getLanguageLocale(language), t('noDate'))}</dd>
          </div>
          {expense && activeSpace.type === 'shared' && (
            <div>
              <dt><UserRound size={16} /> {t('paidBy')}</dt>
              <dd>{payerName}</dd>
            </div>
          )}
          {expense && activeSpace.type === 'shared' && (
            <div>
              <dt><UsersRound size={16} /> {t('splitMethod')}</dt>
              <dd>{splitType === 'none' ? t('dontSplit') : splitType === 'equal' ? t('equal') : splitType === 'percentage' ? t('percentage') : t('custom')}</dd>
            </div>
          )}
        </dl>

        {expense && splits.length > 0 && (
          <div className="transaction-details-splits">
            <div className="transaction-details-section-title">
              <span>{t('participant')}</span>
              <span>{t('share')}</span>
            </div>
            {splits.map((split) => (
              <div className="transaction-details-split-row" key={split.id}>
                <span>{memberName(split.user_id)}</span>
                <strong>{money(split.amount, baseCurrency)}</strong>
              </div>
            ))}
          </div>
        )}

        {locked && (
          <p className="transaction-details-note">{t('settlementLocked')}</p>
        )}

        <div className="modal-actions transaction-details-actions">
          {canManage && !locked && (
            <>
              <button className="secondary" type="button" onClick={onEdit}>
                <Pencil size={16} /> {t('edit')}
              </button>
              <button className="danger-action" type="button" onClick={onDelete}>
                {t('deleteTransaction')}
              </button>
            </>
          )}
          <button className="primary" type="button" onClick={onClose}>{t('done')}</button>
        </div>
      </ModalSurface>
    </div>
  )
}
