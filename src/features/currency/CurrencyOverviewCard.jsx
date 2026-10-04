import { ArrowRightLeft, Check } from '../../icons'
import { useMemo } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { SUPPORTED_CURRENCIES } from '../../services/currency/currencyService'

export default function CurrencyOverviewCard({ transactions = [], baseCurrency = 'USD' }) {
  const { t } = useLanguage()
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60 * 1000
  const currentMonth = new Date(now.getTime() - offset).toISOString().slice(0, 7)
  const summary = useMemo(() => {
    const groups = new Map()
    let convertedCount = 0
    transactions
      .filter((item) => item.transaction_date?.startsWith(currentMonth))
      .forEach((item) => {
        const currency = item.currency || baseCurrency
        if (currency === baseCurrency) return
        convertedCount += 1
        groups.set(currency, (groups.get(currency) || 0) + Number(item.amount || 0))
      })
    return { convertedCount, groups: [...groups.entries()] }
  }, [transactions, baseCurrency, currentMonth])

  return (
    <section className="currency-overview-card">
      <div className="currency-overview-heading">
        <div className="currency-overview-icon"><ArrowRightLeft size={18} /></div>
        <div>
          <p className="eyebrow">{t('multiCurrency')}</p>
          <h2>{t('currencyOverview')}</h2>
          <p>{t('currencyOverviewCopy')}</p>
        </div>
        <div className="base-currency-badge">
          <span>{t('baseCurrency')}</span>
          <strong>{baseCurrency}</strong>
        </div>
      </div>

      <div className="currency-overview-body">
        {summary.groups.length > 0 ? (
          <div className="currency-activity-list">
            {summary.groups.map(([currency, amount]) => (
              <div key={currency}>
                <span>{currency}</span>
                <strong>{formatCurrency(amount, currency)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="currency-ready-state">
            <Check size={16} />
            <span>{t('multiCurrencyReady')}</span>
          </div>
        )}
        <div className="currency-support-note">
          <strong>{SUPPORTED_CURRENCIES.length}</strong>
          <span>{t('currenciesSupported')}</span>
          <small>{t('convertedThisMonth', { count: summary.convertedCount })}</small>
        </div>
      </div>
    </section>
  )
}
