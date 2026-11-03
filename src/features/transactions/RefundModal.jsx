import { useEffect, useMemo, useRef, useState } from 'react'
import ModalSurface from '../../components/ModalSurface'
import { X, RefreshCw } from '../../icons'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { getCategoryTranslationKey } from '../../components/CategorySelect'
import { useTransactionAccount } from '../accounts/useTransactionAccount'
import TransactionAccountField from '../accounts/TransactionAccountField'
import { createPersonalTransaction, updatePersonalTransaction } from '../../data/ledgerApi'
import { getExchangeRate } from '../../services/currency/exchangeRateService'
import { convertCurrency } from '../../services/currency/currencyService'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { getToday } from './transactionUtils'
import { createRefundRepository, refundRemaining } from './refundRepository'

const repository = createRefundRepository(supabase)

export default function RefundModal({ originalId, transaction, activeSpace, user, onClose, onSaved }) {
  const { t, locale } = useLanguage()
  const [context, setContext] = useState(null)
  const [readError, setReadError] = useState(false)
  const [reading, setReading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction?.transaction_date || getToday())
  const [description, setDescription] = useState(transaction?.description || '')
  const [conversion, setConversion] = useState(null)
  const [fxRetry, setFxRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const submitting = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    let cancelled = false
    setReadError(false); setReading(true)
    repository.context({ userId: user.id, spaceId: activeSpace.id, originalId }).then(value => {
      if (!cancelled) { setContext(value); setReading(false) }
    }).catch(() => { if (!cancelled) { setReadError(true); setReading(false) } })
    return () => { cancelled = true }
  }, [user.id, activeSpace.id, originalId, refresh])
  const original = context?.original
  const currency = original?.currency || transaction?.currency || activeSpace.currency
  const baseCurrency = activeSpace.currency
  const remaining = useMemo(() => original ? refundRemaining(original, context.refunds, transaction?.id) : null, [context, transaction?.id])
  const link = useTransactionAccount({ open: true, personal: true, userId: user.id, spaceId: activeSpace.id,
    transaction, defaultAccountId: original?.financial_account_id || '', currency, date, amount })
  const fxKey = `${currency}:${baseCurrency}:${date}`
  useEffect(() => {
    if (!original || !date) return
    let cancelled = false
    setConversion({ key: fxKey, loading: true })
    const locked = transaction && transaction.currency === currency && transaction.base_currency === baseCurrency
      && transaction.transaction_date === date && Number(transaction.exchange_rate) > 0
    const request = locked ? Promise.resolve({ rate: Number(transaction.exchange_rate), date: transaction.exchange_rate_date })
      : getExchangeRate({ fromCurrency: currency, toCurrency: baseCurrency, date })
    request.then(quote => { if (!cancelled) setConversion({ key: fxKey, quote }) })
      .catch(() => { if (!cancelled) setConversion({ key: fxKey, failed: true }) })
    return () => { cancelled = true }
  }, [original?.id, fxKey, fxRetry, transaction])
  const quote = conversion?.key === fxKey ? conversion.quote : null
  const baseAmount = Number.isFinite(Number(amount)) && Number(amount) > 0 && quote ? convertCurrency({ amount: Number(amount), rate: quote.rate, toCurrency: baseCurrency }) : null
  const close = () => { if (!submitting.current) onClose() }
  async function reloadError() {
    if (!conflict) { setRefresh(value => value + 1); setError(''); return }
    if (submitting.current) return
    submitting.current = true; setSaving(true)
    try { await onSaved(); if (mounted.current) onClose() }
    finally { submitting.current = false; if (mounted.current) setSaving(false) }
  }
  async function save(event) {
    event.preventDefault()
    if (submitting.current) return
    setError('')
    setConflict(false)
    if (reading || readError || !original || remaining == null) { setError(t('refundLoadError')); return }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > remaining) { setError(t('refundLimitError')); return }
    if (!date || date < original.transaction_date || date > getToday()) { setError(t('refundDateError')); return }
    if (!quote || !baseAmount) { setError(t('fxRequired')); return }
    if (!link.ready || !link.payload) { setError(t('moneyAccountUnavailable')); return }
    if (link.selected?.archived_at && !transaction) { setError(t('moneyAccountArchivedError')); return }
    submitting.current = true; setSaving(true)
    try {
      const changes = { ...link.payload, type: 'refund', parent_transaction_id: original.id, paid_by: user.id,
        amount: Number(amount), currency, base_amount: baseAmount, base_currency: baseCurrency,
        exchange_rate: quote.rate, exchange_rate_date: quote.date || date, conversion_status: 'converted',
        category: original.category, description: description.trim() || null, transaction_date: date, payment_status: 'paid', split_type: 'none' }
      const response = transaction ? await updatePersonalTransaction({ transactionId: transaction.id, spaceId: activeSpace.id,
        expectedUpdatedAt: transaction.updated_at, changes })
        : await createPersonalTransaction({ ...changes, space_id: activeSpace.id, created_by: user.id })
      if (response.error) throw response.error
      if (!mounted.current) return
      await onSaved()
      if (mounted.current) onClose()
    } catch (failure) {
      if (!mounted.current) return
      const message = failure.message || ''
      setConflict(failure.code === 'PGRST116')
      setError(t(message.includes('REFUND_LIMIT') ? 'refundLimitError' : message.includes('REFUND_DATE') ? 'refundDateError'
        : message.includes('REFUND_') ? 'refundLoadError' : failure.code === 'PGRST116' ? 'moneyTransactionConflict'
          : message.includes('ACCOUNT_INSUFFICIENT') ? 'moneyInsufficient' : message.includes('ACCOUNT_ARCHIVED') ? 'moneyAccountArchivedError'
            : message.includes('ACCOUNT_') ? 'moneyAccountUnavailable' : 'moneyTransactionSaveError'))
    } finally {
      submitting.current = false
      if (mounted.current) setSaving(false)
    }
  }
  return <div className="modal-backdrop transaction-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <ModalSurface as="div" className="transaction-modal refund-modal" onClose={close} busy={saving} aria-labelledby="refund-title">
      <div className="modal-heading"><h2 id="refund-title">{t(transaction ? 'editRefund' : 'recordRefund')}</h2><button className="icon-button" type="button" disabled={saving} onClick={close} aria-label={t('close')}><X size={19} /></button></div>
      {!original ? <div className="refund-loading" role={readError ? 'alert' : 'status'}><p>{t(readError ? 'refundLoadError' : 'loading')}</p>{readError && <button className="secondary" onClick={() => setRefresh(value => value + 1)}>{t('retry')}</button>}</div>
        : <form className="transaction-form" onSubmit={save}>
          <div className="refund-original"><span>{t('refundOriginal')}</span><strong>{original.description || t(getCategoryTranslationKey(original.category))}</strong><small>{formatCurrency(Number(original.amount), currency, locale)} · {original.transaction_date}</small><p>{t('refundRemaining', { amount: formatCurrency(remaining, currency, locale) })}</p></div>
          <label className="transaction-amount-field">{t('refundAmount')}<div className="amount-input"><span className="amount-currency-code">{currency}</span><input aria-label={t('refundAmount')} type="number" inputMode="decimal" min="0" max={remaining ?? undefined} step="any" placeholder="0.00" value={amount} disabled={saving} required onChange={event => setAmount(event.target.value)} /></div></label>
          <div className="form-grid"><label>{t('category')}<span className="refund-readonly">{t(getCategoryTranslationKey(original.category))}</span></label><label>{t('refundReceivedDate')}<input type="date" min={original.transaction_date} max={getToday()} value={date} disabled={saving} required onChange={event => setDate(event.target.value)} /></label></div>
          <label className="transaction-description-field">{t('description')}<input type="text" value={description} disabled={saving} onChange={event => setDescription(event.target.value)} /></label>
          <TransactionAccountField link={link} type="refund" paymentStatus="paid" disabled={saving} />
          {currency !== baseCurrency && <div className="fx-preview"><span>{t('spaceAccountingAmount', { currency: baseCurrency })}</span><strong>{quote && baseAmount != null ? formatCurrency(baseAmount, baseCurrency, locale) : t(conversion?.failed ? 'fxUnavailable' : 'converting')}</strong>{conversion?.failed && <button className="fx-refresh-button" type="button" onClick={() => setFxRetry(value => value + 1)}><RefreshCw size={14} />{t('retry')}</button>}</div>}
          <p className="refund-help">{t('refundAccountingHelp')}</p>
          {(error || readError) && <div className="error-message" role="alert">{readError ? t('refundLoadError') : error}<button className="fx-refresh-button" type="button" disabled={saving || reading} onClick={reloadError}>{t('moneyReload')}</button></div>}
          {reading && <p className="refund-help" role="status">{t('loading')}</p>}
          <div className="modal-actions"><button className="secondary" type="button" disabled={saving} onClick={close}>{t('cancel')}</button><button className="primary" disabled={saving || reading || readError || !quote || !link.ready || remaining == null || remaining <= 0}>{t(saving ? 'saving' : transaction ? 'saveChanges' : 'saveRefund')}</button></div>
        </form>}
    </ModalSurface>
  </div>
}
