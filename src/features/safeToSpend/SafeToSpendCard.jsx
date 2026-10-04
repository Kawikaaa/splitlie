import { ChevronDown, ChevronUp, ShieldCheck } from '../../icons'
import { useId, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import CategoryIcon from '../../components/CategoryIcon'
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
            <p>{negative ? t('safeNegative', { amount: money(Math.abs(result.safeToSpend), currency) }) : t('safeFormulaCopy')}</p>
          </div>
        </div>
        <button type="button" className="safe-breakdown-button" aria-expanded={open} aria-controls={open ? breakdownId : undefined} onClick={() => setOpen(value => !value)}>{t('viewBreakdown')} {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      </div>
      {open && (
        <div className="safe-breakdown" id={breakdownId}>
          <div className="safe-breakdown-row"><span>{t('monthlyBudget')}</span><strong>{money(result.budgetAmount, currency)}</strong></div>
          {result.fixedExpenses.map(item => <div className="safe-obligation-row" key={item.id}><CategoryIcon category={item.category} size={15} /><div><strong>{item.name}</strong><span>{t('monthlyDueDay', { day: item.dueDay })}</span></div><strong>-{money(item.amount, currency)}</strong></div>)}
          <div className="safe-breakdown-row"><span>{t('fixedExpenses')}</span><strong>-{money(result.fixedAmount, currency)}</strong></div>
          <div className="safe-breakdown-row"><span>{t('spentThisMonth')}</span><strong>-{money(result.spentAmount, currency)}</strong></div>
          <div className="safe-breakdown-row total"><span>{t('safeToSpend')}</span><strong>{money(result.safeToSpend, currency)}</strong></div>
        </div>
      )}
    </section>
  )
}
