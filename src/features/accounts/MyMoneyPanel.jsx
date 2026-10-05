import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, WalletCards, RotateCcw, X } from '../../icons'
import ModalSurface from '../../components/ModalSurface'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { calculateAccountTotals } from './accountEngine.js'
import { accountRepository, useAccounts } from './useAccounts'
import AccountForm from './AccountForm'
import AccountWallet from './AccountWallet'
import './MyMoney.css'

export default function MyMoneyPanel({ userId, spaceId, currency, standalone = false }) {
  const { t, locale } = useLanguage()
  const { accounts, quotes, loading, failed, reload } = useAccounts({ userId, spaceId, currency })
  const [editor, setEditor] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [notice, setNotice] = useState('')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const result = useMemo(() => calculateAccountTotals({ accounts, quotes, currency, userId, spaceId, readFailed: failed }), [accounts, quotes, currency, userId, spaceId, failed])
  const archived = accounts.filter(account => account.archived_at)
  const money = (value, code = currency) => value == null ? '—' : formatCurrency(value, code, locale)
  const edit = account => { setEditor(account || 'new'); setError(null); setConflict(false); setNotice('') }
  const closeEditor = () => { if (!busy) { setEditor(null); setError(null); setConflict(false) } }
  const mutate = async (action, account, changes) => {
    if (busy) return
    if (action === 'update' && !Object.keys(changes).length) { setEditor(null); return }
    setBusy(true); setError(null); setConflict(false); setNotice('')
    try {
      const scope = { userId, spaceId, id: account?.id, expectedUpdatedAt: account?.updated_at }
      const response = await accountRepository[action]({ ...scope, changes, account: changes })
      if (response.error) throw response.error
      if (!mounted.current) return
      setEditor(null)
      setNotice(t(action === 'archive' ? 'moneyArchived' : action === 'restore' ? 'moneyRestored' : 'moneySaved'))
      await reload()
    } catch (failure) {
      if (!mounted.current) return
      setConflict(failure.code === 'PGRST116')
      setError(t(failure.code === 'PGRST116' ? 'moneyConflict' : failure.message?.includes('ACCOUNT_LINKED') ? 'moneyLinkedIdentity' : 'moneySaveError'))
    } finally { if (mounted.current) setBusy(false) }
  }
  return <section className="panel my-money-panel" aria-label={standalone ? t('moneyTitle') : undefined} aria-labelledby={standalone ? undefined : 'my-money-title'} aria-busy={loading}>
    <div className="panel-heading money-heading"><div>{!standalone && <h2 id="my-money-title">{t('moneyTitle')}</h2>}<p className="money-help">{t('moneyIntro')}</p></div>
      {!failed && <button className="secondary" disabled={loading || busy || Boolean(editor)} onClick={() => edit(null)}><Plus size={18} aria-hidden="true" />{t('moneyAdd')}</button>}
    </div>
    {loading ? <div className="money-skeleton" role="status" aria-label={t('loading')}><span /><span /><span /></div> : failed ? <div className="money-read-error" role="alert"><p>{t('moneyLoadError')}</p><button className="secondary" onClick={reload}>{t('retry')}</button></div> : <>
      {result.rows.length > 0 && <AccountWallet rows={result.rows} currency={currency} busy={busy} editing={Boolean(editor)} onEdit={edit} onArchive={row => mutate('archive', row)} />}
      {result.rows.length > 0 && <dl className="money-totals wallet-total-assets">{[['moneyAssets', result.assetTotal, result.knownAssetSubtotal], ['moneyDebt', result.debtTotal, result.knownDebtSubtotal], ['moneyNet', result.netTotal, null]].map(([label, value, partial]) => <div key={label}><dt>{t(label)}</dt><dd>{money(value)}</dd>{value == null && partial != null && <p className="money-help">{t('moneyPartial', { amount: money(partial) })}</p>}</div>)}</dl>}
      {result.issues.length > 0 && <p className="money-error" role="status">{t('moneyIncomplete')} <button className="money-text-button" disabled={busy || Boolean(editor)} onClick={reload}>{t('retry')}</button></p>}
      {result.rows.length > 0 && <p className="money-help">{t(result.estimated ? 'moneyEstimated' : 'moneyRecorded', { currency })}</p>}
      {!result.rows.length && !result.issues.length && !editor && <div className="money-empty"><WalletCards size={28} aria-hidden="true" /><p>{t('moneyEmpty')}</p></div>}
      {editor && createPortal(<div className="modal-backdrop account-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeEditor() }}>
        <ModalSurface className="account-modal my-money-panel" onClose={closeEditor} busy={busy} aria-labelledby="account-editor-title">
          <div className="modal-heading"><h2 id="account-editor-title">{t(editor === 'new' ? 'moneyAdd' : 'moneyEdit')}</h2><button type="button" className="icon-button" aria-label={t('close')} disabled={busy} onClick={closeEditor}><X size={20} /></button></div>
          <AccountForm key={editor === 'new' ? 'new' : editor.id} account={editor === 'new' ? null : editor} currency={currency} busy={busy} error={error} showHeading={false} onCancel={closeEditor} onSave={changes => mutate(editor === 'new' ? 'create' : 'update', editor === 'new' ? null : editor, changes)} />
          {conflict && <button className="secondary" disabled={busy} onClick={() => { closeEditor(); reload() }}>{t('moneyReload')}</button>}
        </ModalSurface>
      </div>, document.querySelector('.app-shell') || document.body)}
      {archived.length > 0 && <><button className="money-text-button" aria-expanded={showArchived} onClick={() => setShowArchived(value => !value)}>{t(showArchived ? 'moneyHideArchive' : 'moneyShowArchive', { count: archived.length })}</button>{showArchived && <ul className="money-rows money-archived">{archived.map(row => <li key={row.id}><div className="money-row-label"><h3>{row.name}</h3><p className="money-help">{t('moneyArchived')}</p></div><button className="secondary" disabled={busy || Boolean(editor)} onClick={() => mutate('restore', row)}><RotateCcw size={16} aria-hidden="true" />{t('moneyRestore')}</button></li>)}</ul>}</>}
      {!editor && error && <p className="money-error" role="alert">{error}</p>}
    </>}
    <p className="money-status" role="status">{notice}</p>
  </section>
}
