import ModalSurface from './ModalSurface'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Mic, RefreshCw, Sparkles, Square, X } from '../icons'

import {
  createPersonalTransaction,
  createSharedTransaction,
  fetchActiveSpaceMemberRows,
  fetchProfilesByIds,
  fetchRecentTransactions,
  updatePersonalTransaction,
  updateSharedTransaction,
} from '../data/ledgerApi'
import {
  calculateCustomTotal,
  calculateEqualSplits,
  calculatePercentageSplits,
  createTransactionFormValues,
  getToday,
  roundMoney,
  selectParticipants,
  TRANSACTION_CATEGORIES,
} from '../features/transactions/transactionUtils'
import SplitTypeToggle from '../features/transactions/SplitTypeToggle'
import SplitParticipantSelector from '../features/transactions/SplitParticipantSelector'
import EqualSplitSummary from '../features/transactions/EqualSplitSummary'
import CustomSplitEditor from '../features/transactions/CustomSplitEditor'
import PercentageSplitEditor from '../features/transactions/PercentageSplitEditor'
import CategorySelect, { getCategoryTranslationKey } from './CategorySelect'
import AppSelect from './AppSelect'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'
import {
  convertCurrency,
  normalizeCurrency,
  SUPPORTED_CURRENCIES,
} from '../services/currency/currencyService'
import { formatCurrency } from '../services/currency/currencyFormatter'
import { clearExchangeRateCache, getExchangeRate } from '../services/currency/exchangeRateService'
import { parseTransactionText } from '../features/transactions/transactionTextService'

