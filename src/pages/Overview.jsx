import ModalSurface from '../components/ModalSurface'
import { useEffect, useMemo, useRef, useState } from 'react'
import OverviewSkeleton from '../components/OverviewSkeleton'
import { overviewLoadState } from '../utils/overviewLoadState'
import { Link } from 'react-router-dom'
import {
  Check,
  Copy,
  Plus,
  ReceiptText,
  UserPlus,
} from '../icons'

import SettlementModal from '../components/SettlementModal'
import BalanceDetailsModal from '../features/balances/BalanceDetailsModal'
import ReverseSettlementModal from '../features/settlements/ReverseSettlementModal'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'
import CategoryIcon from '../components/CategoryIcon'
import { getCategoryTranslationKey } from '../components/CategorySelect'
import SafeToSpendCard from '../features/safeToSpend/SafeToSpendCard'
import SpendingPaceCard from '../features/financial/SpendingPaceCard'
import { summarizeFinancialTransactions } from '../features/financial/transactionSemantics'
import { calculateSafeToSpend, hasMonthlyTotalBudget } from '../features/safeToSpend/calculateSafeToSpend'
import { formatCurrency } from '../services/currency/currencyFormatter'
import { getAccountingAmount } from '../services/currency/currencyService'
import TransactionAmount from '../features/transactions/TransactionAmount'
import CurrencyOverviewCard from '../features/currency/CurrencyOverviewCard'
import UpcomingBillsCard, { getUpcomingBills } from '../features/safeToSpend/UpcomingBillsCard'
import { buildPersonalAnalytics } from '../features/insights/personalAnalytics'
import { assessFinancialData } from '../features/financial/dataQuality'
import { buildSignalEngine } from '../features/insights/signalEngine'
import FinancialDataNotice from '../features/financial/FinancialDataNotice'
import { MoneySignalsPanel, ReflectionPanel, SpendingBreakdownCard, WeeklyRecapCard } from '../features/insights/PersonalInsights'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import useOverviewReveal from '../hooks/useOverviewReveal'
import useWeeklyCheckins from '../features/insights/useWeeklyCheckins'
import AvatarImage from '../components/AvatarImage'
import { getLocalDateKey, getLocalMonthKey } from '../utils/dateKeys'
import {
  createSpaceInvitation,
  fetchSettlements,
  fetchSpaceMembers,
  fetchTransactionSplits,
  fetchTransactions,
  fetchMonthlyBudgets,
  fetchFixedExpenses,
  fetchFixedExpenseOccurrences,
  resolveFixedExpenseOccurrenceV2,
} from '../data/ledgerApi'

function money(value, currency = 'USD') {
  return formatCurrency(value, currency)
}

function PersonalOverviewHero({ safeToSpend, totals, net, currency, hasMonthlyBudget }) {
  const { language, t } = useLanguage()
  const animatedExpenses = useAnimatedNumber(totals.expenses, { duration: 1150, delay: 100 })
  const animatedIncome = useAnimatedNumber(totals.income, { duration: 1150, delay: 170 })
  const animatedNet = useAnimatedNumber(net, { duration: 1200, delay: 240 })
  const monthLabel = getMonthLabel(getLanguageLocale(language))

  return (
    <section className="fin-overview-hero" aria-label={t('thisMonth')}>
      {hasMonthlyBudget ? (
        <SafeToSpendCard result={safeToSpend} currency={currency} animateFromBudget />
      ) : (
        <article className="safe-to-spend-card fin-spent-hero">
          <div className="safe-to-spend-main">
            <div className="safe-to-spend-icon" aria-hidden="true">
              <ReceiptText size={28} strokeWidth={2.2} />
            </div>
            <div>
              <span>{t('spentThisMonth')}</span>
              <strong className="animated-amount" aria-label={money(totals.expenses, currency)}>
                {money(animatedExpenses, currency)}
              </strong>
              <div className="safe-budget-copy">
                <small className="safe-budget-hint">{monthLabel}</small>
                <p>{t('spendingHeroCopy')}</p>
              </div>
            </div>
          </div>
        </article>
      )}
      <div className="fin-kpi-stack">
        {hasMonthlyBudget ? (
          <article className="fin-kpi-card primary">
            <span>{t('spentThisMonth')}</span>
            <strong className="animated-amount" aria-label={money(totals.expenses, currency)}>{money(animatedExpenses, currency)}</strong>
            <small>{monthLabel}</small>
          </article>
        ) : (
          <Link
            className="fin-kpi-card primary fin-budget-setup-card"
            to="/budget"
            aria-label={t('setBudgetAction')}
          >
            <span className="fin-budget-setup-label">
              {t('budgetNotSet')}
              <i aria-hidden="true">→</i>
            </span>
            <strong>{t('setYourBudget')}</strong>
            <small>{t('setBudgetUnlockCopy')}</small>
          </Link>
        )}
        <article className="fin-kpi-card">
          <span>↗ {t('income')}</span>
          <strong className="animated-amount" aria-label={money(totals.income, currency)}>{money(animatedIncome, currency)}</strong>
          <small>{t('thisMonth')}</small>
        </article>
        <article className="fin-kpi-card">
          <span>↘ {t('net')}</span>
          <strong className="animated-amount" aria-label={money(net, currency)}>{money(animatedNet, currency)}</strong>
          <small>{t('incomeMinusExpenses')}</small>
        </article>
      </div>
    </section>
  )
}

