import { UserRound, UsersRound } from '../icons'

export default function SpaceSwitcher({ activeSpace, userDisplayName, personalSpaceLabel }) {
  const spaceName = activeSpace.type === 'personal'
    ? personalSpaceLabel || `${userDisplayName}’s Personal Space`
    : activeSpace.name

  return (
    <div className="space-switcher">
      <div className="space-current space-current-display" title={spaceName}>
        <span className="space-icon" aria-hidden="true">
          {activeSpace.type === 'personal'
            ? <UserRound size={18} />
            : <UsersRound size={18} />}
        </span>
        <span className="space-current-name">{spaceName}</span>
      </div>
    </div>
  )
}
