import ModalSurface from './ModalSurface'
import { useEffect, useState } from 'react'
import { ArrowRight, X } from '../icons'

import { createSettlement } from '../data/ledgerApi'
import { useLanguage } from '../i18n/LanguageContext'
import { getLocalDateKey } from '../utils/dateKeys'

function roundMoney(value) {
  return (
    Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100
  )
}

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(value) || 0)
}

function getToday() {
  return getLocalDateKey()
}

export default function SettlementModal({
  open,
  onClose,
  balance,
  activeSpace,
  user,
  onSaved,
}) {
  const { t } = useLanguage()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getToday())
  const [note, setNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !balance) return

    setAmount(
      roundMoney(balance.amount).toFixed(2)
    )

    setDate(getToday())
    setNote('')
    setError('')
  }, [open, balance])

  if (
    !open ||
    !balance ||
    !activeSpace ||
    !user
  ) {
    return null
  }

  const currency =
    activeSpace.currency || 'USD'

  const outstanding =
    roundMoney(balance.amount)

  const debtorName =
    balance.from?.display_name ||
    'Member'

  const creditorName =
    balance.to?.display_name ||
    'Member'

  const currentUserIsDebtor =
    user.id ===
    balance.from?.user_id

  const currentUserIsCreditor =
    user.id ===
    balance.to?.user_id

  const canRecord =
    currentUserIsDebtor ||
    currentUserIsCreditor

  const actionTitle =
    currentUserIsDebtor
      ? t('recordPayment')
      : currentUserIsCreditor
        ? t('recordReceived')
        : t('recordSettlement')

  const actionDescription =
    currentUserIsDebtor
      ? t('recordPaidCopy', { name: creditorName })
      : currentUserIsCreditor
        ? t('recordReceivedCopy', { name: debtorName })
        : ''

  const submitLabel =
    currentUserIsDebtor
      ? t('recordPayment')
      : currentUserIsCreditor
        ? t('recordReceived')
        : t('recordSettlement')

  async function handleSubmit(
    event
  ) {
    event.preventDefault()

    setError('')

    if (!canRecord) {
      setError(
        t('settlementMembersOnly')
      )
      return
    }

    const numericAmount =
      roundMoney(
        Number(amount)
      )

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setError(
        t('positiveAmountRequired')
      )
      return
    }

    if (
      numericAmount >
      outstanding + 0.009
    ) {
      setError(
        t('settlementLimit', { amount: money(outstanding, currency) })
      )
      return
    }

    if (!date) {
      setError(
        t('settlementDateRequired')
      )
      return
    }

    setSaving(true)

    const { error: insertError } =
      await createSettlement({
        spaceId:
          activeSpace.id,
        fromUserId:
          balance.from.user_id,
        toUserId:
          balance.to.user_id,
        amount:
          numericAmount,
        currency,
        settlementDate:
          date,
        note:
          note.trim(),
      })

    setSaving(false)

    if (insertError) {
      setError(
        insertError.message
      )
      return
    }

    if (onSaved) {
      await onSaved()
    }

    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={
        saving ? undefined : onClose
      }
    >
      <ModalSurface as="div" onClose={onClose} busy={saving} aria-labelledby="settlement-editor-title"
        className="settlement-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {t('sharedBalance')}
            </p>

            <h2 id="settlement-editor-title">
              {actionTitle}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            disabled={saving}
            onClick={
              onClose
            }
            aria-label={t('close')}
          >
            <X size={19} />
          </button>
        </div>

        <div className="settlement-direction">
          <div className="settlement-person">
            <span>
              {t('from')}
            </span>

            <strong>
              {currentUserIsDebtor
                ? t('you')
                : debtorName}
            </strong>
          </div>

          <div className="settlement-arrow">
            <ArrowRight
              size={19}
            />
          </div>

          <div className="settlement-person">
            <span>
              {t('to')}
            </span>

            <strong>
              {currentUserIsCreditor
                ? t('you')
                : creditorName}
            </strong>
          </div>
        </div>

        <div className="settlement-outstanding">
          <span>
            {t('outstandingBalance')}
          </span>

          <strong>
            {money(
              outstanding,
              currency
            )}
          </strong>
        </div>

        <form
          className="transaction-form"
          onSubmit={
            handleSubmit
          }
        >
          <p className="settlement-help">
            {actionDescription}
          </p>

          <label>
            {t('amount')}

            <div className="amount-input">
              <span>
                {currency ===
                'USD'
                  ? '$'
                  : currency}
              </span>

              <input
                autoFocus
                inputMode="decimal"
                type="number"
                min="0.01"
                step="0.01"
                max={
                  outstanding
                }
                value={
                  amount
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
                  )
                }
              />
            </div>
          </label>

          <p className="settlement-help">
            {t('partialRepaymentHelp')}
          </p>

          <label>
            {t('date')}

            <input
              type="date"
              value={
                date
              }
              onChange={(
                event
              ) =>
                setDate(
                  event.target
                    .value
                )
              }
            />
          </label>

          <label>
            <span>
              {t('note')}{' '}
              <span className="optional-label">
                {t('optional')}
              </span>
            </span>

            <input
              type="text"
              placeholder={t('settlementNoteExample')}
              value={
                note
              }
              onChange={(
                event
              ) =>
                setNote(
                  event.target
                    .value
                )
              }
            />
          </label>

          {error && (
            <div className="auth-message error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="secondary"
              type="button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
            >
              {t('cancel')}
            </button>

            <button
              className="primary"
              type="submit"
              disabled={
                saving ||
                !canRecord
              }
            >
              {saving
                ? t('recording')
                : submitLabel}
            </button>
          </div>
        </form>
      </ModalSurface>
    </div>
  )
}
