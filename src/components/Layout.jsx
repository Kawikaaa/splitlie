import { useEffect, useState } from 'react'
import {
  Link,
  useLocation,
} from 'react-router-dom'

import {
  CircleDollarSign,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  ReceiptText,
  Settings,
  WalletCards,
} from '../icons'

import SpaceSwitcher from './SpaceSwitcher'
import { useLanguage } from '../i18n/LanguageContext'
import { fetchProfileAvatar } from '../data/ledgerApi'
import AvatarImage from './AvatarImage'

export default function Layout({
  children,
  spaces,
  activeSpace,
  user,
  onAddTransaction,
}) {
  const location = useLocation()
  const { t } = useLanguage()
  const avatarStorageKey = `splitlie-avatar-${user?.id || user?.email || 'guest'}`
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    function loadAvatar() {
      const savedAvatar = window.localStorage.getItem(avatarStorageKey)
      setAvatarUrl(savedAvatar || '')
    }

    let cancelled = false

    async function loadSavedAvatar() {
      if (!user?.id) return

      const { data, error } = await fetchProfileAvatar(user.id)
      if (cancelled || error) return

      const remoteAvatar = data?.avatar_url || ''
      const localAvatar = window.localStorage.getItem(avatarStorageKey)

      // Keep an older local-only avatar visible until Settings backfills it.
      if (!remoteAvatar && localAvatar) return

      if (remoteAvatar) {
        window.localStorage.setItem(avatarStorageKey, remoteAvatar)
      } else {
        window.localStorage.removeItem(avatarStorageKey)
      }
      setAvatarUrl(remoteAvatar)
    }

    loadAvatar()
    loadSavedAvatar()
    window.addEventListener('splitlie-avatar-change', loadAvatar)
    return () => {
      cancelled = true
      window.removeEventListener('splitlie-avatar-change', loadAvatar)
    }
  }, [avatarStorageKey, user?.id])

  const nav = [
    [
      '/',
      t('overview'),
      LayoutDashboard,
    ],
    [
      '/transactions',
      t('transactions'),
      ReceiptText,
    ],
    ...(activeSpace.type === 'personal' ? [[
      '/my-money',
      t('moneyTitle'),
      WalletCards,
    ], [
      '/budget',
      t('budget'),
      CircleDollarSign,
    ]] : []),
    [
      '/spaces',
      t('allSpaces'),
      LayoutGrid,
    ],
    [
      '/settings',
      t('settings'),
      Settings,
    ],
  ]

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'User'

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand app-brand">
            <span className="app-brand-mark">S</span>
            <span>Splitlie</span>
          </div>

          <Link
            className="mobile-profile-link"
            to="/settings"
            aria-label={t('profileSettings')}
          >
            <AvatarImage src={avatarUrl} size={19} />
          </Link>

          <p className="sidebar-section-label">{t('workspace')}</p>

          {spaces.length > 1 && (
            <SpaceSwitcher
              activeSpace={activeSpace}
              userDisplayName={displayName}
              personalSpaceLabel={t('personalSpace', { name: displayName })}
            />
          )}

          <nav className="sidebar-nav">
            {nav.map(([path, label, Icon]) => (
              <Link
                key={path}
                to={path}
                aria-current={location.pathname === path ? 'page' : undefined}
                className={location.pathname === path ? 'nav-link active' : 'nav-link'}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mobile-sidebar-tools">
            {onAddTransaction && (
              <button className="primary mobile-add" type="button" onClick={onAddTransaction}>
                <Plus size={18} />
                <span>{t('addTransaction')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-bottom">
          {onAddTransaction ? (
            <button className="primary sidebar-add" type="button" onClick={onAddTransaction}>
              <Plus size={17} />
              <span>{t('addTransaction')}</span>
            </button>
          ) : (
            <div className="completed-space-notice">{t('completedReadOnly')}</div>
          )}

          <div className="sidebar-user">
            <Link
              className="sidebar-avatar"
              to="/settings"
              aria-label={t('profileSettings')}
            >
              <AvatarImage src={avatarUrl} size={21} />
            </Link>
            <div className="sidebar-user-info">
              <strong>{displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>

      <nav className="mobile-bottom-nav" aria-label={t('workspace')} style={{ gridTemplateColumns: `repeat(${nav.length - 1}, minmax(0, 1fr))` }}>
        {nav.map(([path, label, Icon]) => (
          <Link
            key={path}
            to={path}
            aria-current={location.pathname === path ? 'page' : undefined}
            className={location.pathname === path ? 'nav-link active' : 'nav-link'}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

