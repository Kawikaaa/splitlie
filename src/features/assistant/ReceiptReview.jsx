import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import { X } from '../../icons'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import { uuid } from '../../../supabase/functions/ai-assistant/contract.js'
import { ADJUSTMENTS, adjustmentMode, reconcileReceipt, receiptCanConfirm } from './receiptReconciliation'
import { ReceiptImageFigure } from './ReceiptEntry'
import ReceiptSummaryReview from './ReceiptSummaryReview'
import './Assistant.css'

export default function ReceiptReview({ value, onChange, total, currency, readOnly = false, onRescan, onDetails, busy, onCancel }) {
  const { t, locale } = useLanguage(), prefix = useId()
  if (!value) return null
  if (value.capture_mode === 'summary') return <ReceiptSummaryReview value={value} total={total} readOnly={readOnly} onRescan={onRescan} onDetails={onDetails} busy={busy} onCancel={onCancel}/>
  const result = reconcileReceipt(value, total)
  const change = patch => onChange({ ...value, ...patch, reviewed: false, exception_confirmed: false })
  const lineChange = (index, patch) => change({ items: value.items.map((item, position) => position === index ? { ...item, ...patch } : item) })
  const errorFor = field => result.issues.find(issue => issue.field === field)
  const fieldProps = field => ({ id: `${prefix}-${field}`, 'aria-invalid': !!errorFor(field), 'aria-describedby': errorFor(field) ? `${prefix}-${field}-error` : undefined })
  const fieldError = field => errorFor(field) && <small className="assistant-error" id={`${prefix}-${field}-error`}>{t(`receiptInvalid_${errorFor(field).code}`)}</small>
  const needsException = ['difference', 'unverifiable'].includes(result.status)
  const uncertain = (value.uncertain || []).filter(field => ['merchant','date','currency','total','items'].includes(field))
  return <section className="receipt-review" aria-label={t('receiptReview')}>
    <div className="assistant-row"><h3>{t('receiptReview')}</h3>{!readOnly && <button type="button" className="assistant-text-button" onClick={() => onChange(null)}>{t('receiptDetach')}</button>}</div>
    {!readOnly && value.capture_mode==='details' && <button type="button" className="assistant-text-button" onClick={()=>onChange({...value,capture_mode:'summary',reviewed:false})}>{t('receiptTotalOnly')}</button>}
    {!readOnly && <><p>{t('receiptReviewCopy')}</p><p className="assistant-muted">{t('receiptDefaults')}</p></>}
    {!!uncertain.length && !readOnly && <p className="assistant-muted">{t('receiptUncertain')} {uncertain.map(field => t({ merchant:'description',date:'date',currency:'currency',total:'amount',items:'receiptReview' }[field])).join(' · ')}</p>}
    {!!value.duplicates?.length && <div className="receipt-duplicates"><p>{t('receiptDuplicate')}</p>{value.duplicates.filter(item => uuid(item.id)).map(item => <Link key={item.id} to={`/transactions?${new URLSearchParams({ entry: item.id })}`} target="_blank" rel="noopener noreferrer">{t('receiptOpenOriginal')} · {item.transaction_date || item.date || ''}<span className="assistant-muted"> {t('receiptNewTab')}</span></Link>)}</div>}
    {value.preview && <details><summary>{t('receiptSourceImage')}</summary><ReceiptImageFigure preview={value.preview} /></details>}
    {!readOnly && result.issues.length > 0 && <div className="receipt-validation" role="status"><p>{t('receiptFixFields')}</p><ul>{result.issues.map(issue => <li key={issue.field}>{issue.field.startsWith('item-') ? <a href={`#${prefix}-${issue.field}`} onClick={event => { event.preventDefault(); document.getElementById(`${prefix}-${issue.field}`)?.focus() }}>{t('receiptLineIssue', { index: issue.index + 1 })}: {t(`receiptInvalid_${issue.code}`)}</a> : t(`receiptInvalid_${issue.code}`)}</li>)}</ul></div>}
    <div className="receipt-lines">{value.items.map((item, index) => <div className="receipt-line" key={index}>
      {readOnly ? <><span>{item.name}{item.quantity != null ? ` × ${item.quantity}` : ''}</span><strong>{item.amount == null ? t('receiptUnknownAmount') : formatCurrency(item.amount, currency)}</strong></> : <>
        <label>{t('receiptItem')}<input {...fieldProps(`item-${index}-name`)} aria-label={`${t('receiptItem')} ${index + 1}`} maxLength={120} value={item.name} onChange={event => lineChange(index, { name: event.target.value })} />{fieldError(`item-${index}-name`)}</label>
        <label>{t('receiptQuantity')}<input {...fieldProps(`item-${index}-quantity`)} inputMode="decimal" aria-label={`${t('receiptQuantity')} ${index + 1}`} value={item.quantity ?? ''} onChange={event => lineChange(index, { quantity: event.target.value === '' ? null : event.target.value })} />{fieldError(`item-${index}-quantity`)}</label>
        <label>{t('receiptLineTotal')}<input {...fieldProps(`item-${index}-amount`)} inputMode="decimal" aria-label={`${t('receiptLineTotal')} ${index + 1}`} placeholder={t('receiptUnknownAmount')} value={item.amount ?? ''} onChange={event => lineChange(index, { amount: event.target.value === '' ? null : event.target.value })} />{fieldError(`item-${index}-amount`)}</label>
        <button type="button" className="icon-button" aria-label={t('receiptRemoveLine', { index: index + 1 })} onClick={() => change({ items: value.items.filter((_, position) => position !== index) })}><X size={15} /></button></>}
    </div>)}</div>
    {!readOnly && value.items.length < 60 && <button className="assistant-text-button" type="button" onClick={() => change({ items: [...value.items, { name: '', quantity: null, amount: null }] })}>{t('receiptAddLine')}</button>}
    {!readOnly && <p className="assistant-muted">{t('receiptAdjustmentModes')}</p>}
    <div className="receipt-adjustments">{ADJUSTMENTS.map(field => readOnly ? <p key={field}>{t(`receipt${field[0].toUpperCase()}${field.slice(1)}`)} <strong>{value[field] == null ? t('receiptUnknownAmount') : formatCurrency(value[field], currency)}</strong>{value.adjustment_modes && <small>{t(`receiptMode_${adjustmentMode(value, field)}`)}</small>}</p> : <div key={field} className="receipt-adjustment"><label>{t(`receipt${field[0].toUpperCase()}${field.slice(1)}`)}<select aria-label={`${t(`receipt${field[0].toUpperCase()}${field.slice(1)}`)} ${t('receiptTreatment')}`} value={adjustmentMode(value, field)} onChange={event => change({ adjustment_modes: { ...value.adjustment_modes, [field]: event.target.value } })}>{['unknown', 'additional', 'included', 'not_applicable'].map(mode => <option key={mode} value={mode}>{t(`receiptMode_${mode}`)}</option>)}</select></label>{adjustmentMode(value, field) !== 'not_applicable' && <label className="receipt-adjustment-amount">{t('amount')}<input {...fieldProps(field)} aria-label={t(`receipt${field[0].toUpperCase()}${field.slice(1)}`)} inputMode="decimal" placeholder={t('receiptUnknownAmount')} value={value[field] ?? ''} onChange={event => change({ [field]: event.target.value || null })} />{fieldError(field)}</label>}</div>)}</div>
    {!readOnly && <div className="receipt-reconciliation" role="status"><strong>{t(`receiptStatus_${result.status}`)}</strong>{result.status === 'difference' && <p>{t('receiptDifference', { amount: formatCurrency(Number(result.difference) / 10000, currency, locale, {maximumFractionDigits:4}) })}</p>}{result.status === 'unverifiable' && <p>{t('receiptCannotBalance')}</p>}</div>}
    {!readOnly && needsException && <div className="receipt-exception"><p>{t('receiptExceptionCopy')}</p><label>{t('receiptExceptionReason')}<input maxLength={240} value={value.review_reason || ''} placeholder={t('receiptExceptionPlaceholder')} onChange={event => change({ review_reason: event.target.value })} /></label><label className="assistant-checkbox"><input type="checkbox" checked={!!value.exception_confirmed} disabled={!value.review_reason?.trim() || value.review_reason.trim().length < 3} onChange={event => onChange({ ...value, exception_confirmed: event.target.checked, reviewed: false })} /><span>{t('receiptExceptionConfirm')}</span></label></div>}
    {!readOnly && <label className="assistant-checkbox"><input type="checkbox" checked={!!value.reviewed} disabled={!receiptCanConfirm(value, String(total))} onChange={event => onChange({ ...value, reviewed: event.target.checked })} /><span>{t('receiptConfirmContext')}</span></label>}
    {readOnly && <p className="assistant-muted">{t(value.review_mode === 'manual_exception' ? 'receiptSavedException' : value.review_mode === 'reconciled' ? 'receiptSavedBalanced' : 'receiptSavedLegacy')}{value.review_mode === 'manual_exception' && <span> {value.review_reason}</span>}</p>}
  </section>
}

