import { ChevronDown, ChevronUp, ShieldCheck } from '../../icons'
import { useId, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import useAnimatedNumber from '../../hooks/useAnimatedNumber'

function money(value, currency) { return formatCurrency(value, currency) }

export default function SafeToSpendCard({ result, currency, animateFromBudget = false }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const breakdownId = useId()
  const negative = result.safeToSpend < 0
  const displayedSafeToSpend = useAnimatedNumber(result.safeToSpend, {
    start: result.budgetAmount,
    duration: 1450,
    delay: 40,
    enabled: animateFromBudget,
  })
  return (
    <section className={`safe-to-spend-card fin-safe-card ${negative ? 'negative' : ''}`}>
      <div className="safe-to-spend-main">
        <div className="safe-to-spend-icon"><ShieldCheck size={22} /></div>
        <div>
          <span>{t('safeToSpend')}</span>
          <strong className="animated-amount" aria-label={money(result.safeToSpend, currency)}>{money(displayedSafeToSpend, currency)}</strong>
          <div className="safe-budget-copy">
            <small className="safe-budget-hint">{t('monthlyBudget')}: {money(result.budgetAmount, currency)}</small>
            <p>{t('safeFormulaV2')}</p>
          </div>
        </div>
        <button type="button" className="safe-breakdown-button" aria-expanded={open} aria-controls={open ? breakdownId : undefined} onClick={() => setOpen(value => !value)}>{t('whyThisNumber')} {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      </div>
      {open && (
        <div className="safe-breakdown" id={breakdownId}>
          {result.breakdown.map(item => <div className="safe-breakdown-row" key={item.key}><span>{t(item.key)}</span><strong>{money(item.amount, currency)}</strong></div>)}
          <div className="safe-breakdown-row total"><span>{t('safeToSpend')}</span><strong>{money(result.safeToSpend, currency)}</strong></div>
          {result.issues.length > 0 && <p>{t('calculationDataWarning')}</p>}
        </div>
      )}
    </section>
  )
}
