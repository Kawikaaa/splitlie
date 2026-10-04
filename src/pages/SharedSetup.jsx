import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Link2, UsersRound } from '../icons'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'
import { SUPPORTED_CURRENCIES } from '../services/currency/currencyService'
import AppSelect from '../components/AppSelect'

export default function SharedSetup({ onCreate }) {
  const { language, t } = useLanguage()
  const currencyNames = new Intl.DisplayNames(
    [getLanguageLocale(language)],
    { type: 'currency' }
  )
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    const cleanName = name.trim()

    if (!cleanName) {
      setError(t('sharedSpaceNameRequired'))
      return
    }

    setCreating(true)
    setError('')

    try {
      const result = await onCreate({
        name: cleanName,
        currency,
      })

      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      console.error(err)
      setError(t('createSharedSpaceError'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="setup-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={17} />
        {t('back')}
      </Link>

      <div className="setup-card">
        <div className="feature-icon">
          <UsersRound size={22} />
        </div>

        <p className="eyebrow">{t('sharedSpaces')}</p>

        <h1>{t('startSharingTitle')}</h1>

        <p className="muted">
          {t('startSharingCopy')}
        </p>

        <div className="form-group">
          <label htmlFor="space-name">{t('spaceName')}</label>

          <input
            id="space-name"
            type="text"
            required
            maxLength={80}
            placeholder={t('spaceNameExample')}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="space-currency">{t('currency')}</label>

          <AppSelect
            value={currency}
            onChange={setCurrency}
            ariaLabel={t('currency')}
            options={SUPPORTED_CURRENCIES.map((item) => ({ value: item.code, label: `${item.code} · ${currencyNames.of(item.code)}` }))}
          />
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: '#b42318',
              marginTop: '12px',
              marginBottom: '0',
            }}
          >
            {error}
          </p>
        )}

        <button
          className="primary wide"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating
            ? t('creating')
            : t('createSharedSpace')}
        </button>

        <button
          className="secondary wide"
          type="button"
          disabled
          title={t('inviteLinkComingSoon')}
        >
          <Link2 size={17} />
          {t('joinWithInviteLink')}
        </button>
      </div>
    </div>
  )
}
