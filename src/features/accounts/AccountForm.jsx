import { useState } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { SUPPORTED_CURRENCIES } from '../../services/currency/currencyService.js'
import { ACCOUNT_TYPES, validateManualAccount } from './accountEngine.js'
import { accountDraft, buildAccountChanges } from './accountFormState.js'

export default function AccountForm({ account, currency, busy, error, onSave, onCancel, showHeading = true }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(() => accountDraft(account, currency))
  const [confirmBalance, setConfirmBalance] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const field = name => ({ value: draft[name], onChange: event => setDraft(value => ({ ...value, [name]: event.target.value })) })
  const submit = event => {
    event.preventDefault()
    if (validateManualAccount(draft).length) { setInvalid(true); return }
    setInvalid(false)
    const changes = account ? buildAccountChanges(draft, account, confirmBalance) : { ...draft, name: draft.name.trim(), balance: Number(draft.balance) }
    onSave(changes)
  }
  return <form className="account-form" onSubmit={submit} aria-label={t(account ? 'moneyEdit' : 'moneyAdd')}>
    {showHeading && <h3>{t(account ? 'moneyEdit' : 'moneyAdd')}</h3>}
    <fieldset disabled={busy}>
      <div className="account-fields">
        <label>{t('moneyName')}<input autoFocus required maxLength={100} autoComplete="off" {...field('name')} /></label>
        <label>{t('moneyType')}<select {...field('type')}>{ACCOUNT_TYPES.map(type => <option key={type} value={type}>{t(`moneyType_${type}`)}</option>)}</select></label>
        <label>{t(draft.type === 'credit_card' ? 'moneyOwed' : 'moneyBalance')}<input required type="number" min="0" max="99999999999999.9999" step="0.0001" inputMode="decimal" {...field('balance')} /></label>
        <label>{t('currency')}<select {...field('currency')}>{[...new Set([...SUPPORTED_CURRENCIES.map(item => item.code), draft.currency])].map(code => <option key={code}>{code}</option>)}</select></label>
        <label>{t('moneyInstitution')}<input maxLength={120} {...field('institution')} /></label>
        <label>{t('moneyNote')}<input maxLength={1000} {...field('note')} /></label>
      </div>
      <p className="money-help">{t(draft.type === 'credit_card' ? 'moneyDebtHelp' : 'moneyManualHelp')}</p>
      <label className="money-checkbox"><input type="checkbox" checked={draft.include_in_total} onChange={event => setDraft(value => ({ ...value, include_in_total: event.target.checked }))} />{t('moneyInclude')}</label>
      {account && <label className="money-checkbox"><input type="checkbox" checked={confirmBalance} onChange={event => setConfirmBalance(event.target.checked)} />{t('moneyConfirm')}</label>}
      {(invalid || error) && <p className="money-error" role="alert">{invalid ? t('moneyInvalid') : error}</p>}
      <div className="money-form-actions"><button type="button" className="secondary" onClick={onCancel}>{t('cancel')}</button><button className="primary" type="submit">{t(busy ? 'saving' : account ? 'saveChanges' : 'moneyAdd')}</button></div>
    </fieldset>
  </form>
}
