import { Archive, ArrowRight, Pin, PinOff, Plus, UserRound, Users, UsersRound } from '../icons'
import { useState } from 'react'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'
import { sortSpaces } from '../utils/spaceSorting'
import { spaceMemberIconKind } from '../utils/spaceMemberCounts'

export default function AllSpaces({ spaces, activeSpace, user, onOpenSpace, onPinSpace, onCreateSpace }) {
  const { t, language } = useLanguage()
  const [recentlyUnpinned, setRecentlyUnpinned] = useState([])
  const [pinBusy, setPinBusy] = useState('')
  const [pinError, setPinError] = useState('')
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'
  const orderedSpaces = sortSpaces(spaces)
  const pinnedSpaces = orderedSpaces.filter(space => space.type === 'personal' || space.pinned_at)
  const regularSpaces = orderedSpaces.filter(space => space.type !== 'personal' && !space.pinned_at)
  const unpinnedFirst = recentlyUnpinned
    .map(id => regularSpaces.find(space => space.id === id))
    .filter(Boolean)
  const remainingSpaces = regularSpaces.filter(space => !recentlyUnpinned.includes(space.id))
  const otherSpaces = [...unpinnedFirst, ...remainingSpaces]

  async function togglePin(space) {
    if (pinBusy) return
    const previous = recentlyUnpinned
    setPinBusy(space.id)
    setPinError('')
    if (space.pinned_at) {
      setRecentlyUnpinned(current => [space.id, ...current.filter(id => id !== space.id)])
    } else {
      setRecentlyUnpinned(current => current.filter(id => id !== space.id))
    }
    try {
      const result = await onPinSpace(space.id, !space.pinned_at)
      if (result?.error) throw result.error
    } catch {
      setRecentlyUnpinned(previous)
      setPinError(t('authTryAgain'))
    } finally { setPinBusy('') }
  }

  function nameFor(space) {
    return space.type === 'personal' ? t('personalSpace', { name: displayName }) : space.name
  }

  function updatedLabel(space) {
    const date = new Date(space.updated_at || space.created_at)
    if (!Number.isFinite(date.getTime())) return '—'
    return new Intl.DateTimeFormat(getLanguageLocale(language), { month: 'short', day: 'numeric', year: 'numeric' })
      .format(date)
  }

  function renderSpaceCard(space) {
    const completed = space.status === 'completed'
    const active = space.id === activeSpace?.id
    const systemPinned = space.type === 'personal'
    const pinned = systemPinned || Boolean(space.pinned_at)
    const count = systemPinned ? 1 : space.member_count
    const iconKind = spaceMemberIconKind(count)
    const MemberIcon = iconKind === 'single' ? UserRound : iconKind === 'pair' ? Users : UsersRound
    return (
      <article className={`space-card ${active ? 'active' : ''} ${completed ? 'completed' : ''} ${systemPinned ? 'system-pinned' : ''}`} key={space.id}>
        <div className="space-card-top">
          <span className={`space-card-icon ${systemPinned ? 'personal-pinned' : ''}`} data-member-icon={iconKind} aria-hidden="true">
            <MemberIcon size={23} />
            {systemPinned && <span className="space-system-pin" title={t('personalAlwaysPinned')}><Pin size={10} fill="currentColor" /></span>}
          </span>
          {!systemPinned && <button className={`space-pin-button ${pinned ? 'pinned' : ''}`} type="button" disabled={Boolean(pinBusy)} aria-busy={pinBusy === space.id} onClick={() => togglePin(space)} aria-label={space.pinned_at ? t('unpinSpace') : t('pinSpace')} title={space.pinned_at ? t('unpinSpace') : t('pinSpace')}>
            {space.pinned_at ? <PinOff size={15} /> : <Pin size={15} />}
          </button>}
        </div>
        <div className="space-card-copy">
          <div className="space-card-meta">
            <div className="space-card-badges"><span>{space.type === 'personal' ? t('personal') : t('shared')}</span>{completed && <span className="history"><Archive size={11} /> {t('completed')}</span>}{space.pinned_at && !systemPinned && <span className="pinned"><Pin size={11} fill="currentColor" /> {t('pinned')}</span>}</div>
            <div className="space-member-count"><span>{t('members')}</span><strong>{count == null ? '—' : new Intl.NumberFormat(getLanguageLocale(language)).format(count)}</strong></div>
          </div>
          <h2>{nameFor(space)}</h2>
          <p>{t('lastUpdated', { date: updatedLabel(space) })}</p>
        </div>
        <button className="space-card-open" type="button" onClick={() => onOpenSpace(space.id)}>
          <span>{active ? t('currentSpace') : completed ? t('viewHistory') : t('openSpace')}</span><ArrowRight size={16} />
        </button>
      </article>
    )
  }

  return (
    <div className="page all-spaces-page">
      <header className="page-header">
        <div><p className="eyebrow">{t('workspace')}</p><h1>{t('allSpaces')}</h1><p className="muted">{t('allSpacesCopy')}</p></div>
        <button className="primary" type="button" onClick={onCreateSpace}><Plus size={17} /> {t('createOrJoin')}</button>
      </header>
      {pinError && <p className="page-message error" role="alert">{pinError}</p>}

      <section className="space-group">
        <div className="space-group-heading"><div><Pin size={15} fill="currentColor" /><h2>{t('pinnedSpaces')}</h2></div><span>{pinnedSpaces.length}</span></div>
        <div className="space-card-grid">{pinnedSpaces.map(renderSpaceCard)}</div>
      </section>

      {otherSpaces.length > 0 && (
        <section className="space-group">
          <div className="space-group-heading"><div><h2>{t('otherSpaces')}</h2></div><span>{otherSpaces.length}</span></div>
          <div className="space-card-grid">{otherSpaces.map(renderSpaceCard)}</div>
        </section>
      )}
    </div>
  )
}
