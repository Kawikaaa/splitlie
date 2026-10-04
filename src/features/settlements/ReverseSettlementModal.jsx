import ModalSurface from '../../components/ModalSurface'
import { RotateCcw, X } from '../../icons'
import { useEffect, useState } from 'react'

import { reverseSettlement } from '../../data/ledgerApi'
import { useLanguage } from '../../i18n/LanguageContext'

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
  }).format(Number(value) || 0)
}

export default function ReverseSettlementModal({
  settlement,
  activeSpace,
  onClose,
  onReversed,
}) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!settlement) return
    setReason('')
    setSaving(false)
    setError('')
  }, [settlement?.id])

  if (!settlement) return null

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedReason = reason.trim()

    if (normalizedReason.length < 3) {
      setError(t('reversalReasonRequired'))
      return
    }

    setSaving(true)
    setError('')

    const { error: reversalError } = await reverseSettlement({
      settlementId: settlement.id,
      reason: normalizedReason,
    })

    setSaving(false)

    if (reversalError) {
      setError(reversalError.message || t('reverseSettlementError'))
      return
    }

    await onReversed?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={saving ? undefined : onClose}>
      <ModalSurface as="section" onClose={onClose} busy={saving} className="reverse-settlement-modal" role="dialog" aria-modal="true"
        aria-labelledby="reverse-settlement-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('settlementCorrection')}</p>
            <h2 id="reverse-settlement-title">{t('reverseSettlementQuestion')}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label={t('close')}>
            <X size={19} />
          </button>
        </div>

        <div className="reverse-settlement-summary">
          <RotateCcw size={20} />
          <div>
            <span>{t('restoredAmount')}</span>
            <strong>{money(settlement.amount, settlement.currency || activeSpace.currency)}</strong>
          </div>
        </div>

        <p className="muted">
          {t('reversalCopy')}
        </p>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <label>
            {t('reversalReason')}
            <textarea
              rows="3"
              placeholder={t('reversalReasonExample')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={saving}
            />
          </label>

          {error && <div className="auth-message error" role="alert">{error}</div>}

          <div className="modal-actions">
            <button className="secondary" type="button" onClick={onClose} disabled={saving}>{t('cancel')}</button>
            <button className="danger-action" type="submit" disabled={saving}>
              {saving ? t('reversing') : t('reverseSettlement')}
            </button>
          </div>
        </form>
      </ModalSurface>
    </div>
  )
}
