import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Pencil, RotateCcw } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { createTransferRepository } from './transferRepository.js'
import { transferAccounts, transferError } from './transferEngine.js'
import TransferModal from './TransferModal'
import './Transfers.css'

const repository = createTransferRepository(supabase)
export default function AccountTransfers({ userId, spaceId, accounts, accountsLoading, openRequest, onChanged }) {
  const { t, locale } = useLanguage()
  const [history, setHistory] = useState({ rows: [], loading: true, error: false, more: false })
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const generation = useRef(0), pending = useRef(false), alive = useRef(true), scope = useRef({ userId, spaceId })
  scope.current = { userId, spaceId }
  const reload = useCallback(async () => {
    const version = ++generation.current
    setHistory({ rows: [], loading: true, error: false, more: false })
    try {
      const { data, error: failure } = await repository.list({ userId, spaceId })
      if (failure) throw failure
      if (version === generation.current) setHistory({ rows: data, loading: false, error: false, more: data.length === 20 })
    } catch { if (version === generation.current) setHistory({ rows: [], loading: false, error: true, more: false }) }
  }, [userId, spaceId])
  useEffect(() => { alive.current = true; setEditor(null); setNotice(''); reload(); return () => { alive.current = false; generation.current++ } }, [reload])
  useEffect(() => { if (openRequest) { setEditor({ record: null, reversing: false }); setError(''); setNotice('') } }, [openRequest])
  const refresh = async () => {
    try {
      const [, , latest] = await Promise.all([onChanged(), reload(), editor?.record ? repository.get({ userId, spaceId, id: editor.record.id }) : null])
      if (!alive.current) return
      if (latest?.error) throw latest.error
      if (latest?.data) setEditor(value => value?.record?.id === latest.data.id ? { ...value, record: latest.data } : value)
      setError(latest?.data?.status === 'cancelled' ? 'transferConflict' : '')
    } catch { if (alive.current) setError('transferConflict') }
  }
  const save = async input => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    const savedScope = { userId, spaceId }
    try {
      const response = await repository[editor.reversing ? 'cancel' : 'save']({ ...input, ...savedScope })
      if (response.error) throw response.error
      if (!alive.current || scope.current.userId !== userId || scope.current.spaceId !== spaceId) return
      setEditor(null); setNotice(t(editor.reversing ? 'transferReversed' : 'transferSaved'))
      await Promise.all([onChanged(), reload()])
    } catch (failure) { if (alive.current && scope.current.userId === userId && scope.current.spaceId === spaceId) setError(transferError(failure)) }
    finally { pending.current = false; if (alive.current) setBusy(false) }
  }
  const loadMore = async () => {
    if (history.loading || !history.more) return
    const version = generation.current
    setHistory(value => ({ ...value, loading: true, error: false }))
    try {
      const { data, error: failure } = await repository.list({ userId, spaceId, before: history.rows.at(-1) })
      if (failure) throw failure
      if (version === generation.current) setHistory(value => ({ rows: [...new Map([...value.rows, ...data].map(r => [r.id, r])).values()], loading: false, error: false, more: data.length === 20 }))
    } catch { if (version === generation.current) setHistory(value => ({ ...value, loading: false, error: true })) }
  }
  const name = (id, currency) => accounts.find(a => a.id === id)?.name || currency
  const money = (value, code) => formatCurrency(Number(value), code, locale, { maximumFractionDigits: 4 })
  return <section className="transfer-history" aria-labelledby="transfer-history-title">
    <div className="transfer-history-heading"><h2 id="transfer-history-title">{t('transferTitle')}</h2><p className="money-help">{t('transferIntro')}</p></div>
    {notice && <p className="money-status" role="status">{notice}</p>}
    {history.loading && <p className="money-help" role="status">{t('transferLoading')}</p>}
    {history.error && <div role="alert"><p className="money-error">{t('transferLoadError')}</p><button className="secondary" disabled={history.loading} onClick={reload}>{t('retry')}</button></div>}
    {!history.loading && !history.error && !history.rows.length && <p className="money-help transfer-empty">{t('transferEmpty')}</p>}
    {!accountsLoading && transferAccounts(accounts).length < 2 && <p className="money-help">{t('transferNeedAccounts')}</p>}
    <ul className="transfer-list">{history.rows.map(row => <li key={row.id}>
      <div className="transfer-record-main"><div className="transfer-route"><strong>{name(row.source_account_id, row.source_currency)}</strong><ArrowRight size={16} aria-hidden="true" /><strong>{name(row.target_account_id, row.target_currency)}</strong></div><div className="transfer-record-meta"><time dateTime={row.transfer_date}>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(row.transfer_date + 'T12:00:00'))}</time><span className={row.status === 'cancelled' ? 'transfer-cancelled' : ''}>{t(row.status === 'cancelled' ? 'transferCancelled' : 'transferCompleted')}</span></div>{row.note && <p className="money-help transfer-note">{row.note}</p>}</div>
      <div className="transfer-amounts"><span>{t('transferSent')} <strong>{money(row.source_amount, row.source_currency)}</strong></span><span>{t('transferReceived')} <strong>{money(row.target_amount, row.target_currency)}</strong></span></div>
      {row.status === 'completed' && <div className="transfer-record-actions"><button className="icon-button" disabled={busy || accountsLoading} aria-label={t('transferEditHistory', { source: name(row.source_account_id, row.source_currency), target: name(row.target_account_id, row.target_currency) })} onClick={() => { setEditor({ record: row, reversing: false }); setError('') }}><Pencil size={18} aria-hidden="true" /></button><button className="icon-button" disabled={busy || accountsLoading} aria-label={t('transferReverseHistory', { source: name(row.source_account_id, row.source_currency), target: name(row.target_account_id, row.target_currency) })} onClick={() => { setEditor({ record: row, reversing: true }); setError('') }}><RotateCcw size={18} aria-hidden="true" /></button></div>}
    </li>)}</ul>
    {history.more && !history.error && <button className="money-text-button" disabled={history.loading} onClick={loadMore}>{t('transferMore')}</button>}
    {editor && <TransferModal key={editor.record?.id || 'new'} accounts={accounts} loading={accountsLoading} record={editor.record} reversing={editor.reversing} busy={busy} error={error} onClose={() => { if (!pending.current) { setEditor(null); setError('') } }} onSave={save} onReload={refresh} />}
  </section>
}
