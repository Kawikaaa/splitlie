import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { Camera, X, RefreshCw } from '../../icons'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'
import { getToday } from '../transactions/transactionUtils'
import { validateReceipt } from '../../../supabase/functions/ai-assistant/contract.js'
import { openReceiptImage, encodeReceiptImage } from './receiptImage'
import { requestAssistant, assistantErrorKey } from './assistantService'
import './Assistant.css'

export function ReceiptImageFigure({ preview }) {
  const { t } = useLanguage(), [zoomed, setZoomed] = useState(false), zoomId = useId()
  return <figure className="receipt-preview-frame">
    <div id={zoomId} className={`receipt-preview-viewport ${zoomed ? 'is-zoomed' : ''}`} tabIndex={zoomed ? 0 : undefined} role={zoomed ? 'region' : undefined} aria-label={zoomed ? t('receiptZoomRegion') : undefined} aria-describedby={zoomed ? `${zoomId}-help` : undefined}>
      <img className="receipt-image-preview" src={preview} alt={t('receiptReview')} />
    </div><figcaption><button type="button" className="assistant-text-button" aria-expanded={zoomed} aria-controls={zoomId} onClick={()=>setZoomed(value=>!value)}>{t(zoomed ? 'receiptZoomOut' : 'receiptZoom')}</button>{zoomed && <small id={`${zoomId}-help`}>{t('receiptZoomHelp')}</small>}</figcaption>
  </figure>
}

export function ReceiptImagePreview({ image, crop, pending, preparing, disabled, onRotate, onCrop, onSend }) {
  const { t } = useLanguage()
  return <><ReceiptImageFigure preview={image.preview} />
    <details className="receipt-image-tools"><summary>{t('receiptAdjustImage')}</summary><button type="button" className="assistant-text-button" disabled={pending} onClick={onRotate}><RefreshCw size={15} />{t('receiptRotate')}</button>
    <div className="receipt-crop-controls">{['top', 'bottom', 'left', 'right'].map(edge => <label key={edge}>{t('receiptCrop', { edge: t(`receipt${edge[0].toUpperCase()}${edge.slice(1)}`) })}<input type="range" min="0" max="35" value={crop[edge] || 0} disabled={pending} onChange={event => onCrop(edge, Number(event.target.value))} /></label>)}</div>
    </details>
    <button type="button" className="primary" disabled={pending || preparing || disabled} onClick={onSend}>{t(pending ? 'receiptReadingTotal' : 'receiptReadTotal')}</button></>
}

