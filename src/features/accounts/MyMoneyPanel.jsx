import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, WalletCards, RotateCcw, X, ArrowRightLeft } from '../../icons'
import ModalSurface from '../../components/ModalSurface'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { calculateAccountTotals } from './accountEngine.js'
import { accountRepository, useAccounts } from './useAccounts'
import AccountForm from './AccountForm'
import AccountWallet from './AccountWallet'
import AccountTransfers from './AccountTransfers'
import { transferAccounts } from './transferEngine.js'
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [transferRequest, setTransferRequest] = useState(null)
  const askDelete = account => { setDeleteTarget(account); setDeleteBlocked(false); setError(null); setConflict(false) }
  const closeDelete = () => { if (!busy) { setDeleteTarget(null); setError(null); setConflict(false) } }
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
      setDeleteTarget(null)
      setNotice(t(action === 'remove' ? 'moneyDeleted' : action === 'archive' ? 'moneyArchived' : action === 'restore' ? 'moneyRestored' : 'moneySaved'))
      await reload()
    } catch (failure) {
      if (!mounted.current) return
      setConflict(failure.code === 'PGRST116')
      setDeleteBlocked(action === 'remove' && failure.code === '23503')
      setError(t(action === 'remove' && failure.code === '23503' ? 'moneyDeleteLinked' : failure.code === 'PGRST116' ? 'moneyConflict' : failure.message?.includes('ACCOUNT_LINKED') ? 'moneyLinkedIdentity' : action === 'remove' ? 'moneyDeleteError' : 'moneySaveError'))
    } finally { if (mounted.current) setBusy(false) }
  }
  const totals = result.rows.length > 0 && <dl className="money-totals wallet-total-assets">{[['moneyAssets', result.assetTotal, result.knownAssetSubtotal], ['moneyDebt', result.debtTotal, result.knownDebtSubtotal], ['moneyNet', result.netTotal, null]].map(([label, value, partial]) => <div key={label}><dt>{t(label)}</dt><dd>{money(value)}</dd>{value == null && partial != null && <p className="money-help">{t('moneyPartial', { amount: money(partial) })}</p>}</div>)}</dl>
  return <section className={`my-money-panel ${standalone ? 'money-standalone' : 'panel'}`} aria-label={standalone ? t('moneyTitle') : undefined} aria-labelledby={standalone ? undefined : 'my-money-title'} aria-busy={loading}>
    <div className="panel-heading money-heading"><div>{!standalone && <h2 id="my-money-title">{t('moneyTitle')}</h2>}<p className="money-help">{t('moneyIntro')}</p></div>
      {!failed && <div className="money-heading-actions"><button className="secondary" disabled={loading || busy || Boolean(editor)} onClick={() => edit(null)}><Plus size={18} aria-hidden="true" />{t('moneyAdd')}</button><button className="primary" disabled={loading || busy || Boolean(editor) || transferAccounts(accounts).length < 2} title={transferAccounts(accounts).length < 2 ? t('transferNeedAccounts') : undefined} onClick={() => setTransferRequest({ userId, spaceId, token: crypto.randomUUID() })}><ArrowRightLeft size={18} aria-hidden="true" />{t('transferAdd')}</button></div>}
    </div>
    {loading ? <div className="money-skeleton" role="status" aria-label={t('loading')}><span /><span /><span /></div> : failed ? <div className="money-read-error" role="alert"><p>{t('moneyLoadError')}</p><button className="secondary" onClick={reload}>{t('retry')}</button></div> : <>
      {result.rows.length > 0 && <div className={standalone ? 'money-workspace' : undefined}>
        <AccountWallet rows={result.rows} currency={currency} busy={busy} editing={Boolean(editor)} onEdit={edit} onArchive={row => mutate('archive', row)} onDelete={askDelete} />
        {totals}
      </div>}
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
      {archived.length > 0 && <>
        <button className="money-text-button" aria-expanded={showArchived} onClick={() => setShowArchived(value => !value)}>{t(showArchived ? 'moneyHideArchive' : 'moneyShowArchive', { count: archived.length })}</button>
        {showArchived && <ul className="money-rows money-archived">{archived.map(row => <li key={row.id}>
          <div className="money-row-label"><h3>{row.name}</h3><p className="money-help">{t('moneyArchived')}</p></div>
          <div className="money-row-actions">
            <button className="secondary" disabled={busy || Boolean(editor)} onClick={() => mutate('restore', row)}><RotateCcw size={16} aria-hidden="true" />{t('moneyRestore')}</button>
            <button className="money-text-button money-delete-button" disabled={busy || Boolean(editor)} onClick={() => askDelete(row)}>{t('moneyDelete')}</button>
          </div>
        </li>)}</ul>}
      </>}
      {!editor && !deleteTarget && error && <p className="money-error" role="alert">{error}</p>}
    </>}
    {deleteTarget && createPortal(<div className="modal-backdrop account-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeDelete() }}>
      <ModalSurface className="account-modal money-delete-modal" onClose={closeDelete} busy={busy} aria-labelledby="account-delete-title" aria-describedby="account-delete-copy">
        <div className="modal-heading"><h2 id="account-delete-title">{t('moneyDeleteQuestion')}</h2><button className="icon-button" disabled={busy} onClick={closeDelete} aria-label={t('close')}><X size={20} /></button></div>
        <p id="account-delete-copy">{t('moneyDeleteCopy', { name: deleteTarget.name })}</p>
        {error && <p className="money-error" role="alert">{error}</p>}
        <div className="money-form-actions"><button className="secondary" disabled={busy} onClick={closeDelete}>{t('cancel')}</button>
          {conflict ? <button className="primary" disabled={busy} onClick={() => { closeDelete(); reload() }}>{t('moneyReload')}</button>
            : deleteBlocked ? !deleteTarget.archived_at && <button className="primary" disabled={busy} onClick={() => mutate('archive', deleteTarget)}>{t('moneyArchive')}</button>
              : <button className="danger-action" disabled={busy} onClick={() => mutate('remove', deleteTarget)}>{t(busy ? 'deleting' : 'deletePermanently')}</button>}
        </div>
      </ModalSurface>
    </div>, document.querySelector('.app-shell') || document.body)}
    <p className="money-status" role="status">{notice}</p>
    <AccountTransfers key={`${userId}:${spaceId}`} userId={userId} spaceId={spaceId} accounts={accounts} accountsLoading={loading || failed} openRequest={transferRequest?.userId === userId && transferRequest?.spaceId === spaceId ? transferRequest.token : null} onChanged={reload} />
  </section>
}
