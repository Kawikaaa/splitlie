import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  LogIn,
  UsersRound,
} from '../icons'

import {
  acceptSpaceInvitation,
  fetchSpaceInvitationDetails,
} from '../data/ledgerApi'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'

export default function JoinSpace({
  session,
  onJoined,
}) {
  const { token } = useParams()
  const navigate = useNavigate()
  const { language, t } = useLanguage()

  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [checking, setChecking] = useState(false)
  const [invitation, setInvitation] = useState(null)

  useEffect(() => {
    setError('')
    setJoined(false)
    setInvitation(null)

    if (!session?.user || !token) return

    let cancelled = false

    async function loadInvitation() {
      setChecking(true)

      const { data, error: detailsError } =
        await fetchSpaceInvitationDetails(token)

      if (cancelled) return

      setChecking(false)

      if (detailsError) {
        setError(detailsError.message || t('invitationCheckError'))
        return
      }

      const details = Array.isArray(data) ? data[0] : data

      if (!details) {
        setError(t('invitationInvalidEmail'))
        return
      }

      setInvitation(details)
    }

    loadInvitation()

    return () => {
      cancelled = true
    }
  }, [token, session?.user?.id, t])

  async function handleJoin() {
    if (joining || checking) return
    if (!session?.user) {
      return
    }

    if (!token) {
      setError(t('invitationInvalid'))
      return
    }

    setJoining(true)
    setError('')

    const { data, error: joinError } =
      await acceptSpaceInvitation(token)

    setJoining(false)

    if (joinError) {
      console.error(
        'Could not accept invitation:',
        joinError
      )

      setError(
        joinError.message ||
          t('invitationAcceptError')
      )

      return
    }

    setJoined(true)

    if (onJoined) {
      await onJoined(data)
    }
  }

  if (!session) {
    return (
      <div className="setup-page">
        <div className="setup-card">
          <div className="feature-icon">
            <LogIn size={22} />
          </div>

          <p className="eyebrow">{t('invitation')}</p>

          <h1>
            {t('signInToJoin')}
          </h1>

          <p className="muted">
            {t('signInJoinCopy')}
          </p>

          <button
            className="primary wide"
            onClick={() => navigate('/')}
          >
            {t('continueToSignIn')}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="setup-page">
        <div className="setup-card">
          <div className="feature-icon">
            <Check size={22} />
          </div>

          <p className="eyebrow">{t('joinedEyebrow')}</p>

          <h1>{t('sharedSpaceJoined')}</h1>

          <p className="muted">
            {t('sharedSpaceAdded')}
          </p>

          <button
            className="primary wide"
            onClick={() => navigate('/')}
          >
            {t('openSharedSpace')}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  const invitationStatus = invitation?.status
  const canAccept = invitationStatus === 'pending'

  const statusMessage =
    invitationStatus === 'expired'
      ? t('invitationExpired')
      : invitationStatus === 'revoked'
        ? t('invitationRevoked')
        : invitationStatus === 'accepted'
          ? t('invitationUsed')
          : ''

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="feature-icon">
          <UsersRound size={22} />
        </div>

        <p className="eyebrow">
          {t('sharedSpaceInvitation')}
        </p>

        <h1>
          {invitation?.space_name
            ? t('joinSpaceTitle', { space: invitation.space_name })
            : t('invitedTogether')}
        </h1>

        <p className="muted">
          {checking
            ? t('checkingInvitation')
            : canAccept
              ? t('invitationFor', {
                  email: invitation.invited_email,
                  date: new Date(invitation.expires_at).toLocaleString(getLanguageLocale(language)),
                })
              : statusMessage || t('acceptInvitationCopy')}
        </p>

        {error && (
          <p
            role="alert"
            style={{
              color: '#b42318',
              marginTop: '14px',
            }}
          >
            {error}
          </p>
        )}

        <button
          className="primary wide"
          disabled={joining || checking || !canAccept}
          onClick={handleJoin}
        >
          {checking
            ? t('checking')
            : joining
            ? t('joining')
            : canAccept
              ? t('acceptInvitation')
              : t('invitationUnavailable')}
        </button>

        <button
          className="secondary wide"
          onClick={() => navigate('/')}
        >
          {t('notNow')}
        </button>
      </div>
    </div>
  )
}
