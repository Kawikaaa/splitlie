import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import { uuid } from '../../../supabase/functions/ai-assistant/contract.js'
import { ReceiptImageFigure } from './ReceiptEntry'

export default function ReceiptSummaryReview({ value, total, readOnly, onRescan, onDetails, busy, onCancel }) {
  const { t }=useLanguage()
  const duplicates=Array.isArray(value.duplicates)?value.duplicates.filter(row=>row&&uuid(row.id)):[]
  return <section className="receipt-summary-review" aria-label={t('receiptSummaryReview')}>
    <p className="assistant-muted">{t('receiptSummaryScope')}</p>
    {duplicates.length>0 && <div className="receipt-summary-duplicates"><p>{t('receiptDuplicate')}</p>{duplicates.map(row=><Link key={row.id} to={`/transactions?${new URLSearchParams({entry:row.id})}`} target="_blank" rel="noopener noreferrer">{t('receiptOpenOriginal')} · {row.transaction_date || ''} {t('receiptNewTab')}</Link>)}</div>}
    {value.preview && <details><summary>{t('receiptSourceImage')}</summary><ReceiptImageFigure preview={value.preview}/></details>}
    {!readOnly && <div className="receipt-summary-actions">
      {onRescan && <button className="assistant-text-button" type="button" disabled={busy} onClick={onRescan}>{t('receiptBackToPhoto')}</button>}
      {onDetails && value.preview && <details className="receipt-optional-lines"><summary>{t('receiptOptionalLines')}</summary><p className="assistant-muted">{t(value.items?.length?'receiptDetailsCached':'receiptDetailsConsent')}</p><button className="secondary" type="button" disabled={busy} onClick={onDetails}>{t(value.items?.length?'receiptShowLines':'receiptReadLines')}</button></details>}
    </div>}
    {busy && <div role="status"><p>{t('receiptReadingLines')}</p><button type="button" className="assistant-text-button" onClick={onCancel}>{t('receiptStopReading')}</button></div>}
  </section>
}
