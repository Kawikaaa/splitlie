import { Check } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'

export default function SplitParticipantSelector({
  members,
  participantIds,
  onToggle,
  onSelectAll,
  onClear,
  getSecondaryText,
}) {
  const { t } = useLanguage()
  return (
    <>
      <div className="participants-box">
        <div className="participants-heading">
          <div>
            <strong>{t('whoParticipated')}</strong>
            <span>
              {t('participantHelp')}
            </span>
          </div>

          <div className="participants-actions">
            <button type="button" onClick={onSelectAll}>
              {t('selectAll')}
            </button>
            <button type="button" onClick={onClear}>
              {t('clear')}
            </button>
          </div>
        </div>

        <div className="participant-list">
          {members.map((member) => {
            const selected = participantIds.includes(
              member.user_id
            )

            return (
              <button
                className={
                  selected
                    ? 'participant-row selected'
                    : 'participant-row'
                }
                type="button"
                key={member.user_id}
                onClick={() => onToggle(member.user_id)}
              >
                <div className="participant-person">
                  <div className="member-avatar small">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{member.display_name}</strong>
                    <span>{getSecondaryText(member)}</span>
                  </div>
                </div>

                <div
                  className={
                    selected
                      ? 'participant-checkbox checked'
                      : 'participant-checkbox'
                  }
                >
                  {selected && <Check size={14} />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="participants-count">
          {t('selectedCount', { count: participantIds.length })}
        </div>
      </div>

      {participantIds.length === 0 && (
        <div className="split-note">
          {t('selectParticipant')}
        </div>
      )}
    </>
  )
}
