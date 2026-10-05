import { useEffect, useMemo, useState } from 'react'
import {
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'

import Layout from './components/Layout'
import MyMoney from './pages/MyMoney'
import TransactionModal from './components/TransactionModal'
import AppLoadingShell from './components/AppLoadingShell'

import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Settings from './pages/Settings'
import Budget from './pages/Budget'
import SharedSetup from './pages/SharedSetup'
import JoinSpace from './pages/JoinSpace'
import Auth from './pages/Auth'
import LandingPage from './pages/LandingPage'
import AllSpaces from './pages/AllSpaces'
import LegalPage from './pages/LegalPage'
import usePublicNavigation from './hooks/usePublicNavigation'

import { supabase } from './lib/supabase'
import { useLanguage } from './i18n/LanguageContext'
import {
  createSharedSpace,
  fetchSpaces,
  updateSpacePinned,
} from './data/ledgerApi'

export default function App() {
  const navigate = useNavigate()
  const navigatePublic = usePublicNavigation()
  const { t } = useLanguage()

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [spaces, setSpaces] = useState([])
  const [spacesLoading, setSpacesLoading] = useState(false)
  const [spacesError, setSpacesError] = useState('')
  const [activeSpaceId, setActiveSpaceId] = useState(null)

  const [transactionOpen, setTransactionOpen] =
    useState(false)

  const [editingTransaction, setEditingTransaction] =
    useState(null)

  const [refreshKey, setRefreshKey] = useState(0)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const activeSpace = useMemo(() => {
    return (
      spaces.find(
        (space) => space.id === activeSpaceId
      ) ??
      spaces[0] ??
      null
    )
  }, [spaces, activeSpaceId])

  const hasShared = spaces.some(
    (space) => space.type === 'shared'
  )

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setAuthLoading(false)
    }).catch(() => {
      if (!cancelled) { setSession(null); setAuthLoading(false) }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession)
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      }
    )

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setSpaces([])
      setActiveSpaceId(null)
      setSpacesError('')
      return
    }

    loadSpaces()
  }, [session?.user?.id])

  async function loadSpaces() {
    setSpacesLoading(true)
    setSpacesError('')
    try {
    const { data, error } =
      await fetchSpaces(session?.user?.id)

    if (error) {
      console.error(
        'Could not load spaces:',
        error
      )

      throw error
    }

    const loadedSpaces = data ?? []

    setSpaces(loadedSpaces)

    if (loadedSpaces.length) {
      setActiveSpaceId((current) => {
        const stillExists =
          loadedSpaces.some(
            (space) => space.id === current
          )

        if (stillExists) {
          return current
        }

        const personal =
          loadedSpaces.find(
            (space) =>
              space.type === 'personal'
          )

        return (
          personal?.id ??
          loadedSpaces[0].id
        )
      })
    } else {
      setActiveSpaceId(null)
    }

    return loadedSpaces
    } catch {
      setSpacesError(t('spacesLoadError'))
      return []
    } finally {
      setSpacesLoading(false)
    }
  }

  async function handleCreateSharedSpace({
    name,
    currency,
  }) {
    const { data, error } =
      await createSharedSpace({
        name,
        currency,
      })

    if (error) {
      console.error(
        'Could not create shared space:',
        error
      )

      return {
        error:
          error.message ||
          'Could not create the shared space.',
      }
    }

    const updatedSpaces =
      await loadSpaces()

    let createdSpaceId = null

    if (typeof data === 'string') {
      createdSpaceId = data
    } else if (data?.id) {
      createdSpaceId = data.id
    } else if (
      Array.isArray(data) &&
      data[0]?.id
    ) {
      createdSpaceId = data[0].id
    }

    const createdSpace =
      updatedSpaces.find(
        (space) =>
          space.id === createdSpaceId
      ) ??
      [...updatedSpaces]
        .reverse()
        .find(
          (space) =>
            space.type === 'shared' &&
            space.name === name
        )

    if (createdSpace) {
      setActiveSpaceId(
        createdSpace.id
      )
    }

    navigate('/')

    return {
      error: null,
    }
  }

  async function handleJoinedSpace(
    spaceId
  ) {
    const updatedSpaces =
      await loadSpaces()

    const joinedSpace =
      updatedSpaces.find(
        (space) => space.id === spaceId
      )

    if (joinedSpace) {
      setActiveSpaceId(
        joinedSpace.id
      )
    }
  }

  async function handleLeftSharedSpace(
    leftSpaceId
  ) {
    setTransactionOpen(false)
    setEditingTransaction(null)

    const updatedSpaces =
      await loadSpaces()

    const personalSpace =
      updatedSpaces.find(
        (space) =>
          space.type === 'personal'
      )

    const nextSpace =
      personalSpace ??
      updatedSpaces.find(
        (space) =>
          space.id !== leftSpaceId
      ) ??
      updatedSpaces[0] ??
      null

    if (nextSpace) {
      setActiveSpaceId(
        nextSpace.id
      )
    } else {
      setActiveSpaceId(null)
    }

    setRefreshKey(
      (current) => current + 1
    )

    navigate('/')
  }

  function handleMemberRemoved() {
    setRefreshKey(
      (current) => current + 1
    )
  }

  async function handleSpaceCompleted(spaceId) {
    await loadSpaces()
    setActiveSpaceId(spaceId)
    setRefreshKey((current) => current + 1)
  }

  async function handleSpaceRenamed(spaceId) {
    await loadSpaces()
    setActiveSpaceId(spaceId)
  }

  async function handleSpaceDeleted(deletedSpaceId) {
    setTransactionOpen(false)
    setEditingTransaction(null)
    const updatedSpaces = await loadSpaces()
    const nextSpace = updatedSpaces.find((space) => space.type === 'personal') ||
      updatedSpaces.find((space) => space.id !== deletedSpaceId) || null
    setActiveSpaceId(nextSpace?.id || null)
    setRefreshKey((current) => current + 1)
    navigate('/')
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setSpaces([])
    setActiveSpaceId(null)
    setEditingTransaction(null)
    setTransactionOpen(false)

    navigate('/')
  }

  function openAddTransaction() {
    if (activeSpace?.status === 'completed') return
    setEditingTransaction(null)
    setTransactionOpen(true)
  }

  function openEditTransaction(transaction) {
    setEditingTransaction(transaction)
    setTransactionOpen(true)
  }

  function closeTransactionModal() {
    setTransactionOpen(false)
    setEditingTransaction(null)
  }

  function handleTransactionSaved() {
    setRefreshKey(
      (current) => current + 1
    )
  }

  function handleSpaceChange(spaceId) {
    setTransactionOpen(false)
    setEditingTransaction(null)
    setActiveSpaceId(spaceId)
    navigate('/')
  }

  async function handleSpacePin(spaceId, pinned) {
    const previousSpaces = spaces
    setSpaces(current => current.map(space => space.id === spaceId ? { ...space, pinned_at: pinned ? new Date().toISOString() : null } : space))
    const { error } = await updateSpacePinned(spaceId, session.user.id, pinned)
    if (error) {
      setSpaces(previousSpaces)
      return { error }
    }
    return { error: null }
  }

  if (authLoading) {
    return <AppLoadingShell label={t('loading')} />
  }

  if (passwordRecovery) {
    return <Auth initialMode="recovery" onPasswordUpdated={() => { setPasswordRecovery(false); navigate('/') }} />
  }

  const currentPath = window.location.pathname
  const legalPageType = currentPath === '/privacy'
    ? 'privacy'
    : currentPath === '/terms'
      ? 'terms'
      : null
  const publicAuthMode = currentPath === '/signup'
    ? 'signup'
    : currentPath === '/forgot-password'
      ? 'forgot'
      : currentPath === '/login'
        ? 'login'
        : null

  if (legalPageType) {
    return <LegalPage type={legalPageType} />
  }

  if (currentPath === '/welcome') {
    return (
      <LandingPage
        onGetStarted={() => navigatePublic('/signup')}
        onLogin={() => navigatePublic('/login')}
      />
    )
  }

  if (publicAuthMode) {
    return (
      <Auth
        initialMode={publicAuthMode}
        onBack={() => navigatePublic('/welcome')}
        onAuthenticated={() => navigate('/')}
      />
    )
  }

  if (!session) {
    const joiningFromLink =
      window.location.pathname.startsWith('/join/')

    if (joiningFromLink) {
      return <Auth initialMode="login" />
    }

    return (
      <LandingPage
        onGetStarted={() => navigatePublic('/signup')}
        onLogin={() => navigatePublic('/login')}
      />
    )
  }

  /*
    Important:
    Join pages must be allowed to render
    before we require activeSpace.

    A newly invited user may need their
    spaces refreshed after accepting.
  */

  const isJoinRoute =
    window.location.pathname.startsWith(
      '/join/'
    )

  if (isJoinRoute) {
    return (
      <Routes>
        <Route
          path="/join/:token"
          element={
            <JoinSpace
              session={session}
              onJoined={
                handleJoinedSpace
              }
            />
          }
        />
      </Routes>
    )
  }

  if (
    spacesLoading ||
    !activeSpace
  ) {
    if (!spacesLoading && (spacesError || !activeSpace)) {
      return <div className="app-recovery-page"><section className="panel empty-state"><h1>{t('workspace')}</h1><p role="alert">{spacesError || t('spacesLoadError')}</p><button className="primary" type="button" onClick={loadSpaces}>{t('retry')}</button></section></div>
    }
    return <AppLoadingShell label={t('loadingYourMoney')} />
  }

  return (
    <>
      <Routes>
        <Route
          path="/join/:token"
          element={
            <JoinSpace
              session={session}
              onJoined={
                handleJoinedSpace
              }
            />
          }
        />

        <Route
          path="/shared/new"
          element={
            <SharedSetup
              onCreate={
                handleCreateSharedSpace
              }
            />
          }
        />

        <Route
          path="*"
          element={
            <Layout
              spaces={spaces}
              activeSpace={activeSpace}
              onSpaceChange={
                handleSpaceChange
              }
              onCreateSpace={() =>
                navigate(
                  '/shared/new'
                )
              }
              user={session.user}
              onAddTransaction={
                activeSpace.status === 'completed' ? undefined : openAddTransaction
              }
            >
              <Routes>
                <Route
                  path="/spaces"
                  element={<AllSpaces spaces={spaces} activeSpace={activeSpace} user={session.user} onOpenSpace={handleSpaceChange} onPinSpace={handleSpacePin} onCreateSpace={() => navigate('/shared/new')} />}
                />

                <Route
                  path="/"
                  element={
                    <Overview
                      activeSpace={
                        activeSpace
                      }
                      user={
                        session.user
                      }
                      hasShared={
                        hasShared
                      }
                      onCreateSpace={() =>
                        navigate(
                          '/shared/new'
                        )
                      }
                      onAddTransaction={
                        activeSpace.status === 'completed' ? undefined : openAddTransaction
                      }
                      refreshKey={
                        refreshKey
                      }
                    />
                  }
                />

                <Route
                  path="/transactions"
                  element={
                    <Transactions
                      activeSpace={
                        activeSpace
                      }
                      user={
                        session.user
                      }
                      onAddTransaction={
                        activeSpace.status === 'completed' ? undefined : openAddTransaction
                      }
                      onEditTransaction={
                        openEditTransaction
                      }
                      refreshKey={
                        refreshKey
                      }
                    />
                  }
                />

                <Route
                  path="/budget"
                  element={<Budget activeSpace={activeSpace} user={session.user} refreshKey={refreshKey} />}
                />

                <Route path="/my-money" element={<MyMoney activeSpace={activeSpace} user={session.user} refreshKey={refreshKey} />} />

                <Route
                  path="/settings"
                  element={
                    <Settings
                      activeSpace={
                        activeSpace
                      }
                      user={
                        session.user
                      }
                      onLeftSpace={
                        handleLeftSharedSpace
                      }
                      onMemberRemoved={
                        handleMemberRemoved
                      }
                      onSpaceCompleted={handleSpaceCompleted}
                      onSpaceDeleted={handleSpaceDeleted}
                      onSpaceRenamed={handleSpaceRenamed}
                      onLogout={handleLogout}
                    />
                  }
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>

      <TransactionModal
        open={transactionOpen && activeSpace?.status !== 'completed'}
        onClose={
          closeTransactionModal
        }
        activeSpace={activeSpace}
        user={session.user}
        transaction={
          editingTransaction
        }
        onSaved={
          handleTransactionSaved
        }
      />
    </>
  )
}
