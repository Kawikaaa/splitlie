import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function TransactionAccountField({ link, type, paymentStatus }) {
  const { t, locale } = useLanguage()
  return <div className="transaction-account-field">
    <label htmlFor="transaction-account">{t('moneyLinkAccount')}</label>
    <select id="transaction-account" value={link.accountId} disabled={link.reading} onChange={event => link.setAccountId(event.target.value)}>
      <option value="">{t('moneyNoAccount')}</option>
      {link.accounts.filter(account => !account.archived_at || account.id === link.accountId).map(account => <option key={account.id} value={account.id} disabled={Boolean(account.archived_at)}>{account.name} · {formatCurrency(Number(account.balance), account.currency, locale)}{account.archived_at ? ` · ${t('moneyArchived')}` : ''}</option>)}
      {link.accountId && !link.selected && <option value={link.accountId}>{t('moneyAccountUnavailable')}</option>}
    </select>
    <small>{t(!link.accountId ? 'moneyNoAccountHelp' : paymentStatus === 'upcoming' && type !== 'income' ? 'moneyAccountUpcoming' : link.selected?.type === 'credit_card' ? 'moneyCardMovement' : type === 'income' ? 'moneyAccountIncome' : 'moneyAccountExpense')}</small>
    {link.reading && <small role="status">{t('loading')}</small>}
    {link.readFailed && <small className="money-error" role="alert">{t('moneyLoadError')}</small>}
    {link.accountId && !link.ready && !link.reading && <small role="status">{t(link.failed || !link.selected ? 'moneyAccountUnavailable' : 'converting')}</small>}
    {link.accountAmount != null && <p className="account-movement-preview">{t('moneyAccountMovement', { amount: formatCurrency(link.accountAmount, link.selected.currency, locale) })}{link.quote.provider !== 'identity' && <small>{link.quote.provider} · {link.quote.date}</small>}</p>}
  </div>
}
