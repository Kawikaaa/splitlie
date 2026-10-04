import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from '../icons'

import DeleteTransactionModal from '../features/transactions/DeleteTransactionModal'
import TransactionDetailsModal from '../features/transactions/TransactionDetailsModal'
import { getLanguageLocale, useLanguage } from '../i18n/LanguageContext'
import CategoryIcon from '../components/CategoryIcon'
import AppSelect from '../components/AppSelect'
import MenuSurface from '../components/MenuSurface'
import { getCategoryTranslationKey } from '../components/CategorySelect'
import { formatCurrency } from '../services/currency/currencyFormatter'
import { getAccountingAmount } from '../services/currency/currencyService'
import TransactionAmount from '../features/transactions/TransactionAmount'

import {
  deleteTransactionById,
  fetchSpaceMembers,
  fetchSettledTransactionIds,
  fetchTransactionSplits,
  fetchTransactions,
} from '../data/ledgerApi'

function money(value, currency = 'USD') {
  return formatCurrency(value, currency)
}

function formatDate(value, locale = 'en-US') {
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

export default function Transactions({
  activeSpace,
  user,
  onAddTransaction,
  onEditTransaction,
  refreshKey,
}) {
  const { language, t } = useLanguage()
  const locale = getLanguageLocale(language)
  const [transactions, setTransactions] = useState([])
  const [members, setMembers] = useState([])
  const [splits, setSplits] = useState([])
  const [settledTransactionIds, setSettledTransactionIds] =
    useState([])

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [detailsTransaction, setDetailsTransaction] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [openActionMenu, setOpenActionMenu] = useState('')

  const [expandedTransactions, setExpandedTransactions] =
    useState({})

  const isShared = activeSpace.type === 'shared'
  const userDisplayName =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Personal'

  const spaceDisplayName = isShared
    ? activeSpace.name
    : t('personalSpace', { name: userDisplayName })

  useEffect(() => {
    if (!activeSpace?.id) return

    setSearchQuery('')
    setMonthFilter('all')
    setCategoryFilter('all')
    setCurrencyFilter('all')
    loadPage()
  }, [activeSpace?.id, refreshKey])

  async function loadPage() {
    setLoading(true)
    setPageError('')

    if (isShared) {
      await Promise.all([
        loadTransactions(),
        loadMembers(),
        loadSplits(),
        loadSettledTransactions(),
      ])
    } else {
      await loadTransactions()

      setMembers([])
      setSplits([])
      setSettledTransactionIds([])
    }

    setLoading(false)
  }

  async function loadTransactions() {
    const { data, error } =
      await fetchTransactions(
        activeSpace.id
      )

    if (error) {
      console.error(
        'Could not load transactions:',
        error
      )

      setTransactions([])
      setPageError(t('loadTransactionsError'))
      return
    }

    setTransactions(data ?? [])
  }

  async function loadMembers() {
    const { data, error } =
      await fetchSpaceMembers(
        activeSpace.id
      )

    if (error) {
      console.error(
        'Could not load members:',
        error
      )

      setMembers([])
      setPageError(t('loadMembersError'))
      return
    }

    setMembers(
      (data ?? []).map((member) => ({
        ...member,
        display_name:
          member.profiles?.display_name ||
          'Member',
      }))
    )
  }

  async function loadSplits() {
    const { data, error } =
      await fetchTransactionSplits()

    if (error) {
      console.error(
        'Could not load transaction splits:',
        error
      )

      setSplits([])
      setPageError(t('loadSplitsError'))
      return
    }

    setSplits(data ?? [])
  }

  async function loadSettledTransactions() {
    const { data, error } =
      await fetchSettledTransactionIds(
        activeSpace.id
      )

    if (error) {
      console.error(
        'Could not load settled transactions:',
        error
      )

      setSettledTransactionIds([])
      setPageError(t('verifySettlementsError'))
      return
    }

    setSettledTransactionIds(data ?? [])
  }

  function getMemberName(userId) {
    if (!userId) {
      return 'Unknown member'
    }

    if (user?.id === userId) {
      return 'You'
    }

    return (
      members.find(
        (member) => member.user_id === userId
      )?.display_name ||
      'Member'
    )
  }

  function getTransactionSplits(transactionId) {
    return splits.filter(
      (split) =>
        split.transaction_id === transactionId
    )
  }

  function toggleTransaction(transactionId) {
    setExpandedTransactions((current) => ({
      ...current,
      [transactionId]:
        !current[transactionId],
    }))
  }

  function canManageTransaction(transaction) {
    if (!user?.id || !transaction) {
      return false
    }

    const isCreator =
      transaction.created_by === user.id

    const isSpaceOwner =
      activeSpace.created_by === user.id

    return isCreator || isSpaceOwner
  }

  function isTransactionLocked(transaction) {
    if (!isShared || !transaction?.id) {
      return false
    }

    return settledTransactionIds.includes(
      transaction.id
    )
  }

  function editTransaction(transaction) {
    if (
      !canManageTransaction(transaction) ||
      isTransactionLocked(transaction)
    ) {
      return
    }

    const transactionSplits =
      getTransactionSplits(
        transaction.id
      )

    onEditTransaction({
      ...transaction,
      splits: transactionSplits.map(
        (split) => ({
          id: split.id,
          transaction_id:
            split.transaction_id,
          user_id: split.user_id,
          amount:
            Number(split.amount) || 0,
        })
      ),
    })
  }

  function requestDeleteTransaction(transaction) {
    if (
      !canManageTransaction(transaction) ||
      isTransactionLocked(transaction)
    ) {
      return
    }

    setDetailsTransaction(null)
    setPendingDelete(transaction)
  }

  async function confirmDeleteTransaction() {
    const transaction = pendingDelete

    if (!transaction) return

    setDeletingId(transaction.id)
    setPageError('')

    const { error } = await deleteTransactionById(
      transaction.id
    )

    setDeletingId('')

    if (error) {
      setPageError(
        error.message || t('deleteTransactionError')
      )
      return
    }

    setPendingDelete(null)

    setTransactions((current) =>
      current.filter(
        (item) =>
          item.id !== transaction.id
      )
    )

    setSplits((current) =>
      current.filter(
        (split) =>
          split.transaction_id !== transaction.id
      )
    )

    setSettledTransactionIds((current) =>
      current.filter(
        (id) =>
          id !== transaction.id
      )
    )

    setExpandedTransactions((current) => {
      const next = { ...current }

      delete next[transaction.id]

      return next
    })
  }

  const monthOptions = useMemo(() => {
    return [...new Set(
      transactions
        .map((transaction) => transaction.transaction_date?.slice(0, 7))
        .filter(Boolean)
    )].sort().reverse()
  }, [transactions])

  const categoryOptions = useMemo(() => {
    return [...new Set(
      transactions
        .map((transaction) => transaction.category || 'Other')
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const currencyOptions = useMemo(() => [...new Set(
    transactions.map((transaction) => transaction.currency || activeSpace.currency || 'USD')
  )].sort(), [transactions, activeSpace.currency])

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return transactions.filter((transaction) => {
      const description = transaction.description || ''
      const category = transaction.category || 'Other'
      const matchesSearch = !query ||
        description.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      const matchesMonth = monthFilter === 'all' ||
        transaction.transaction_date?.startsWith(monthFilter)
      const matchesCategory = categoryFilter === 'all' ||
        category === categoryFilter
      const matchesCurrency = currencyFilter === 'all' ||
        (transaction.currency || activeSpace.currency || 'USD') === currencyFilter

      return matchesSearch && matchesMonth && matchesCategory && matchesCurrency
    })
  }, [transactions, searchQuery, monthFilter, categoryFilter, currencyFilter, activeSpace.currency])

  const filtersActive =
    Boolean(searchQuery.trim()) ||
    monthFilter !== 'all' ||
    categoryFilter !== 'all'
    || currencyFilter !== 'all'

  const transactionCount = filteredTransactions.length

  const totalExpenses = useMemo(() => {
    return filteredTransactions.reduce(
      (total, transaction) => {
        if (transaction.type !== 'expense') {
          return total
        }

        const amount = getAccountingAmount(transaction)
        return amount === null ? total : total + amount
      },
      0
    )
  }, [filteredTransactions])

  const totalIncome = useMemo(() => {
    return filteredTransactions.reduce(
      (total, transaction) => {
        if (transaction.type !== 'income') return total
        const amount = getAccountingAmount(transaction)
        return amount === null ? total : total + amount
      },
      0
    )
  }, [filteredTransactions])

  return (
    <div className="page transactions-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {isShared
              ? t('sharedSpace')
              : t('personal')}
          </p>

          <h1>{t('transactions')}</h1>

          <p className="muted">
            {isShared
              ? t('sharedActivity', { space: spaceDisplayName })
              : t('allActivity', { space: spaceDisplayName })}
          </p>
        </div>

        {onAddTransaction ? (
          <button className="primary" type="button" onClick={onAddTransaction}>
            <Plus size={17} />
            {t('addTransaction')}
          </button>
        ) : (
          <span className="completed-badge">{t('completedReadOnly')}</span>
        )}
      </header>

      {pageError && (
        <div className="page-message error" role="alert">
          {pageError}
          <button className="secondary" type="button" disabled={loading} onClick={loadPage}>{t('retry')}</button>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <div className="transaction-filters" aria-label={t('transactionFilters')}>
          <label className="transaction-search">
            <Search size={16} />
            <input
              type="search"
              aria-label={t('searchTransactions')}
              placeholder={t('searchTransactions')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <AppSelect ariaLabel={t('filterMonth')} value={monthFilter} onChange={setMonthFilter} options={[
            { value: 'all', label: t('allMonths') },
            ...monthOptions.map((month) => ({ value: month, label: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)) })),
          ]} />

          <AppSelect ariaLabel={t('filterCategory')} value={categoryFilter} onChange={setCategoryFilter} options={[
            { value: 'all', label: t('allCategories') },
            ...categoryOptions.map((category) => ({ value: category, label: t(getCategoryTranslationKey(category)) })),
          ]} />

          <AppSelect ariaLabel={t('filterCurrency')} value={currencyFilter} onChange={setCurrencyFilter} options={[
            { value: 'all', label: t('allCurrencies') },
            ...currencyOptions.map((currency) => ({ value: currency, label: currency })),
          ]} />

          {filtersActive && (
            <button
              className="transaction-filter-clear"
              type="button"
              onClick={() => {
                setSearchQuery('')
                setMonthFilter('all')
                setCategoryFilter('all')
                setCurrencyFilter('all')
              }}
            >
              {t('clear')}
            </button>
          )}
        </div>
      )}

      {isShared &&
        !loading &&
        filteredTransactions.length > 0 && (
          <div className="shared-transaction-summary fin-transaction-overview">
            <div>
              <span>{t('transactions')}</span>

              <strong>
                {transactionCount}
              </strong>
            </div>

            <div>
              <span>{t('totalSpending')}</span>

              <strong>
                {money(
                  totalExpenses,
                  activeSpace.currency
                )}
              </strong>
            </div>

            <div>
              <span>{t('totalIncome')}</span>
              <strong>{money(totalIncome, activeSpace.currency)}</strong>
            </div>
          </div>
        )}

      {!isShared && !loading && filteredTransactions.length > 0 && (
        <div className="fin-transaction-overview" aria-label={t('transactions')}>
          <div>
            <span>{t('transactions')}</span>
            <strong>{transactionCount}</strong>
          </div>
          <div>
            <span>{t('totalSpending')}</span>
            <strong>{money(totalExpenses, activeSpace.currency)}</strong>
          </div>
          <div>
            <span>{t('totalIncome')}</span>
            <strong>{money(totalIncome, activeSpace.currency)}</strong>
          </div>
        </div>
      )}

      <section className="panel">
        {loading ? (
          <div className="empty-state">
            {t('loadingTransactions')}
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <strong>
              {t('noTransactions')}
            </strong>

            <span>
              {t('addFirst')}
            </span>

            {onAddTransaction && <button
              className="secondary"
              type="button"
              onClick={onAddTransaction}
            >
              <Plus size={16} />
              {t('addTransaction')}
            </button>}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <strong>{t('noMatches')}</strong>
            <span>{t('changeFilters')}</span>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setSearchQuery('')
                setMonthFilter('all')
                setCategoryFilter('all')
                setCurrencyFilter('all')
              }}
            >
              {t('clearFilters')}
            </button>
          </div>
        ) : isShared ? (
          <div className="shared-transaction-list">
            {filteredTransactions.map((transaction) => {
              const expense =
                transaction.type === 'expense'

              const description =
                transaction.description ||
                transaction.category ||
                'Transaction'

              const transactionSplits =
                getTransactionSplits(
                  transaction.id
                )

              const splitCount =
                transactionSplits.length

              const splitType =
                transaction.split_type || 'none'

              const isSplit =
                expense &&
                splitType !== 'none' &&
                splitCount > 0

              const expanded =
                Boolean(
                  expandedTransactions[
                    transaction.id
                  ]
                )

              const payerName =
                getMemberName(
                  transaction.paid_by
                )

              const currentUserSplit =
                transactionSplits.find(
                  (split) =>
                    split.user_id === user?.id
                )

              const canManage =
                activeSpace.status !== 'completed' &&
                canManageTransaction(transaction)

              const actionMenuKey =
                transaction.id ||
                `${description}-${transaction.transaction_date}-${transaction.amount}`

              const locked =
                isTransactionLocked(
                  transaction
                )

              let splitLabel = t('notSplit')

              if (splitType === 'equal') {
                splitLabel = t('splitEquallyCount', { count: splitCount })
              }

              if (splitType === 'custom') {
                splitLabel = t('customSplitCount', { count: splitCount })
              }

              if (splitType === 'percentage') {
                splitLabel = t('percentageSplitCount', { count: splitCount })
              }

              return (
                <article
                  className="shared-transaction-card"
                  key={actionMenuKey}
                >
                  <div className="shared-transaction-top">
                    <div className="shared-transaction-identity">
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
                          {formatDate(transaction.transaction_date, locale)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={
                        expense
                          ? 'amount-expense'
                          : 'amount-income'
                      }
                    >
                      <TransactionAmount transaction={transaction} fallbackCurrency={activeSpace.currency} sign={expense ? '-' : '+'} />
                    </span>
                  </div>

                  {expense && (
                    <div className="shared-transaction-meta">
                      <div className="shared-transaction-meta-item">
                        <span>{t('paidBy')}</span>

                        <strong>
                          {payerName}
                        </strong>
                      </div>

                      <div className="shared-transaction-meta-divider" />

                      <div className="shared-transaction-meta-item">
                        <span>{t('split')}</span>

                        <strong>
                          {splitLabel}
                        </strong>
                      </div>

                      {currentUserSplit && (
                        <>
                          <div className="shared-transaction-meta-divider" />

                          <div className="shared-transaction-meta-item">
                            <span>{t('yourShare')}</span>

                            <strong>
                              {money(
                                currentUserSplit.amount,
                                transaction.base_currency ||
                                  activeSpace.currency
                              )}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="shared-transaction-footer">
                    <div>
                      <button
                        className="transaction-details-button"
                        type="button"
                        onClick={() => setDetailsTransaction(transaction)}
                      >
                        <Eye size={15} /> {t('viewDetails')}
                      </button>
                      {isSplit && (
                        <button
                          className="transaction-details-button"
                          type="button"
                          onClick={() =>
                            toggleTransaction(
                              transaction.id
                            )
                          }
                        >
                          <Users size={15} />

                          {expanded
                            ? t('hideSplit')
                            : t('viewSplit')}

                          {expanded ? (
                            <ChevronUp
                              size={15}
                            />
                          ) : (
                            <ChevronDown
                              size={15}
                            />
                          )}
                        </button>
                      )}
                    </div>

                    {canManage && (
                      locked ? (
                        <div
                          className="transaction-locked"
                          title="This transaction is part of settlement history and can no longer be edited or deleted."
                        >
                          <Lock size={15} />
                          {t('settled')}
                        </div>
                      ) : (
                        <div className="transaction-card-actions">
                          <button
                            className="edit-button"
                            type="button"
                            title="Edit"
                            aria-label={`Edit ${description}`}
                            onClick={() =>
                              editTransaction(
                                transaction
                              )
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="delete-button"
                            type="button"
                            title="Delete"
                            aria-label={`Delete ${description}`}
                            disabled={deletingId === transaction.id}
                            onClick={() =>
                              requestDeleteTransaction(
                                transaction
                              )
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {isSplit && expanded && (
                    <div className="shared-split-details">
                      <div className="shared-split-heading">
                        <span>
                          {t('splitDetails')}
                        </span>

                        <strong>
                          {splitType === 'equal'
                            ? t('equal')
                            : t('custom')}
                        </strong>
                      </div>

                      <div className="shared-split-member-list">
                        {transactionSplits.map(
                          (split) => {
                            const memberName =
                              getMemberName(
                                split.user_id
                              )

                            return (
                              <div
                                className="shared-split-member-row"
                                key={split.id}
                              >
                                <div className="shared-split-member">
                                  <div className="shared-split-mini-avatar">
                                    {memberName[0].toUpperCase()}
                                  </div>

                                  <span>
                                    {memberName}
                                  </span>
                                </div>

                                <strong>
                                  {money(
                                    split.amount,
                                    transaction.currency ||
                                      activeSpace.currency
                                  )}
                                </strong>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.map((transaction) => {
              const expense =
                transaction.type === 'expense'

              const description =
                transaction.description ||
                transaction.category ||
                'Transaction'

              const canManage =
                activeSpace.status !== 'completed' &&
                canManageTransaction(transaction)

              const actionMenuKey =
                transaction.id ||
                `${description}-${transaction.transaction_date}-${transaction.amount}`

              return (
                <div
                  className="transaction-row transaction-full"
                  key={transaction.id}
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
                      {formatDate(
                        transaction.transaction_date,
                        locale
                      )}
                    </span>
                  </div>

                  <span
                    className={
                      expense
                        ? 'amount-expense'
                        : 'amount-income'
                    }
                  >
                    <TransactionAmount transaction={transaction} fallbackCurrency={activeSpace.currency} sign={expense ? '-' : '+'} />
                  </span>

                  {canManage && (
                    <div className={`fin-row-menu ${openActionMenu === actionMenuKey ? 'open' : ''}`}>
                      <button
                        className="fin-row-menu-trigger"
                        type="button"
                        aria-expanded={openActionMenu === actionMenuKey}
                        aria-haspopup="menu"
                        onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpenActionMenu(actionMenuKey) } }}
                        aria-label={`${t('actions')}: ${description}`}
                        title={t('actions')}
                        onClick={() => setOpenActionMenu((current) => current === actionMenuKey ? '' : actionMenuKey)}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {openActionMenu === actionMenuKey && (
                        <MenuSurface className="fin-row-menu-popover" role="menu" aria-label={description} onClose={() => setOpenActionMenu('')}>
                          <button type="button" role="menuitem" tabIndex={-1} onClick={() => {
                            setOpenActionMenu('')
                            setDetailsTransaction(transaction)
                          }}><Eye size={15} /> {t('viewDetails')}</button>
                          <button type="button" role="menuitem" tabIndex={-1} onClick={() => {
                            setOpenActionMenu('')
                            editTransaction(transaction)
                          }}><Pencil size={15} /> {t('edit')}</button>
                          <button className="danger" type="button" role="menuitem" tabIndex={-1} disabled={deletingId === transaction.id} onClick={() => {
                            setOpenActionMenu('')
                            requestDeleteTransaction(transaction)
                          }}><Trash2 size={15} /> {t('deleteTransaction')}</button>
                        </MenuSurface>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <TransactionDetailsModal
        transaction={detailsTransaction}
        splits={detailsTransaction ? getTransactionSplits(detailsTransaction.id) : []}
        members={members}
        activeSpace={activeSpace}
        user={user}
        canManage={canManageTransaction(detailsTransaction)}
        locked={isTransactionLocked(detailsTransaction)}
        onClose={() => setDetailsTransaction(null)}
        onEdit={() => {
          const selected = detailsTransaction
          setDetailsTransaction(null)
          editTransaction(selected)
        }}
        onDelete={() => requestDeleteTransaction(detailsTransaction)}
      />

      <DeleteTransactionModal
        transaction={pendingDelete}
        deleting={Boolean(deletingId)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteTransaction}
      />
    </div>
  )
}