function getMonthLabel(locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function formatSettlementDate(value, locale = 'en-US') {
  if (!value) return ''

  const date = new Date(`${value}T12:00:00`)

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  }).format(date)
}

export default function Overview({
  activeSpace,
  user,
  hasShared,
  onCreateSpace,
  onAddTransaction,
  refreshKey,
}) {
  const { language, t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState([])
  const [fixedOccurrences, setFixedOccurrences] = useState([])
  const [resolvingFixedId, setResolvingFixedId] = useState('')
  const [fixedActionError, setFixedActionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [personalOverviewReady, setPersonalOverviewReady] = useState(false)
  const [financialLoadFailed, setFinancialLoadFailed] = useState(false)
  const [loadedScope, setLoadedScope] = useState('')
  const [overviewLoadError, setOverviewLoadError] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const loadEpoch = useRef(0)
  const overviewScope = `${activeSpace.id}:${user.id}:${activeSpace.currency}:${refreshKey}:${retryNonce}`

  /*
    allMembers:
    Includes active and former members.

    We keep this for historical accounting:
    old transactions, splits and settlements
    must still be able to identify people who left.
  */
  const [allMembers, setAllMembers] = useState([])

  const [membersLoading, setMembersLoading] =
    useState(false)

  const [splits, setSplits] = useState([])
  const [splitsLoading, setSplitsLoading] =
    useState(false)

  const [settlements, setSettlements] = useState([])
  const [
    settlementsLoading,
    setSettlementsLoading,
  ] = useState(false)

  const [
    settlementOpen,
    setSettlementOpen,
  ] = useState(false)

  const [
    selectedBalance,
    setSelectedBalance,
  ] = useState(null)

  const [
    balanceDetails,
    setBalanceDetails,
  ] = useState(null)

  const [
    settlementToReverse,
    setSettlementToReverse,
  ] = useState(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState('')
  const [inviteLoading, setInviteLoading] =
    useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  const isShared =
    activeSpace?.type === 'shared'
  const checkins = useWeeklyCheckins(user?.id, isShared ? null : activeSpace?.id)

  const userDisplayName =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Your'

  const overviewTitle = isShared
    ? activeSpace.name
    : t('personalSpace', { name: userDisplayName })

  /*
    Only active members belong in the current
    shared-space member list.

    Former members stay inside allMembers so
    historical accounting remains intact.
  */
  const activeMembers = useMemo(() => {
    return allMembers.filter(
      (member) => member.status === 'active'
    )
  }, [allMembers])

  useEffect(() => {
    if (!activeSpace?.id) return
    let cancelled = false
    const epoch = ++loadEpoch.current
    setFinancialLoadFailed(false)
    setOverviewLoadError(false)
    setPersonalOverviewReady(false)
    const requests = [loadTransactions(epoch)]
    if (isShared) requests.push(loadMembers(epoch), loadSplits(epoch), loadSettlements(epoch))
    else {
      requests.push(loadBudgets(epoch), loadFixedExpenses(epoch), loadFixedOccurrences(epoch))
      setAllMembers([])
      setSplits([])
      setSettlements([])
    }
    Promise.allSettled(requests).then(results => {
      if (cancelled || epoch !== loadEpoch.current) return
      setOverviewLoadError(results.some(result => result.status === 'rejected'))
      setLoading(false)
      setPersonalOverviewReady(!isShared)
      setLoadedScope(overviewScope)
    })
    return () => { cancelled = true; loadEpoch.current += 1 }
  }, [
    overviewScope,
    isShared,
  ])

  const currentMonth = getLocalMonthKey()

  async function loadBudgets(epoch = loadEpoch.current) {
    const { data, error } = await fetchMonthlyBudgets(activeSpace.id, user.id, currentMonth)
    if (epoch !== loadEpoch.current) return
    if (error) {
      console.error(`Could not load budgets: ${error.code || ''} ${error.message || ''}`)
      setBudgets([])
      setFinancialLoadFailed(true)
      return
    }
    setBudgets(data ?? [])
  }

  async function loadFixedExpenses(epoch = loadEpoch.current) {
    const { data, error } = await fetchFixedExpenses(activeSpace.id, user.id)
    if (epoch !== loadEpoch.current) return
    if (error) {
      console.error(`Could not load fixed expenses: ${error.code || ''} ${error.message || ''}`)
      setFixedExpenses([])
      setFinancialLoadFailed(true)
      return
    }
    setFixedExpenses(data ?? [])
  }

  async function loadFixedOccurrences(epoch = loadEpoch.current) {
    const { data, error } = await fetchFixedExpenseOccurrences(activeSpace.id, user.id, currentMonth)
    if (epoch !== loadEpoch.current) return
    if (error) {
      console.error(`Could not load recurring occurrences: ${error.code || ''} ${error.message || ''}`)
      setFixedOccurrences([])
      setFinancialLoadFailed(true)
      return
    }
    setFixedOccurrences(data ?? [])
  }

  async function resolveUpcomingBill(bill, action, paidOn) {
    if (resolvingFixedId) return
    setResolvingFixedId(bill.occurrence_key)
    setFixedActionError('')
    let error
    try { ({ error } = await resolveFixedExpenseOccurrenceV2(bill.fixed_expense_id, bill.due_date, action, paidOn)) }
    catch (failure) { error = failure }
    if (error) {
      setResolvingFixedId('')
      console.error(`Could not resolve recurring expense: ${error.code || ''} ${error.message || ''}`)
      setFixedActionError(t('recurringActionError'))
      return
    }
    await Promise.all([loadFixedOccurrences(), loadTransactions()])
    setResolvingFixedId('')
  }

  async function loadTransactions(epoch = loadEpoch.current) {
    setLoading(true)

    const { data, error } =
      await fetchTransactions(
        activeSpace.id
      )

    if (epoch !== loadEpoch.current) return
    setLoading(false)

    if (error) {
      console.error(
        'Could not load transactions:',
        error
      )

      setTransactions([])
      setFinancialLoadFailed(true)
      return
    }

    setTransactions(data ?? [])
  }

  async function loadMembers(epoch = loadEpoch.current) {
    setMembersLoading(true)

    const { data, error } =
      await fetchSpaceMembers(
        activeSpace.id
      )

    if (epoch !== loadEpoch.current) return
    setMembersLoading(false)

    if (error) {
      console.error(
        'Could not load members:',
        error
      )

      setAllMembers([])
      return
    }

    const normalizedMembers =
      (data ?? []).map(
        (member) => ({
          ...member,
          display_name:
            member.profiles
              ?.display_name ||
            'Member',
          avatar_url:
            member.user_id === user?.id
              ? window.localStorage.getItem(`splitlie-avatar-${user?.id || user?.email || 'guest'}`) || member.profiles?.avatar_url || ''
              : member.profiles?.avatar_url || '',
        })
      )

    setAllMembers(
      normalizedMembers
    )
  }

  async function loadSplits(epoch = loadEpoch.current) {
    setSplitsLoading(true)

    const { data, error } =
      await fetchTransactionSplits()

    if (epoch !== loadEpoch.current) return
    setSplitsLoading(false)

    if (error) {
      console.error(
        'Could not load transaction splits:',
        error
      )

      setSplits([])
      return
    }

    setSplits(data ?? [])
  }

  async function loadSettlements(epoch = loadEpoch.current) {
    setSettlementsLoading(true)

    const { data, error } =
      await fetchSettlements(
        activeSpace.id
      )

    if (epoch !== loadEpoch.current) return
    setSettlementsLoading(false)

    if (error) {
      console.error(
        'Could not load settlements:',
        error
      )

      setSettlements([])
      return
    }

    setSettlements(data ?? [])
  }

  async function handleSettlementSaved() {
    await loadSettlements()
  }

  function getMemberName(
    userId,
    useYou = false
  ) {
    if (
      useYou &&
      user?.id === userId
    ) {
      return t('you')
    }

    return (
      allMembers.find(
        (member) =>
          member.user_id === userId
      )?.display_name ||
      t('member')
    )
  }

  function canSettleBalance(balance) {
    if (!user?.id || !balance) {
      return false
    }

    return (
      user.id === balance.from.user_id ||
      user.id === balance.to.user_id
    )
  }

  function getSettlementButtonLabel(balance) {
    if (!user?.id || !balance) {
      return null
    }

    if (
      user.id === balance.from.user_id
    ) {
      return t('recordPayment')
    }

    if (
      user.id === balance.to.user_id
    ) {
      return t('recordReceived')
    }

    return null
  }

  function openSettlement(
    balance
  ) {
    if (
      !canSettleBalance(balance)
    ) {
      return
    }

    setSelectedBalance(
      balance
    )

    setSettlementOpen(true)
  }

  function closeSettlement() {
    setSettlementOpen(false)
    setSelectedBalance(null)
  }

  async function handleCreateInvite(
    event
  ) {
    event.preventDefault()

    setInviteError('')
    setInviteLink('')
    setCopied(false)

    const email =
      inviteEmail
        .trim()
        .toLowerCase()

    if (!email) {
      setInviteError(
        'Enter the email address of the person you want to invite.'
      )
      return
    }

    setInviteLoading(true)

    const { data, error } =
      await createSpaceInvitation(
        activeSpace.id,
        email
      )

    setInviteLoading(false)

    if (error) {
      setInviteError(
        error.message
      )
      return
    }

    let token = null
    let expiresAt = null

    if (
      typeof data === 'string'
    ) {
      token = data
    } else if (data?.token) {
      token = data.token
      expiresAt = data.expires_at
    } else if (
      Array.isArray(data) &&
      data[0]?.token
    ) {
      token = data[0].token
      expiresAt = data[0].expires_at
    }

    if (!token) {
      setInviteError(
        'Invitation was created, but no invitation token was returned.'
      )
      return
    }

    const link =
      `${window.location.origin}/join/${token}`

    setInviteLink(link)
    setInviteExpiresAt(expiresAt || '')
  }

  async function handleCopyInvite() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(
        inviteLink
      )

      setCopied(true)

      window.setTimeout(
        () => {
          setCopied(false)
        },
        1800
      )
    } catch (error) {
      console.error(
        'Could not copy invitation link:',
        error
      )
    }
  }

  function closeInvite() {
    if (inviteLoading) return
    setInviteOpen(false)
    setInviteEmail('')
    setInviteLink('')
    setInviteExpiresAt('')
    setInviteError('')
    setCopied(false)
  }

  const totals = useMemo(() => {
    const now = new Date()
    if (!isShared) return summarizeFinancialTransactions(transactions, {
      month: getLocalMonthKey(now), throughDate: getLocalDateKey(now), currency: activeSpace.currency || 'USD',
    })

    const currentMonth =
      now.getMonth()

    const currentYear =
      now.getFullYear()

    return transactions.reduce(
      (
        result,
        transaction
      ) => {
        const transactionDate =
          new Date(
            `${transaction.transaction_date}T12:00:00`
          )

        const sameMonth =
          transactionDate.getMonth() ===
            currentMonth &&
          transactionDate.getFullYear() ===
            currentYear

        if (!sameMonth) {
          return result
        }

        if ((transaction.payment_status || 'paid') !== 'paid') {
          return result
        }

        const amount = getAccountingAmount(transaction)

        if (amount === null) {
          return result
        }

        if (
          transaction.type ===
          'income'
        ) {
          result.income += amount
        } else {
          result.expenses +=
            amount
        }

        return result
      },
      {
        income: 0,
        expenses: 0,
      }
    )
  }, [transactions, isShared, activeSpace.currency])

  const net =
    totals.income -
    totals.expenses

  const safeToSpend = useMemo(() => calculateSafeToSpend({
    transactions,
    monthlyBudget: budgets.find(item => item.category === '__TOTAL__')?.amount || 0,
    hasPlan: hasMonthlyTotalBudget(budgets),
    fixedExpenses,
    fixedExpenseOccurrences: fixedOccurrences,
    currency: activeSpace.currency || 'USD',
  }), [transactions, budgets, fixedExpenses, fixedOccurrences, activeSpace.currency])

  const hasMonthlyBudget = useMemo(() => hasMonthlyTotalBudget(budgets), [budgets])

  const baseAnalytics = useMemo(() => buildPersonalAnalytics({
    transactions,
    budgets,
  }), [transactions, budgets])

  const upcomingBills = useMemo(
    () => getUpcomingBills(fixedExpenses, fixedOccurrences, currentMonth),
    [fixedExpenses, fixedOccurrences, currentMonth]
  )

  const financialQuality = useMemo(() => assessFinancialData({ transactions, result: safeToSpend, loadFailed: financialLoadFailed }), [transactions, safeToSpend, financialLoadFailed])
  const personalAnalytics = useMemo(() => {
    const engine = buildSignalEngine({ analytics: baseAnalytics, result: safeToSpend, upcomingBills, quality: financialQuality })
    return { ...baseAnalytics, ...engine, quality: financialQuality }
  }, [baseAnalytics, safeToSpend, upcomingBills, financialQuality])

  /*
    IMPORTANT:

    Balance accounting intentionally uses
    allMembers, not activeMembers.

    Someone leaving a shared space must not
    erase or change historical debt.
  */
  const balances = useMemo(() => {
    if (
      !isShared ||
      allMembers.length === 0
    ) {
      return []
    }

    const memberBalances = {}

    allMembers.forEach(
      (member) => {
        memberBalances[
          member.user_id
        ] = 0
      }
    )

    const sharedExpenses =
      transactions.filter(
        (transaction) =>
          transaction.type ===
            'expense' &&
          transaction.split_type !==
            'none'
      )

    sharedExpenses.forEach(
      (transaction) => {
        const amount = getAccountingAmount(transaction)

        if (amount === null) {
          return
        }

        if (
          transaction.paid_by &&
          memberBalances[
            transaction.paid_by
          ] !== undefined
        ) {
          memberBalances[
            transaction.paid_by
          ] += amount
        }

        const transactionSplits =
          splits.filter(
            (split) =>
              split.transaction_id ===
              transaction.id
          )

        transactionSplits.forEach(
          (split) => {
            if (
              memberBalances[
                split.user_id
              ] !== undefined
            ) {
              memberBalances[
                split.user_id
              ] -=
                Number(
                  split.amount
                ) || 0
            }
          }
        )
      }
    )

    settlements.forEach(
      (settlement) => {
        const amount =
          Number(
            settlement.amount
          ) || 0

        if (
          memberBalances[
            settlement.from_user
          ] !== undefined
        ) {
          memberBalances[
            settlement.from_user
          ] += amount
        }

        if (
          memberBalances[
            settlement.to_user
          ] !== undefined
        ) {
          memberBalances[
            settlement.to_user
          ] -= amount
        }
      }
    )

    const creditors = []
    const debtors = []

    allMembers.forEach(
      (member) => {
        const rawAmount =
          memberBalances[
            member.user_id
          ] || 0

        const amount =
          Math.round(
            rawAmount * 100
          ) / 100

        if (amount > 0.009) {
          creditors.push({
            member,
            amount,
          })
        }

        if (amount < -0.009) {
          debtors.push({
            member,
            amount:
              Math.abs(amount),
          })
        }
      }
    )

    const results = []

    let debtorIndex = 0
    let creditorIndex = 0

    while (
      debtorIndex <
        debtors.length &&
      creditorIndex <
        creditors.length
    ) {
      const debtor =
        debtors[
          debtorIndex
        ]

      const creditor =
        creditors[
          creditorIndex
        ]

      const amount =
        Math.min(
          debtor.amount,
          creditor.amount
        )

      if (amount > 0.009) {
        results.push({
          from:
            debtor.member,
          to:
            creditor.member,
          amount:
            Math.round(
              amount * 100
            ) / 100,
        })
      }

      debtor.amount -= amount
      creditor.amount -= amount

      if (
        debtor.amount < 0.01
      ) {
        debtorIndex += 1
      }

      if (
        creditor.amount < 0.01
      ) {
        creditorIndex += 1
      }
    }

    return results
  }, [
    isShared,
    allMembers,
    transactions,
    splits,
    settlements,
  ])

  const recentTransactions =
    transactions.slice(0, 5)

  const recentSettlements =
    settlements.slice(0, 5)

  const loadState = overviewLoadState({ scope: overviewScope, loadedScope, pending: loading, failed: overviewLoadError })
  const overviewRevealRef = useOverviewReveal(loadState, overviewScope)
  if (loadState !== 'ready') return <div ref={overviewRevealRef} className={`page overview-page ${isShared ? 'shared-overview' : 'personal-overview'}`}>
    <div className="page-header overview-masthead"><div><p className="eyebrow">{t(isShared ? 'sharedSpace' : 'personal')}</p><h1>{overviewTitle}</h1></div>
      {onAddTransaction && <button className="primary" type="button" onClick={onAddTransaction}><Plus size={18} />{t('addTransaction')}</button>}
    </div>
    {loadState === 'error' ? <section className="panel empty-state"><p role="alert">{t('data_load_failed')}</p><button className="secondary" onClick={() => setRetryNonce(value => value + 1)}>{t('retry')}</button></section>
      : <OverviewSkeleton label={t('loadingYourMoney')} shared={isShared} />}
  </div>

  return (
    <div ref={overviewRevealRef} className={`page overview-page overview-content-ready ${isShared ? 'shared-overview' : 'personal-overview'}`}>
      <div className="overview-transition-skeleton" aria-hidden="true" inert="">
        <OverviewSkeleton label={t('loadingYourMoney')} shared={isShared} />
      </div>
      <div className="page-header overview-masthead">
        <div>
          <p className="eyebrow">
            {isShared
              ? t('sharedSpace')
              : t('personal')}
          </p>

          <h1>
            {overviewTitle}
          </h1>
        </div>

        {onAddTransaction ? (
          <button className="primary" type="button" onClick={onAddTransaction}>
            <Plus size={18} />
            {t('addTransaction')}
          </button>
        ) : (
          <span className="completed-badge">{t('completedReadOnly')}</span>
        )}
      </div>

      {!isShared &&
        !hasShared && (
          <section className="shared-invite-card">
            <div>
              <div className="feature-icon">
                <UserPlus
                  size={20}
                />
              </div>

              <h2>
                Money gets shared
                sometimes.
              </h2>

              <p>
                Create a space only
                when you need one.
                Until then, your app
                stays personal and
                uncluttered.
              </p>
            </div>

            <button
              className="secondary"
              type="button"
              onClick={
                onCreateSpace
              }
            >
              <UserPlus
                size={17}
              />
              Create or join a
              shared space
            </button>
          </section>
        )}

      {isShared && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {t('sharedWith')}
              </p>

              <h2>{t('members')}</h2>
            </div>

            {activeSpace.status !== 'completed' && (
              <button className="secondary" type="button" onClick={() => setInviteOpen(true)}>
                <UserPlus size={17} />
                {t('inviteMember')}
              </button>
            )}
          </div>

          {membersLoading ? (
            <div className="empty-state">
              {t('loadingMembers')}
            </div>
          ) : activeMembers.length ===
            0 ? (
            <div className="empty-state">
              {t('noActiveMembers')}
            </div>
          ) : (
            <div className="transaction-list">
              {activeMembers.map(
                (member) => {
                  const name =
                    member.display_name ||
                    t('member')

                  return (
                    <div
                      className="transaction-row"
                      key={
                        member.user_id
                      }
                    >
                      <div className="transaction-avatar member-profile-avatar">
                        <AvatarImage
                          src={member.avatar_url}
                          size={20}
                          fallback={name[0].toUpperCase()}
                        />
                      </div>

                      <div className="transaction-main">
                        <strong>
                          {name}
                          {member.user_id ===
                          user?.id
                            ? ` (${t('you')})`
                            : ''}
                        </strong>

                        <span>
                          {member.role ===
                          'owner'
                            ? t('spaceOwner')
                            : t('sharedMember')}
                        </span>
                      </div>

                      <strong>
                        {member.role ===
                        'owner'
                          ? t('owner')
                          : t('member')}
                      </strong>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>
      )}

      {isShared && (
        <section className="metric-grid shared-metric-grid">
          <div className="metric-card hero-metric">
            <span>{t('sharedSpending')}</span>
            <strong>{money(totals.expenses, activeSpace.currency)}</strong>
            <small>{getMonthLabel(getLanguageLocale(language))}</small>
          </div>

          <div className="metric-card">
            <span>↗ {t('income')}</span>
            <strong>{money(totals.income, activeSpace.currency)}</strong>
            <small>{t('thisMonth')}</small>
          </div>

          <div className="metric-card">
            <span>↘ {t('net')}</span>
            <strong>{money(net, activeSpace.currency)}</strong>
            <small>{t('incomeMinusExpenses')}</small>
          </div>
        </section>
      )}

      {isShared && (
        <section className="panel balance-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {t('betweenMembers')}
              </p>

              <h2>
                {t('balances')}
              </h2>
            </div>
          </div>

          {membersLoading ||
          splitsLoading ||
          settlementsLoading ||
          loading ? (
            <div className="empty-state">
              {t('calculatingBalances')}
            </div>
          ) : balances.length ===
            0 ? (
            <div className="balance-settled">
              <div className="balance-settled-icon">
                <Check
                  size={18}
                />
              </div>

              <div>
                <strong>
                  {t('allSettled')}
                </strong>

                <span>
                  {t('nobodyOwes')}
                </span>
              </div>
            </div>
          ) : (
            <div className="balance-list">
              {balances.map(
                (
                  balance,
                  index
                ) => {
                  const fromName =
                    balance.from
                      .display_name ||
                    t('member')

                  const toName =
                    balance.to
                      .display_name ||
                    t('member')

                  const buttonLabel =
                    getSettlementButtonLabel(
                      balance
                    )

                  return (
                    <div
                      className="balance-row"
                      key={`${balance.from.user_id}-${balance.to.user_id}-${index}`}
                    >
                      <div className="balance-people">
                        <div className="transaction-avatar">
                          {fromName[0].toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {user?.id ===
                            balance.from
                              .user_id
                              ? t('youOwe', { name: toName })
                              : user?.id ===
                                balance.to
                                  .user_id
                                ? t('owesYou', { name: fromName })
                                : t('owesMember', { from: fromName, to: toName })}
                          </strong>

                          <span>
                            {t('outstandingSharedBalance')}
                          </span>
                        </div>
                      </div>

                      <div className="balance-actions">
                        <strong className="balance-amount">
                          {money(
                            balance.amount,
                            activeSpace.currency
                          )}
                        </strong>

                        {buttonLabel && (
                          <button
                            className="secondary settle-button"
                            type="button"
                            onClick={() =>
                              openSettlement(
                                balance
                              )
                            }
                          >
                            {buttonLabel}
                          </button>
                        )}

                        <button
                          className="balance-details-button"
                          type="button"
                          onClick={() =>
                            setBalanceDetails(
                              balance
                            )
                          }
                        >
                          {t('viewBreakdown')}
                        </button>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>
      )}

      {isShared &&
        !settlementsLoading &&
        recentSettlements.length > 0 && (
          <section className="panel settlement-history-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {t('moneyPaidBack')}
                </p>

                <h2>
                  {t('recentSettlements')}
                </h2>
              </div>
            </div>

            <div className="settlement-history-list">
              {recentSettlements.map(
                (settlement) => {
                  const fromName =
                    getMemberName(
                      settlement.from_user,
                      true
                    )

                  const toName =
                    getMemberName(
                      settlement.to_user,
                      true
                    )

                  const recordedBy =
                    getMemberName(
                      settlement.created_by,
                      true
                    )

                  const isReversal =
                    settlement.entry_type === 'reversal'

                  const isReversed =
                    Boolean(settlement.reversed_at)

                  const canReverse =
                    !isReversal &&
                    !isReversed &&
                    [settlement.from_user, settlement.to_user]
                      .includes(user?.id)

                  return (
                    <div
                      className={`settlement-history-row ${isReversed ? 'reversed' : ''}`}
                      key={
                        settlement.id
                      }
                    >
                      <div className="settlement-history-main">
                        <div className="settlement-history-avatar">
                          {fromName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="settlement-history-copy">
                          <strong>
                            {fromName}
                            {' → '}
                            {toName}
                            {isReversal && (
                              <span className="settlement-status reversal">{t('reversal')}</span>
                            )}
                            {isReversed && (
                              <span className="settlement-status reversed">{t('reversed')}</span>
                            )}
                          </strong>

                          <span>
                            {formatSettlementDate(
                              settlement.settlement_date,
                              getLanguageLocale(language)
                            )}
                            {' · '}
                            {t('recordedBy')}{' '}
                            {recordedBy.toLowerCase() ===
                            'you'
                              ? t('you')
                              : recordedBy}
                          </span>

                          {settlement.note && (
                            <small>
                              {settlement.note}
                            </small>
                          )}

                          {settlement.reversal_reason && (
                            <small>
                              {t('reason')}: {settlement.reversal_reason}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="settlement-history-actions">
                        <strong className="settlement-history-amount">
                          {isReversal ? '−' : ''}{money(
                            settlement.amount,
                            settlement.currency || activeSpace.currency
                          )}
                        </strong>

                        {canReverse && (
                          <button
                            className="balance-details-button"
                            type="button"
                            onClick={() => setSettlementToReverse(settlement)}
                          >
                            {t('reverse')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </section>
        )}

      {!isShared && !loading && personalOverviewReady && !financialLoadFailed && (
        <PersonalOverviewHero
          safeToSpend={safeToSpend}
          totals={totals}
          net={net}
          currency={activeSpace.currency || 'USD'}
          hasMonthlyBudget={hasMonthlyBudget}
        />
      )}

      {!isShared && (
        !loading && personalOverviewReady && <FinancialDataNotice quality={financialQuality} />
      )}


      {!isShared && (
        !loading && personalOverviewReady && !financialLoadFailed && <SpendingPaceCard result={safeToSpend} currency={activeSpace.currency || 'USD'} />
      )}

      {!isShared && !loading && personalOverviewReady && !financialLoadFailed && (
        <UpcomingBillsCard
          bills={upcomingBills}
          currency={activeSpace.currency || 'USD'}
          busyId={resolvingFixedId}
          onResolve={resolveUpcomingBill}
          error={fixedActionError}
        />
      )}

      {!isShared && !loading && personalOverviewReady && !financialLoadFailed && (
        <div className="fin-analytics-grid">
          <WeeklyRecapCard analytics={personalAnalytics} currency={activeSpace.currency || 'USD'} />
          <SpendingBreakdownCard analytics={personalAnalytics} currency={activeSpace.currency || 'USD'} />
          <MoneySignalsPanel analytics={personalAnalytics} currency={activeSpace.currency || 'USD'} activeSpace={activeSpace} checkins={checkins} />
          <ReflectionPanel key={`${user.id}:${activeSpace.id}:${personalAnalytics.weekly.start}`} analytics={personalAnalytics} activeSpace={activeSpace} currency={activeSpace.currency || 'USD'} checkins={checkins} />
        </div>
      )}

      <div className="fin-bottom-grid">
      <section className="panel recent-transactions-panel fin-recent-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {t('latest')}
            </p>

            <h2>
              {t('recentTransactions')}
            </h2>
          </div>
        </div>

        {!isShared && financialLoadFailed ? <p className="empty-state">{t('data_load_failed')}</p> : loading ? (
          <div className="empty-state">
            {t('loadingTransactions')}
          </div>
        ) : recentTransactions.length ===
          0 ? (
          <div className="empty-state">
            <strong>
              {t('noTransactions')}
            </strong>

            <span>
              {t('addFirst')}
            </span>
          </div>
        ) : (
          <div className="transaction-list">
            {recentTransactions.map(
              (transaction) => {
                const isIncome =
                  transaction.type ===
                  'income'

                const description =
                  transaction.description ||
                  transaction.category ||
                  'Transaction'

                return (
                  <div
                    className="transaction-row"
                    key={
                      transaction.id
                    }
                  >
                    <div className="transaction-avatar category-avatar">
                      <CategoryIcon category={transaction.category} />
                    </div>

                    <div className="transaction-main">
                      <strong>
                        {description}
                      </strong>

                      <span>
                        {t(getCategoryTranslationKey(transaction.category))}
                        {' · '}
                        {
                          transaction.transaction_date
                        }
                      </span>
                    </div>

                    <span
                      className={
                        isIncome
                          ? 'amount-income'
                          : 'amount-expense'
                      }
                    >
                      <TransactionAmount transaction={transaction} fallbackCurrency={activeSpace.currency} sign={isIncome ? '+' : '-'} />
                    </span>
                  </div>
                )
              }
            )}
          </div>
        )}
      </section>

      <aside className="fin-utility-rail">
        {!isShared && !loading && personalOverviewReady && !financialLoadFailed && (
          <details className="panel budget-summary-card">
            <summary>
              <div><p className="eyebrow">{t('budget')}</p><strong>{t('monthlyBudget')}</strong></div>
              <span>{money(safeToSpend.budgetAmount, activeSpace.currency || 'USD')}</span>
            </summary>
            <div className="budget-summary-content">
              <div><span>{t('upcomingObligations')}</span><strong>{money(safeToSpend.obligationAmount, activeSpace.currency || 'USD')}</strong></div>
              <div><span>{t('spentThisMonth')}</span><strong>{money(safeToSpend.spentAmount, activeSpace.currency || 'USD')}</strong></div>
              <Link className="secondary" to="/budget">{t('manageBudget')}</Link>
            </div>
          </details>
        )}

        {!loading && (isShared || !financialLoadFailed) && (
          <CurrencyOverviewCard
            transactions={transactions}
            baseCurrency={activeSpace.currency || 'USD'}
          />
        )}
      </aside>
      </div>

      {inviteOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={
            closeInvite
          }
        >
          <ModalSurface as="div" onClose={closeInvite} busy={inviteLoading}
            className="invite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {t('sharedSpace')}
                </p>

                <h2 id="invite-modal-title">
                  {t('inviteMember')}
                </h2>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={
                  closeInvite
                }
                aria-label={t('close')}
              >
                ×
              </button>
            </div>

            {!inviteLink ? (
              <form
                className="transaction-form invite-modal-form"
                onSubmit={
                  handleCreateInvite
                }
              >
                <label>
                  {t('emailAddress')}

                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={
                      inviteEmail
                    }
                    onChange={(
                      event
                    ) =>
                      setInviteEmail(
                        event.target
                          .value
                      )
                    }
                  />
                </label>

                <p className="muted invite-modal-helper">
                  {t('invitationModalCopy')}
                </p>

                {inviteError && (
                  <div className="auth-message error">
                    {inviteError}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={
                      closeInvite
                    }
                  >
                    {t('cancel')}
                  </button>

                  <button
                    className="primary"
                    type="submit"
                    disabled={
                      inviteLoading
                    }
                  >
                    {inviteLoading
                      ? t('creating')
                      : t('createInvitation')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="transaction-form invite-modal-form">
                <div className="invite-ready-card">
                  <strong>
                    {t('invitationReady')}
                  </strong>

                  <p className="muted">
                    {t('invitationReadyCopy', { email: inviteEmail })}
                  </p>

                  {inviteExpiresAt && (
                    <p className="muted">
                      {t('expiresAt', { date: new Date(inviteExpiresAt).toLocaleString(getLanguageLocale(language)) })}
                    </p>
                  )}
                </div>

                <div className="invite-link-row">
                  <input
                    readOnly
                    value={
                      inviteLink
                    }
                  />

                  <button
                    className="secondary"
                    type="button"
                    onClick={
                      handleCopyInvite
                    }
                  >
                    {copied ? (
                      <Check
                        size={17}
                      />
                    ) : (
                      <Copy
                        size={17}
                      />
                    )}

                    {copied
                      ? t('copied')
                      : t('copy')}
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    className="primary"
                    type="button"
                    onClick={
                      closeInvite
                    }
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            )}
          </ModalSurface>
        </div>
      )}

      <SettlementModal
        open={
          settlementOpen
        }
        onClose={
          closeSettlement
        }
        balance={
          selectedBalance
        }
        activeSpace={
          activeSpace
        }
        user={
          user
        }
        onSaved={
          handleSettlementSaved
        }
      />

      <BalanceDetailsModal
        balance={balanceDetails}
        transactions={transactions}
        splits={splits}
        settlements={settlements}
        activeSpace={activeSpace}
        user={user}
        onClose={() =>
          setBalanceDetails(null)
        }
      />

      <ReverseSettlementModal
        settlement={settlementToReverse}
        activeSpace={activeSpace}
        onClose={() => setSettlementToReverse(null)}
        onReversed={handleSettlementSaved}
      />
    </div>
  )
}
