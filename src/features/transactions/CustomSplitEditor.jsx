import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function CustomSplitEditor({
  participants,
  customSplits,
  onChange,
  customTotal,
  numericAmount,
  customRemaining,
  getSecondaryText,
  currency = 'USD',
}) {
  const { t } = useLanguage()
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
                <span>{getSecondaryText(member)}</span>
              </div>
            </div>

            <div className="split-amount-input">
              <span>{currency}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={customSplits[member.user_id] ?? ''}
                onChange={(event) =>
                  onChange(member.user_id, event.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className={
          Math.abs(customRemaining) < 0.01
            ? 'split-total valid'
            : 'split-total'
        }
      >
        <span>{t('totalAllocated')}</span>
        <strong>
          {formatCurrency(customTotal, currency)} / {formatCurrency(numericAmount, currency)}
        </strong>
      </div>

      {numericAmount > 0 && Math.abs(customRemaining) >= 0.01 && (
        <div className="split-remaining">
          {customRemaining > 0
            ? t('leftToAssign', { amount: formatCurrency(customRemaining, currency) })
            : t('overTotal', { amount: formatCurrency(Math.abs(customRemaining), currency) })}
        </div>
      )}
    </div>
  )
}