export default function TransactionModal({
  open,
  onClose,
  activeSpace,
  user,
  transaction,
  onSaved,
}) {
  const { language, t } = useLanguage()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [fxQuote, setFxQuote] = useState(null)
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState('')
  const [fxRefreshKey, setFxRefreshKey] = useState(0)
  const [category, setCategory] = useState('Food')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(getToday())

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] =
    useState(false)

  const [paidBy, setPaidBy] = useState('')

  const [splitType, setSplitType] =
    useState('none')

  const [participantIds, setParticipantIds] =
    useState([])

  const [customSplits, setCustomSplits] =
    useState({})
  const [percentageSplits, setPercentageSplits] =
    useState({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [quickText, setQuickText] = useState('')
  const [quickStatus, setQuickStatus] = useState('')
  const [quickParsing, setQuickParsing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)
  const recognitionRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    if (open && formRef.current) formRef.current.scrollTop = 0
  }, [open, detailsExpanded])

  const isShared =
    activeSpace?.type === 'shared'

  const isEditing = Boolean(
    transaction?.id
  )

  const suggestedCategories = useMemo(() => {
    const counts = new Map()
    recentTransactions
      .filter((item) => item.type !== 'income' && item.category && item.category !== 'Income')
      .forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1))

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
    return [...new Set([...ranked, 'Food', 'Transportation', 'Shopping', 'Entertainment'])].slice(0, 5)
  }, [recentTransactions])

  const repeatTransactions = useMemo(() => {
    const seen = new Set()
    return recentTransactions.filter((item) => {
      const key = `${item.type}|${item.description}|${item.category}|${item.amount}|${item.currency}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 4)
  }, [recentTransactions])

  const merchantCategory = useMemo(() => {
    const input = quickText.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim()
    if (input.length < 2) return ''
    const inputLead = input.split(' ')[0]
    const matches = new Map()
    recentTransactions.forEach((item) => {
      const merchant = String(item.description || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim()
      if (!merchant || !item.category || item.type === 'income') return
      const merchantLead = merchant.split(' ')[0]
      const sameMerchantLead = inputLead.length >= 3 && merchantLead === inputLead
      if (input.includes(merchant) || (merchant.length >= 3 && merchant.includes(input)) || sameMerchantLead) {
        matches.set(item.category, (matches.get(item.category) || 0) + 1)
      }
    })
    return [...matches.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  }, [quickText, recentTransactions])

  useEffect(() => {
    if (!open || !activeSpace) {
      return
    }

    initializeForm()
  }, [
    open,
    activeSpace?.id,
    user?.id,
    transaction?.id,
  ])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => () => {
    recognitionRef.current?.abort?.()
  }, [])

  useEffect(() => {
    if (!open || isEditing || !activeSpace?.id || activeSpace.type !== 'personal') {
      setRecentTransactions([])
      setRecentLoading(false)
      return undefined
    }

    let cancelled = false
    setRecentLoading(true)
    fetchRecentTransactions(activeSpace.id).then(({ data, error: recentError }) => {
      if (!cancelled) {
        setRecentTransactions(recentError ? [] : (data || []))
        setRecentLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open, isEditing, activeSpace?.id, activeSpace?.type])

  async function initializeForm() {
    setSaving(false)
    setError('')
    setQuickText('')
    setQuickStatus('')
    setQuickParsing(false)
    setIsListening(false)
    setDetailsExpanded(Boolean(transaction?.id))

    const initialValues =
      createTransactionFormValues({
        transaction,
        userId: user?.id,
      })

    setType(initialValues.type)
    setAmount(initialValues.amount)
    setCurrency(normalizeCurrency(transaction?.currency || activeSpace.currency || 'USD'))
    setFxQuote(transaction?.exchange_rate ? {
      rate: Number(transaction.exchange_rate),
      date: transaction.exchange_rate_date || initialValues.date,
      provider: 'locked',
    } : null)
    setFxError('')
    setCategory(initialValues.category)
    setPaymentStatus(initialValues.paymentStatus)
    setDescription(initialValues.description)
    setDate(initialValues.date)
    setPaidBy(initialValues.paidBy)
    setSplitType(initialValues.splitType)
    setParticipantIds(initialValues.participantIds)
    setCustomSplits(initialValues.customSplits)
    setPercentageSplits(initialValues.percentageSplits || {})

    if (
      activeSpace.type === 'shared'
    ) {
      await loadMembers(
        isEditing
          ? transaction.paid_by
          : user?.id
      )
    } else {
      setMembers([])
      setParticipantIds([])
    }
  }

  async function loadMembers(
    preferredPaidBy
  ) {
    setMembersLoading(true)

    /*
      Only ACTIVE members can participate
      in new or edited shared transactions.

      Members who left the space remain in
      historical transaction records, but
      they must not appear as available
      payers or participants anymore.
    */

    const {
      data: memberRows,
      error: memberError,
    } = await fetchActiveSpaceMemberRows(
      activeSpace.id
    )

    if (memberError) {
      setMembersLoading(false)
      setError(
        memberError.message
      )
      return
    }

    const userIds =
      (memberRows ?? []).map(
        (member) =>
          member.user_id
      )

    if (
      userIds.length === 0
    ) {
      setMembers([])
      setParticipantIds([])
      setPaidBy('')
      setMembersLoading(false)
      return
    }

    const {
      data: profiles,
      error: profileError,
    } = await fetchProfilesByIds(
      userIds
    )

    setMembersLoading(false)

    if (profileError) {
      setError(
        profileError.message
      )
      return
    }

    const profileMap =
      new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      )

    const combined =
      (memberRows ?? []).map(
        (member) => {
          const profile =
            profileMap.get(
              member.user_id
            )

          return {
            user_id:
              member.user_id,

            role:
              member.role,

            status:
              member.status,

            display_name:
              profile?.display_name ||
              (member.user_id ===
              user?.id
                ? 'You'
                : 'Member'),
          }
        }
      )

    setMembers(combined)

    const preferredExists =
      combined.some(
        (member) =>
          member.user_id ===
          preferredPaidBy
      )

    if (preferredExists) {
      setPaidBy(
        preferredPaidBy
      )
    } else {
      const me =
        combined.find(
          (member) =>
            member.user_id ===
            user?.id
        )

      setPaidBy(
        me?.user_id ||
          combined[0]?.user_id ||
          ''
      )
    }

    /*
      CREATE:
      Start with every ACTIVE member selected.

      EDIT:
      Keep only existing participants who
      are still ACTIVE members.

      Historical splits are not deleted just
      by opening the editor. They only change
      if the user actually saves the edit.
    */

    if (!isEditing) {
      setParticipantIds(
        combined.map(
          (member) =>
            member.user_id
        )
      )
    } else {
      const existingIds =
        new Set(
          (
            transaction.splits ??
            []
          ).map(
            (split) =>
              split.user_id
          )
        )

      setParticipantIds(
        combined
          .filter(
            (member) =>
              existingIds.has(
                member.user_id
              )
          )
          .map(
            (member) =>
              member.user_id
          )
      )
    }
  }

  const numericAmount =
    Number(amount) || 0

  const baseCurrency = normalizeCurrency(activeSpace?.currency || 'USD')
  const isCrossCurrency = currency !== baseCurrency
  const accountingAmount = numericAmount > 0 && fxQuote?.rate
    ? convertCurrency({ amount: numericAmount, rate: fxQuote.rate, toCurrency: baseCurrency })
    : null

  useEffect(() => {
    if (!open || !date) {
      setFxLoading(false)
      setFxError('')
      setFxQuote(
        isCrossCurrency
          ? null
          : { rate: 1, date, provider: 'identity' }
      )
      return undefined
    }

    if (!isCrossCurrency) {
      setFxQuote({ rate: 1, date, provider: 'identity' })
      setFxLoading(false)
      setFxError('')
      return undefined
    }

    const existingIsLocked = transaction?.id &&
      currency === transaction.currency &&
      date === transaction.transaction_date &&
      numericAmount === Number(transaction.amount) &&
      Number(transaction.exchange_rate) > 0

    if (existingIsLocked) {
      setFxQuote({
        rate: Number(transaction.exchange_rate),
        date: transaction.exchange_rate_date || date,
        provider: 'locked',
      })
      setFxLoading(false)
      setFxError('')
      return undefined
    }

    let cancelled = false
    setFxLoading(true)
    setFxError('')
    const timer = window.setTimeout(async () => {
      try {
        const quote = await getExchangeRate({ fromCurrency: currency, toCurrency: baseCurrency, date })
        if (!cancelled) setFxQuote(quote)
      } catch (quoteError) {
        if (!cancelled) {
          setFxQuote(null)
          setFxError(quoteError.message || t('fxUnavailable'))
        }
      } finally {
        if (!cancelled) setFxLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, currency, baseCurrency, date, numericAmount, transaction?.id, fxRefreshKey])

  const participants =
    useMemo(() => selectParticipants(
      members,
      participantIds,
    ), [members, participantIds])

  const splitAccountingAmount = accountingAmount || 0

  const equalSplits =
    useMemo(() => {
      if (
        !isShared ||
        splitType !== 'equal'
      ) {
        return []
      }

      return calculateEqualSplits(
        participants,
        splitAccountingAmount
      )
    }, [
      isShared,
      splitType,
      participants,
      splitAccountingAmount,
    ])

  const customTotal =
    useMemo(() => calculateCustomTotal(
      participants,
      customSplits,
    ), [participants, customSplits])

  const customRemaining =
    roundMoney(
      splitAccountingAmount -
        customTotal
    )

  const percentageTotal = useMemo(
    () => roundMoney(participants.reduce(
      (total, member) => total + (Number(percentageSplits[member.user_id]) || 0),
      0
    )),
    [participants, percentageSplits]
  )

  const percentageCalculatedSplits = useMemo(
    () => percentageTotal === 100
      ? calculatePercentageSplits(participants, percentageSplits, splitAccountingAmount)
      : [],
    [participants, percentageSplits, percentageTotal, splitAccountingAmount]
  )

  function chooseSplitType(
    nextType
  ) {
    setSplitType(
      nextType
    )

    setError('')

    if (
      nextType !== 'none' &&
      participantIds.length === 0
    ) {
      setParticipantIds(
        members.map(
          (member) =>
            member.user_id
        )
      )
    }

    if (nextType === 'percentage') {
      const equalPercentage = members.length > 0
        ? Math.floor(10000 / members.length) / 100
        : 0
      const remainder = roundMoney(100 - equalPercentage * members.length)
      setPercentageSplits(Object.fromEntries(
        members.map((member, index) => [
          member.user_id,
          String(roundMoney(equalPercentage + (index === 0 ? remainder : 0))),
        ])
      ))
    }

    if (nextType === 'custom') {
      setCustomSplits(
        (current) => {
          const next = {
            ...current,
          }

          members.forEach(
            (member) => {
              if (
                next[
                  member.user_id
                ] == null
              ) {
                next[
                  member.user_id
                ] = ''
              }
            }
          )

          return next
        }
      )
    }
  }

  function toggleParticipant(
    userId
  ) {
    setError('')

    setParticipantIds(
      (current) => {
        if (
          current.includes(
            userId
          )
        ) {
          return current.filter(
            (id) =>
              id !== userId
          )
        }

        return [
          ...current,
          userId,
        ]
      }
    )
  }

  function selectAllParticipants() {
    setParticipantIds(
      members.map(
        (member) =>
          member.user_id
      )
    )

    setError('')
  }

  function clearParticipants() {
    setParticipantIds([])
    setError('')
  }

  function getMemberSecondaryText(
    member
  ) {
    const isPayer =
      member.user_id ===
      paidBy

    const isMe =
      member.user_id ===
      user?.id

    if (
      isPayer &&
      isMe
    ) {
      return `${t('you')} · ${t('paid')}`
    }

    if (isPayer) {
      return t('paid')
    }

    if (isMe) {
      return t('you')
    }

    return t('member')
  }

  async function applyQuickTransaction(text = quickText, categoryOverride = '') {
    if (!text.trim()) {
      setQuickStatus('empty')
      return false
    }

    setQuickParsing(true)
    setQuickStatus('parsing')
    const parsed = await parseTransactionText(text, {
      fallbackCurrency: normalizeCurrency(activeSpace?.currency || 'USD'),
      language,
    })
    setQuickParsing(false)

    if (!parsed.ok) {
      setQuickStatus(parsed.reason === 'amount' ? 'amount' : 'empty')
      return false
    }

    setType(parsed.type)
    setAmount(parsed.amount)
    setCurrency(parsed.currency)
    const learnedCategory = categoryOverride || merchantCategory
    setCategory(learnedCategory || parsed.category)
    setDescription(parsed.description)
    setDate(parsed.date)
    if (parsed.type === 'income') {
      setSplitType('none')
      setPaymentStatus('paid')
    }
    setError('')
    const needsReview = !learnedCategory && (parsed.needsReview || Number(parsed.confidence || 0) < 0.85)
    setQuickStatus(needsReview ? 'review' : 'ready')
    setDetailsExpanded(needsReview)
    return true
  }

  function repeatRecentTransaction(item) {
    setType(item.type === 'income' ? 'income' : 'expense')
    setAmount(String(item.amount || ''))
    setCurrency(normalizeCurrency(item.currency || activeSpace?.currency || 'USD'))
    setDescription(item.description || '')
    setCategory(item.type === 'income' ? 'Income' : (item.category || 'Other'))
    setDate(getToday())
    setPaymentStatus('paid')
    setSplitType('none')
    setQuickText('')
    setQuickStatus('ready')
    setDetailsExpanded(false)
    setError('')
  }

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop?.()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setQuickStatus('unsupported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = getLanguageLocale(language)
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setQuickStatus('listening')
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim()
      setQuickText(transcript)
      if (event.results[event.results.length - 1]?.isFinal) void applyQuickTransaction(transcript)
    }
    recognition.onerror = () => {
      setQuickStatus('voiceError')
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.start()
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault()

    setError('')

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setError(
        'Enter an amount greater than 0.'
      )

      return
    }

    if (!date) {
      setError(
        'Choose a transaction date.'
      )

      return
    }

    if (!fxQuote?.rate || accountingAmount == null) {
      setError(t('fxRequired'))
      return
    }

    if (!isShared) {
      await savePersonalTransaction()
      return
    }

    await saveSharedTransaction()
  }

  async function savePersonalTransaction() {
    setSaving(true)

    let saveError = null

    if (isEditing) {
      const { error } =
        await updatePersonalTransaction({
          transactionId:
            transaction.id,
          spaceId:
            activeSpace.id,
          changes: {
            paid_by:
              user.id,

            type,

            amount:
              numericAmount,

            currency:
              currency,

            base_amount: accountingAmount,
            base_currency: baseCurrency,
            exchange_rate: fxQuote.rate,
            exchange_rate_date: fxQuote.date || date,
            conversion_status: 'converted',

            category,

            description:
              description.trim() ||
              null,

            transaction_date:
              date,

            split_type:
              'none',
            payment_status: type === 'income' ? 'paid' : paymentStatus,
          },
        })

      saveError = error
    } else {
      const { error } =
        await createPersonalTransaction({
            space_id:
              activeSpace.id,

            created_by:
              user.id,

            paid_by:
              user.id,

            type,

            amount:
              numericAmount,

            currency:
              currency,

            base_amount: accountingAmount,
            base_currency: baseCurrency,
            exchange_rate: fxQuote.rate,
            exchange_rate_date: fxQuote.date || date,
            conversion_status: 'converted',

            category,

            description:
              description.trim() ||
              null,

            transaction_date:
              date,

            split_type:
              'none',
            payment_status: type === 'income' ? 'paid' : paymentStatus,
        })

      saveError = error
    }

    setSaving(false)

    if (saveError) {
      setError(
        saveError.message
      )

      return
    }

    if (onSaved) {
      await onSaved()
    }

    onClose()
  }

  async function saveSharedTransaction() {
    if (!paidBy) {
      setError(
        'Choose who paid.'
      )

      return
    }

    const payerIsActive =
      members.some(
        (member) =>
          member.user_id ===
          paidBy
      )

    if (!payerIsActive) {
      setError(
        'The payer is no longer an active member of this shared space.'
      )

      return
    }

    let splits = []

    if (
      type === 'expense' &&
      splitType !== 'none' &&
      participants.length === 0
    ) {
      setError(
        'Choose at least one participant.'
      )

      return
    }

    if (
      type === 'expense' &&
      splitType === 'equal'
    ) {
      splits =
        equalSplits
    }

    if (
      type === 'expense' &&
      splitType === 'custom'
    ) {
      if (
        Math.abs(
          customRemaining
        ) > 0.009
      ) {
        setError(
          `Custom splits must add up to ${splitAccountingAmount.toFixed(
            2
          )}.`
        )

        return
      }

      splits =
        participants.map(
          (member) => ({
            user_id:
              member.user_id,

            amount:
              roundMoney(
                Number(
                  customSplits[
                    member.user_id
                  ]
                ) || 0
              ),
          })
        )
    }

    if (type === 'expense' && splitType === 'percentage') {
      if (Math.abs(percentageTotal - 100) > 0.009) {
        setError(t('percentageMustEqual100'))
        return
      }
      splits = percentageCalculatedSplits
    }

    const finalSplitType =
      type === 'income'
        ? 'none'
        : splitType

    setSaving(true)

    let rpcError = null

    if (isEditing) {
      const { error } =
        await updateSharedTransaction({
            p_transaction_id:
              transaction.id,

            p_paid_by:
              paidBy,

            p_type:
              type,

            p_amount:
              numericAmount,

            p_currency:
              currency,

            p_base_amount: accountingAmount,
            p_base_currency: baseCurrency,
            p_exchange_rate: fxQuote.rate,
            p_exchange_rate_date: fxQuote.date || date,

            p_category:
              category,

            p_description:
              description.trim() ||
              null,

            p_transaction_date:
              date,

            p_split_type:
              finalSplitType,

            p_splits:
              splits,
        })

      rpcError = error
    } else {
      const { error } =
        await createSharedTransaction({
            p_space_id:
              activeSpace.id,

            p_paid_by:
              paidBy,

            p_type:
              type,

            p_amount:
              numericAmount,

            p_currency:
              currency,

            p_base_amount: accountingAmount,
            p_base_currency: baseCurrency,
            p_exchange_rate: fxQuote.rate,
            p_exchange_rate_date: fxQuote.date || date,

            p_category:
              category,

            p_description:
              description.trim() ||
              null,

            p_transaction_date:
              date,

            p_split_type:
              finalSplitType,

            p_splits:
              splits,
        })

      rpcError = error
    }

    setSaving(false)

    if (rpcError) {
      setError(
        rpcError.message
      )

      return
    }

    if (onSaved) {
      await onSaved()
    }

    onClose()
  }

  if (
    !open ||
    !activeSpace
  ) {
    return null
  }

  return (
    <div
      className="modal-backdrop transaction-editor-backdrop"
      onMouseDown={saving ? undefined : onClose}
    >
      <ModalSurface as="div" onClose={onClose} busy={saving} aria-labelledby="transaction-editor-title"
        className="transaction-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {isShared
                ? t('sharedTransaction')
                : t('personalTransaction')}
            </p>

            <h2 id="transaction-editor-title">
              {isEditing
                ? t('editTransaction')
                : t('addTransaction')}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t('close')}
          >
            <X size={19} />
          </button>
        </div>

        <form
          ref={formRef}
          className="transaction-form"
          onSubmit={
            handleSubmit
          }
        >
          {!isEditing && !detailsExpanded && (
            <section className="quick-add-card" aria-labelledby="quick-add-title">
              <div className="quick-add-heading">
                <span className="quick-add-icon"><Sparkles size={16} /></span>
                <div>
                  <strong id="quick-add-title">{t('quickAdd')}</strong>
                  <small>{t('quickAddHelp')}</small>
                </div>
              </div>
              <div className="quick-add-controls">
                <input
                  type="text"
                  value={quickText}
                  placeholder={t('quickAddPlaceholder')}
                  aria-label={t('quickAdd')}
                  onChange={(event) => {
                    setQuickText(event.target.value)
                    setQuickStatus('')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void applyQuickTransaction()
                    }
                  }}
                />
                <button
                  className={`quick-voice-button ${isListening ? 'listening' : ''}`}
                  type="button"
                  onClick={toggleVoiceInput}
                  aria-label={isListening ? t('stopListening') : t('voiceInput')}
                  title={isListening ? t('stopListening') : t('voiceInput')}
                >
                  {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
                <button className="quick-apply-button" type="button" disabled={quickParsing} onClick={() => void applyQuickTransaction()}>
                  {quickParsing ? t('analyzingTransaction') : t('fillDetails')}
                </button>
              </div>
              {quickStatus && (
                <p aria-live="polite" className={`quick-add-status ${quickStatus === 'ready' ? 'success' : ['listening', 'parsing', 'review'].includes(quickStatus) ? 'listening' : 'error'}`}>
                  {t({ ready: 'quickAddReady', review: 'quickAddReview', listening: 'voiceListening', parsing: 'analyzingTransaction', unsupported: 'voiceUnsupported', voiceError: 'voiceError', amount: 'quickAddAmountMissing', empty: 'quickAddEmpty' }[quickStatus])}
                </p>
              )}
            </section>
          )}

          {!isEditing && !isShared && !detailsExpanded && (
            <section className="smart-defaults" aria-label={t('smartDefaults')}>
              <div className="smart-defaults-row">
                <span>{t('suggestedCategories')}</span>
                <div className="smart-category-chips">
                  {suggestedCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={category === item ? 'active' : ''}
                      onClick={() => {
                        setCategory(item)
                        if (quickText.trim()) void applyQuickTransaction(quickText, item)
                        else setDetailsExpanded(true)
                      }}
                    >
                      {t(getCategoryTranslationKey(item))}
                    </button>
                  ))}
                </div>
              </div>

              {(recentLoading || repeatTransactions.length > 0) && (
                <div className="repeat-transactions">
                  <div className="repeat-transactions-heading">
                    <strong>{t('addAgain')}</strong>
                    <small>{t('addAgainHelp')}</small>
                  </div>
                  <div className="repeat-transaction-list">
                    {recentLoading ? [0, 1].map((item) => (
                      <div className="repeat-transaction-skeleton" key={item} aria-hidden="true" />
                    )) : repeatTransactions.map((item) => (
                      <button key={item.id} type="button" onClick={() => repeatRecentTransaction(item)}>
                        <span>
                          <strong>{item.description || t(getCategoryTranslationKey(item.category || 'Other'))}</strong>
                          <small>{t(getCategoryTranslationKey(item.category || 'Other'))}</small>
                        </span>
                        <b>{formatCurrency(Number(item.amount) || 0, item.currency || activeSpace.currency || 'USD')}</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {!detailsExpanded && quickStatus === 'ready' && (
            <section className="quick-result-card" aria-label={t('recognizedTransaction')}>
              <div className="quick-result-main">
                <span className={`quick-result-type ${type}`}>{t(type)}</span>
                <strong>{formatCurrency(numericAmount, currency)}</strong>
                <span>{description || t(getCategoryTranslationKey(category))}</span>
              </div>
              <div className="quick-result-meta">
                <span>{t(getCategoryTranslationKey(category))}</span>
                <span>{date}</span>
                <button type="button" onClick={() => setDetailsExpanded(true)}>
                  {t('editDetails')} <ChevronDown size={15} />
                </button>
              </div>
            </section>
          )}

          {!detailsExpanded && quickStatus !== 'ready' && (
            <button
              className="manual-entry-toggle"
              type="button"
              onClick={() => setDetailsExpanded(true)}
            >
              <span>
                <strong>{t('manualEntry')}</strong>
                <small>{t('manualEntryHelp')}</small>
              </span>
              <ChevronDown size={17} />
            </button>
          )}

          <div className="transaction-detail-fields" hidden={!detailsExpanded}>
          {!isEditing && (
            <button
              className="detail-collapse-toggle"
              type="button"
              onClick={() => setDetailsExpanded(false)}
            >
              {t('collapseDetails')} <ChevronUp size={15} />
            </button>
          )}

          <div className="type-toggle">
            <button
              type="button"
              className={
                type === 'expense'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setType(
                  'expense'
                )

                if (
                  category ===
                  'Income'
                ) {
                  setCategory(
                    'Food'
                  )
                }
              }}
            >
              {t('expense')}
            </button>

            <button
              type="button"
              className={
                type === 'income'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setType(
                  'income'
                )

                setCategory(
                  'Income'
                )

                setSplitType(
                  'none'
                )
              }}
            >
              {t('income')}
            </button>
          </div>

          <label className="transaction-amount-field">
            {t('amount')}

            <div className="transaction-money-row">
              <div className="amount-input">
                <span className="amount-currency-code">{currency}</span>

                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <AppSelect
                className="transaction-currency-select"
                ariaLabel={t('transactionCurrency')}
                value={currency}
                onChange={setCurrency}
                options={SUPPORTED_CURRENCIES.map((item) => ({ value: item.code, label: item.code }))}
              />
            </div>

            <div className={`fx-preview ${fxError ? 'error' : ''}`}>
              <span>{t('spaceAccountingAmount', { currency: baseCurrency })}</span>
              <strong>
                {fxLoading
                  ? t('converting')
                  : accountingAmount == null
                    ? t('amountPlaceholder')
                    : formatCurrency(accountingAmount, baseCurrency)}
              </strong>
              {isCrossCurrency && fxQuote?.rate && !fxLoading && (
                <small>{t(fxQuote.provider === 'locked' ? 'lockedRate' : 'ratePreview', { from: currency, to: baseCurrency, rate: Number(fxQuote.rate).toFixed(6), date: fxQuote.date })}</small>
              )}
              {fxError && <small>{t('fxUnavailable')}</small>}
              {isCrossCurrency && (
                <button
                  className="fx-refresh-button"
                  type="button"
                  disabled={fxLoading}
                  onClick={() => {
                    clearExchangeRateCache()
                    setFxRefreshKey((value) => value + 1)
                  }}
                >
                  <RefreshCw size={13} /> {fxLoading ? t('converting') : t('refreshRate')}
                </button>
              )}
            </div>
          </label>

          <label className="transaction-description-field">
            {t('description')}

            <input
              type="text"
              placeholder={t('descriptionExample')}
              aria-label={t('description')}
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
            />
          </label>

          <div className="form-grid">
            <label>
              {t('category')}

              <CategorySelect
                value={category}
                options={TRANSACTION_CATEGORIES}
                onChange={setCategory}
              />
            </label>

            <label>
              {t('date')}

              <input
                type="date"
                value={date}
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
          </div>

          {!isShared && type === 'expense' && (
            <div className="transaction-status-field">
              <span className="transaction-field-label">{t('status')}</span>
              <div className="type-toggle transaction-status-toggle">
                <button type="button" className={paymentStatus === 'paid' ? 'active' : ''} onClick={() => setPaymentStatus('paid')}>
                  {t('paid')}
                </button>
                <button type="button" className={paymentStatus === 'upcoming' ? 'active' : ''} onClick={() => setPaymentStatus('upcoming')}>
                  {t('upcoming')}
                </button>
              </div>
              <small>{paymentStatus === 'paid' ? t('paidHelp') : t('upcomingHelp')}</small>
            </div>
          )}

          {isShared && (
            <div className="shared-transaction-section">
              <div className="shared-field">
                <div className="shared-field-heading">
                  <div>
                    <strong>
                      {t('whoPaid')}
                    </strong>

                    <span>
                      {t('whoPaidHelp')}
                    </span>
                  </div>
                </div>

                <AppSelect
                  value={paidBy}
                  onChange={setPaidBy}
                  disabled={
                    membersLoading
                  }
                  ariaLabel={t('whoPaid')}
                  options={membersLoading
                    ? [{ value: '', label: t('loadingMembers') }]
                    : members.map((member) => ({ value: member.user_id, label: `${member.display_name}${member.user_id === user?.id ? ` (${t('you')})` : ''}` }))}
                />
              </div>

              {type === 'expense' && (
                <div className="shared-field">
                  <div className="shared-field-heading">
                    <div>
                      <strong>
                        {t('splitExpense')}
                      </strong>

                      <span>
                        {t('splitOptional')}
                      </span>
                    </div>
                  </div>

                  <SplitTypeToggle
                    value={splitType}
                    onChange={chooseSplitType}
                  />

                  {splitType ===
                    'none' && (
                    <div className="split-note">
                      {t('noSplitNote')}
                    </div>
                  )}

                  {splitType !== 'none' && (
                    <SplitParticipantSelector
                      members={members}
                      participantIds={participantIds}
                      onToggle={toggleParticipant}
                      onSelectAll={selectAllParticipants}
                      onClear={clearParticipants}
                      getSecondaryText={getMemberSecondaryText}
                    />
                  )}

                  {splitType === 'equal' &&
                    participants.length > 0 && (
                      <EqualSplitSummary
                        participants={participants}
                        splits={equalSplits}
                        currency={activeSpace.currency || 'USD'}
                        getSecondaryText={getMemberSecondaryText}
                      />
                    )}

                  {splitType === 'custom' &&
                    participants.length > 0 && (
                      <CustomSplitEditor
                        participants={participants}
                        customSplits={customSplits}
                        onChange={(userId, value) =>
                          setCustomSplits((current) => ({
                            ...current,
                            [userId]: value,
                          }))
                        }
                        customTotal={customTotal}
                        numericAmount={splitAccountingAmount}
                        customRemaining={customRemaining}
                        currency={baseCurrency}
                        getSecondaryText={getMemberSecondaryText}
                      />
                    )}

                  {splitType === 'percentage' &&
                    participants.length > 0 && (
                      <PercentageSplitEditor
                        participants={participants}
                        percentages={percentageSplits}
                        onChange={(userId, value) =>
                          setPercentageSplits((current) => ({
                            ...current,
                            [userId]: value,
                          }))
                        }
                        percentageTotal={percentageTotal}
                        calculatedSplits={percentageCalculatedSplits}
                        currency={baseCurrency}
                        getSecondaryText={getMemberSecondaryText}
                      />
                    )}
                </div>
              )}

              {type ===
                'income' && (
                <div className="split-note">
                  {t('sharedIncomeNote')}
                </div>
              )}
            </div>
          )}

          </div>

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="secondary"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              {t('cancel')}
            </button>

            <button
              className="primary"
              type="submit"
              disabled={
                saving ||
                membersLoading
              }
            >
              {saving
                ? t('saving')
                : isEditing
                  ? t('saveChanges')
                  : t('saveTransaction')}
            </button>
          </div>
        </form>
      </ModalSurface>
    </div>
  )
}
