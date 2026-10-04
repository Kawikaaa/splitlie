import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function PercentageSplitEditor({
  participants,
  percentages,
  onChange,
  percentageTotal,
  calculatedSplits,
  getSecondaryText,
  currency = 'USD',
}) {
  const { t } = useLanguage()
  const amounts = new Map(
    calculatedSplits.map((split) => [split.user_id, split.amount])
  )

  return (
    <div className="custom-split-box">
      <div className="split-members">
        {participants.map((member) => (
          <div className="split-member-row" key={member.user_id}>
            <div className="split-member-person">
              <div className="member-avatar small">
                {member.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{member.display_name}</strong>
                <span>
                  {percentageTotal === 100
                    ? formatCurrency(amounts.get(member.user_id) || 0, currency)
                    : getSecondaryText(member)}
                </span>
              </div>
            </div>

            <div className="split-amount-input percentage-input">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                value={percentages[member.user_id] ?? ''}
                onChange={(event) => onChange(member.user_id, event.target.value)}
              />
              <span>%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={percentageTotal === 100 ? 'split-total valid' : 'split-total'}>
        <span>{t('percentageAllocated')}</span>
        <strong>{percentageTotal.toFixed(2).replace(/\.00$/, '')}% / 100%</strong>
      </div>

      {percentageTotal !== 100 && (
        <div className="split-remaining">
          {percentageTotal < 100
            ? t('percentageLeft', { amount: (100 - percentageTotal).toFixed(2).replace(/\.00$/, '') })
            : t('percentageOver', { amount: (percentageTotal - 100).toFixed(2).replace(/\.00$/, '') })}
        </div>
      )}
    </div>
  )
}
