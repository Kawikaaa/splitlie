import ModalSurface from './ModalSurface'
import { AlertTriangle, X } from '../icons'
import { useLanguage } from '../i18n/LanguageContext'

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  busyLabel = 'Working...',
  busy = false,
  onCancel,
  onConfirm,
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={busy ? undefined : onCancel}>
      <ModalSurface onClose={onCancel} busy={busy} className="confirm-action-modal" role="alertdialog"
        aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button confirm-action-close" type="button"
          onClick={onCancel} disabled={busy} aria-label={t('close')}>
          <X size={18} />
        </button>

        <div className="confirm-action-icon"><AlertTriangle size={22} /></div>
        <h2 id="confirm-action-title">{title}</h2>
        <p id="confirm-action-description">{description}</p>

        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
          <button className="danger-action" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </ModalSurface>
    </div>
  )
}
