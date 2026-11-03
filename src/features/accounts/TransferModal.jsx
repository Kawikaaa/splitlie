import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ModalSurface from '../../components/ModalSurface'
import { X } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { getLocalDateKey } from '../../utils/dateKeys.js'
import { previewTransfer, transferAccounts, validTransferDate } from './transferEngine.js'

export default function TransferModal({ accounts, loading, record, reversing = false, busy, error, onClose, onSave, onReload }) {
  const { t, locale } = useLanguage()
  const choices = useMemo(() => transferAccounts(accounts), [accounts])
  const [sourceId, setSourceId] = useState(record?.source_account_id || '')
  const [targetId, setTargetId] = useState(record?.target_account_id || '')
  const [sent, setSent] = useState(record ? String(record.source_amount) : '')
  const [received, setReceived] = useState(record ? String(record.target_amount) : '')
  const [date, setDate] = useState(record?.transfer_date || getLocalDateKey(new Date()))
  const [note, setNote] = useState(record?.note || '')
  const [validation, setValidation] = useState('')
  const id = useRef(record?.id || crypto.randomUUID())
  const preview = previewTransfer({ accounts, sourceId, targetId, sourceAmount: sent, targetAmount: received, original: record, cancel: reversing })
  const source = accounts.find(a => a.id === sourceId), target = accounts.find(a => a.id === targetId)
  const same = source && target && source.currency === target.currency
  const money = (amount, code) => formatCurrency(Number(amount), code, locale, { maximumFractionDigits: 4 })
  const submit = event => {
    event.preventDefault()
    if (busy || loading) return
    const invalid = !reversing && !validTransferDate(date) ? 'transferInvalidDate' : preview.error
    if (invalid) { setValidation(invalid); return }
    setValidation('')
    onSave({ id: id.current, expectedUpdatedAt: record?.updated_at, draft: reversing ? null : {
      source_account_id: sourceId, target_account_id: targetId,
      source_amount: preview.sent, target_amount: preview.received,
      source_currency: source.currency, target_currency: target.currency,
      source_version: source.updated_at, target_version: target.updated_at,
      transfer_date: date, note: note.trim(),
    } })
  }
  const accountOptions = (exclude, current) => [...new Map([...choices, ...accounts.filter(a => a.id === current)].map(a => [a.id, a])).values()].map(a => <option key={a.id} value={a.id} disabled={a.id === exclude || Boolean(a.archived_at)}>{a.name} · {a.currency}</option>)
  const title = t(reversing ? 'transferReverseTitle' : record ? 'transferEdit' : 'transferAdd')
  return createPortal(<div className="modal-backdrop account-editor-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
    <ModalSurface className="account-modal transfer-modal my-money-panel" onClose={onClose} busy={busy} aria-labelledby="transfer-editor-title" aria-describedby="transfer-review">
      <div className="modal-heading"><h2 id="transfer-editor-title">{title}</h2><button type="button" className="icon-button" aria-label={t('close')} disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
      <form className="transfer-form" onSubmit={submit}>
        <div className="transfer-scroll">
          {reversing ? <p className="transfer-reverse-copy">{t('transferReverseHelp', { source: source?.name || record.source_currency, target: target?.name || record.target_currency, sent: money(record.source_amount, record.source_currency), received: money(record.target_amount, record.target_currency) })}</p> : <fieldset disabled={busy || loading}>
            <div className="account-fields">
              <label>{t('transferFrom')}<select required value={sourceId} onChange={e => { setSourceId(e.target.value); setReceived(''); setValidation('') }}><option value="">{t('transferChoose')}</option>{accountOptions(targetId, sourceId)}</select>{source && <small>{t('moneyBalance')} · {money(source.balance, source.currency)}</small>}</label>
              <label>{t('transferTo')}<select required value={targetId} onChange={e => { setTargetId(e.target.value); setReceived(''); setValidation('') }}><option value="">{t('transferChoose')}</option>{accountOptions(sourceId, targetId)}</select>{target && <small>{t('moneyBalance')} · {money(target.balance, target.currency)}</small>}</label>
              <label>{t('transferSent')}{source?.currency ? <span className="transfer-currency-input"><input aria-label={t('transferSent')} required type="number" inputMode="decimal" min="0.0001" max="99999999999999.9999" step="0.0001" placeholder="0.00" value={sent} onChange={e => { setSent(e.target.value); setValidation('') }} /><span>{source.currency}</span></span> : <input required type="number" disabled placeholder="0.00" />}</label>
              <label>{t('transferReceived')}<span className="transfer-currency-input"><input aria-label={t('transferReceived')} required type="number" inputMode="decimal" min="0.0001" max="99999999999999.9999" step="0.0001" placeholder="0.00" value={same ? sent : received} readOnly={Boolean(same)} disabled={!target} onChange={e => { setReceived(e.target.value); setValidation('') }} /><span>{target?.currency}</span></span></label>
            </div>
            <p className="money-help">{t(same ? 'transferSameHelp' : 'transferActualHelp')}</p>
            <div className="account-fields transfer-date-note"><label>{t('transferDate')}<input required type="date" value={date} max={getLocalDateKey(new Date())} onChange={e => setDate(e.target.value)} /></label><label>{t('transferNote')}<input maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label></div>
          </fieldset>}
          {!preview.error && <div className="transfer-preview"><h3>{t('transferAfter')}</h3><dl>{[...preview.balances].map(([accountId, balance]) => {
            const account = accounts.find(a => a.id === accountId)
            return <div key={accountId}><dt>{account.name}</dt><dd>{money(balance, account.currency)}</dd></div>
          })}</dl></div>}
          {preview.error === 'transferInsufficient' && !error && <p className="money-error" role="status">{t(preview.error)}</p>}
          <p id="transfer-review" className="money-help">{t('transferReview')}</p>
          {(error || validation) && <div className="transfer-error" role="alert"><p className="money-error">{t(error || validation)}</p>{error && <button type="button" className="money-text-button" disabled={busy || loading} onClick={onReload}>{t('transferReload')}</button>}</div>}
          {loading && <p role="status" className="money-help">{t('loading')}</p>}
        </div>
        <div className="money-form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>{t('cancel')}</button><button type="submit" className={reversing ? 'danger-action' : 'primary'} disabled={busy || loading || Boolean(preview.error)}>{t(busy ? 'saving' : reversing ? 'transferReverse' : record ? 'saveChanges' : 'transferSave')}</button></div>
      </form>
    </ModalSurface>
  </div>, document.querySelector('.app-shell') || document.body)
}
