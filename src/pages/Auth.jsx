import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ShieldCheck } from '../icons'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../i18n/LanguageContext'
import { getAuthErrorMessage } from '../lib/authErrorMessage'
import PublicLanguageSelect from '../components/PublicLanguageSelect'

const TITLE_PUNCTUATION = /[.,!?。！？…，、；：:;]/g

export default function Auth({ initialMode = 'login', onBack, onPasswordUpdated, onAuthenticated }) {
  const { language, t } = useLanguage()
  const [mode, setMode] = useState(initialMode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setMode(initialMode) }, [initialMode])

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'
  const isRecovery = mode === 'recovery'

  async function handleGoogleSignIn() {
    if (loading || oauthLoading) return
    setMessage('')
    setError('')
    if (!supabase) { setError(t('supabaseNotConnected')); return }

    setOauthLoading(true)
    try {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (oauthError) {
      setOauthLoading(false)
      setError(getAuthErrorMessage(oauthError, t))
    }
    } catch (error) {
      setOauthLoading(false)
      setError(getAuthErrorMessage(error, t))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading || oauthLoading) return
    setMessage('')
    setError('')
    if (!supabase) { setError(t('supabaseNotConnected')); return }

    if (isForgot) {
      if (!email.trim()) { setError(t('enterEmail')); return }
      setLoading(true)
      try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      })
      setLoading(false)
      if (resetError) setError(getAuthErrorMessage(resetError, t))
      else setMessage(t('resetEmailSent'))
      } catch (error) { setError(getAuthErrorMessage(error, t)) }
      finally { setLoading(false) }
      return
    }

    if (isRecovery) {
      if (password.length < 6) { setError(t('passwordLength')); return }
      if (password !== confirmPassword) { setError(t('passwordMismatch')); return }
      setLoading(true)
      try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      setLoading(false)
      if (updateError) setError(getAuthErrorMessage(updateError, t))
      else {
        setMessage(t('passwordUpdated'))
        setPassword('')
        setConfirmPassword('')
        onPasswordUpdated?.()
      }
      } catch (error) { setError(getAuthErrorMessage(error, t)) }
      finally { setLoading(false) }
      return
    }

    if (!email.trim() || !password) { setError(t('enterEmailPassword')); return }
    if (isSignup && !displayName.trim()) { setError(t('enterName')); return }
    setLoading(true)
    try {
      if (isSignup) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (signupError) throw signupError
        setMessage(data.session ? t('accountCreatedSignedIn') : t('accountCreatedConfirm'))
        if (data.session) onAuthenticated?.()
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (loginError) throw loginError
        onAuthenticated?.()
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const title = isRecovery ? t('chooseNewPassword') : isForgot ? t('resetPassword') : isSignup ? t('startOwnMoney') : t('signInMoney')
  const eyebrow = isRecovery ? t('secureAccount') : isForgot ? t('accountRecovery') : isSignup ? t('createAccount') : t('welcomeBack')
  const subtitle = isRecovery ? t('newPasswordCopy') : isForgot ? t('resetPasswordCopy') : isSignup ? t('signupCopy') : t('loginCopy')

  return (
    <div className="auth-page" lang={language}>
      <div className="auth-shell">
        <aside className="auth-showcase" aria-label={t('landingProductPreview')}>
          <div className="auth-showcase-brand"><span>S</span><strong>Splitlie</strong></div>

          <div className="auth-showcase-copy">
            <p className="auth-showcase-eyebrow">{t('landingKicker')}</p>
            <h2>{t('landingTitle').replace(TITLE_PUNCTUATION, '')}</h2>
            <p>{t('landingCopy')}</p>
          </div>

          <div className="auth-showcase-preview">
            <span className="preview-caption">{t('examplePreview')}</span>
            <div className="auth-showcase-preview-top">
              <span className="auth-showcase-icon"><ShieldCheck size={22} /></span>
              <div><small>{t('safeToSpend')}</small><strong>$631.93</strong></div>
            </div>
            <div className="auth-showcase-track"><i /></div>
            <div className="auth-showcase-budget"><span>{t('monthlyBudget')}</span><strong>$1,000.00</strong></div>
          </div>

          <div className="auth-showcase-proof">
            <span><Check size={14} /> {t('personalLedger')}</span>
            <span><Check size={14} /> {t('sharedExpenses')}</span>
            <span><Check size={14} /> {t('clearBalances')}</span>
          </div>
        </aside>

        <section className={`auth-card${isSignup ? ' is-signup' : ''}`}>
        <div className="auth-card-top">
          <div className="auth-brand auth-brand-mobile"><span className="auth-brand-mark">S</span><span>Splitlie</span></div>
          <PublicLanguageSelect />
          {(onBack || isForgot) && (
            <button className="auth-back" type="button" onClick={isForgot ? () => switchMode('login') : onBack}>
              <ArrowLeft size={16} /> {isForgot ? t('backToLogin') : t('backToHome')}
            </button>
          )}
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title.replace(TITLE_PUNCTUATION, '')}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {!isForgot && !isRecovery && (
          <div className="auth-tabs">
            <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('login')}>{t('logIn')}</button>
            <button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('signup')}>{t('signUp')}</button>
          </div>
        )}

        {!isForgot && !isRecovery && (
          <>
            <button className="auth-google-button" type="button" onClick={handleGoogleSignIn} disabled={loading || oauthLoading}>
              <span className="auth-google-mark" aria-hidden="true">G</span>
              {oauthLoading ? t('connectingGoogle') : t('continueWithGoogle')}
            </button>
            <div className="auth-divider"><span>{t('orContinueWithEmail')}</span></div>
          </>
        )}

        <form onSubmit={handleSubmit} className="auth-form" aria-busy={loading || oauthLoading}>
          {isSignup && <label>{t('name')}<input required type="text" placeholder={t('yourName')} value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" /></label>}
          {!isRecovery && <label>{t('email')}<input required type="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>}
          {!isForgot && <label>{isRecovery ? t('newPassword') : t('password')}<input required minLength={isRecovery || isSignup ? 6 : undefined} type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={event => setPassword(event.target.value)} autoComplete={isRecovery || isSignup ? 'new-password' : 'current-password'} /></label>}
          {isRecovery && <label>{t('confirmPassword')}<input required minLength={6} type="password" placeholder={t('confirmPassword')} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>}
          {!isSignup && !isForgot && !isRecovery && <button className="auth-forgot" type="button" onClick={() => switchMode('forgot')}>{t('forgotPassword')}</button>}
          {error && <div className="auth-message error" role="alert">{error}</div>}
          {message && <div className="auth-message success" role="status">{message}</div>}
          <button className="primary auth-submit" type="submit" disabled={loading || oauthLoading}>
            {loading ? t('pleaseWait') : isRecovery ? t('updatePassword') : isForgot ? t('sendResetLink') : isSignup ? t('createAccountButton') : t('logIn')}
          </button>
        </form>
        </section>
      </div>
    </div>
  )
}