const defaultInvoke = (...args) => supabase.functions.invoke(...args)
export default forwardRef(function ReceiptEntry({ spaceId, active = true, embedded = false, disabled, onResult, onBusy, onManual, onDetailError, invoke = defaultInvoke }, ref) {
  const { language, t } = useLanguage(), input = useRef(null), bitmap = useRef(null), epoch = useRef(0), controller = useRef(null)
  const requestEpoch = useRef(0), sending = useRef(false)
  const ownsBusy = useRef(false)
  const releaseBusy = () => { if (ownsBusy.current) { ownsBusy.current = false; onBusy?.(false) } }
  const [expanded, setExpanded] = useState(embedded), [image, setImage] = useState(null), [rotation, setRotation] = useState(0), [crop, setCrop] = useState({}), [revision, setRevision] = useState(0)
  const [slow, setSlow] = useState(false)
  const [preparing, setPreparing] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('')
  function cancel() { requestEpoch.current++; sending.current = false; controller.current?.abort(); setPending(false); releaseBusy() }
  useEffect(() => () => { epoch.current++; requestEpoch.current++; controller.current?.abort(); bitmap.current?.close(); releaseBusy() }, [])
  useEffect(() => {
    const id = ++epoch.current; cancel()
    if (!bitmap.current) return
    let alive = true; setPreparing(true); setError('')
    encodeReceiptImage(bitmap.current, rotation, crop).then(result => { if (alive && epoch.current === id) setImage(result) }).catch(() => { if (alive && epoch.current === id) { setImage(null); setError('receiptInvalidImage') } }).finally(() => { if (alive && epoch.current === id) setPreparing(false) })
    return () => { alive = false }
  }, [revision, rotation, crop])
  // Switching form/language cancels transmission, but must not invalidate decoding.
  useEffect(() => { cancel() }, [language, spaceId, active])
  useEffect(() => { if (active && embedded) setExpanded(true) }, [active, embedded])
  useEffect(() => { setSlow(false); if (!pending) return; const timer=setTimeout(()=>setSlow(true),6000); return ()=>clearTimeout(timer) },[pending])
  useImperativeHandle(ref,()=>({recognizeDetails:()=>send('details',true),cancel}))
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    const id = ++epoch.current; cancel(); setImage(null); setError(''); setPreparing(true)
    try {
      const next = await openReceiptImage(file)
      if (id !== epoch.current) { next.close(); return }
      bitmap.current?.close(); bitmap.current = next; setRotation(0); setCrop({}); setRevision(value => value + 1)
    } catch { if (id === epoch.current) { setError('receiptInvalidImage'); setPreparing(false) } }
  }
  function discard() { epoch.current++; cancel(); bitmap.current?.close(); bitmap.current = null; setImage(null); setPreparing(false); setError('') }
  function close() { cancel(); setExpanded(false) }
  function manual() {
    cancel()
    onManual?.(image ? { merchant:null,date:null,currency:null,total:null,items:[],tax:null,tip:null,discount:null,uncertain:['total'],capture_mode:'summary',recognition_status:'manual',image_hash:image.imageHash,preview:image.preview,reviewed:false } : null)
  }
  async function send(mode = 'summary', fromReview = false) {
    if ((!active && !fromReview) || !image || preparing || sending.current || disabled) return
    const id = ++requestEpoch.current; sending.current = true; controller.current = new AbortController(); setPending(true); setError('')
    ownsBusy.current = true; onBusy?.(true)
    const result = await requestAssistant(invoke, { task: mode === 'summary' ? 'receipt_summary' : 'receipt', consent: true, today: getToday(), language, spaceId, image: image.imageData, imageHash: image.imageHash }, controller.current.signal)
    if (id !== requestEpoch.current) return
    sending.current = false; setPending(false); releaseBusy()
    if (!result.ok || !validateReceipt(result.receipt) || (mode === 'summary' && result.receiptMode !== 'summary')) {
      const key = result.code === 'TIMEOUT' ? 'receiptTimedOut' : mode === 'summary' && (result.code === 'INVALID_REQUEST' || result.ok) ? 'receiptSummaryUpdate' : ['NOT_RECEIPT','REVIEW_REQUIRED','INVALID_OUTPUT'].includes(result.code) ? 'receiptRecognitionError' : assistantErrorKey(result.code)
      setError(key); if(fromReview)onDetailError?.(key); return
    }
    onResult({ ...result.receipt, capture_mode:mode, image_hash: result.imageHash, model: result.model, reviewed: false, duplicates: Array.isArray(result.duplicates) ? result.duplicates.filter(row=>row && typeof row.id==='string') : [], preview: image.preview })
    close()
  }
  return <section className="receipt-entry" hidden={!active}>
    {!embedded && <button className="assistant-text-button" type="button" disabled={disabled} aria-expanded={expanded} onClick={() => { if (expanded) close(); else setExpanded(true) }}><Camera size={17} />{t(image ? 'receiptResume' : 'receiptScan')}</button>}
    {expanded && <div className="receipt-upload">
      <p className="receipt-entry-intro">{t('receiptTotalFirst')}</p>
      <input ref={input} className="receipt-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} tabIndex={-1} />
      <button type="button" className={image ? 'assistant-text-button' : 'secondary receipt-photo-picker'} disabled={pending || disabled} onClick={() => input.current?.click()}><Camera size={20}/>{t(image ? 'receiptReplacePhoto' : 'receiptChoose')}</button>{!image && <small>{t('receiptFormats')}</small>}
      {image && <small>{t('receiptPrivacyShort')}</small>}
      {image && <ReceiptImagePreview image={image} crop={crop} pending={pending} preparing={preparing} disabled={disabled} onRotate={() => setRotation(value => (value + 90) % 360)} onCrop={(edge, value) => setCrop(previous => ({ ...previous, [edge]: value }))} onSend={() => void send()} />}
      {preparing && <p role="status">{t('receiptPreparing')}</p>}
      {pending && <p role="status">{t(slow ? 'receiptSlow' : 'receiptReadingTotal')}</p>}
      {(image || error) && onManual && <button type="button" className="assistant-text-button" onClick={manual}>{t('receiptEnterManually')}</button>}
      {image && !pending && <button type="button" className="assistant-text-button receipt-discard" onClick={discard}>{t('receiptDiscard')}</button>}
      {pending && <button type="button" className="assistant-text-button" onClick={cancel}>{t('receiptStopReading')}</button>}
      {error && <p className="assistant-error" role="status">{t(error)}</p>}
    </div>}
  </section>
})
