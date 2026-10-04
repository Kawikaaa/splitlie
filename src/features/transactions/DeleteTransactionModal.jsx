import ModalSurface from '../../components/ModalSurface'
import { AlertTriangle, X } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'
import { getCategoryTranslationKey } from '../../components/CategorySelect'

export default function DeleteTransactionModal({
  transaction,
  deleting,
  onCancel,
  onConfirm,
}) {
  const { t } = useLanguage()
  if (!transaction) return null

  const description = transaction.description || t(getCategoryTranslationKey(transaction.category)) || t('thisTransaction')

  return (
    <div className="modal-backdrop" onMouseDown={deleting ? undefined : onCancel}>
      <ModalSurface as="section" onClose={onCancel} busy={deleting}
        className="delete-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-confirm-icon"><AlertTriangle size={22} /></div>
        <button className="icon-button delete-confirm-close" type="button" onClick={onCancel} disabled={deleting} aria-label={t('close')}>
          <X size={18} />
        </button>
        <h2 id="delete-transaction-title">{t('deleteTransactionQuestion')}</h2>
        <p>{t('deleteTransactionCopy', { description })}</p>
        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onCancel} disabled={deleting}>{t('cancel')}</button>
          <button className="danger-action" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? t('deleting') : t('deletePermanently')}
          </button>
        </div>
      </ModalSurface>
    </div>
  )
}
