import { formatCurrency } from '../../services/currency/currencyFormatter'

export default function EqualSplitSummary({
  participants,
  splits,
  getSecondaryText,
  currency = 'USD',
}) {
  return (
    <div className="split-members">
      {participants.map((member) => {
        const split = splits.find(
          (item) => item.user_id === member.user_id
        )

        return (
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
            <strong>{formatCurrency(split?.amount || 0, currency)}</strong>
          </div>
        )
      })}
    </div>
  )
}
