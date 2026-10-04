import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from '../icons'
import BudgetMonthPicker from '../components/BudgetMonthPicker'
import { Navigate } from 'react-router-dom'
import BudgetPanel from '../features/safeToSpend/BudgetPanel'
import SafeToSpendCard from '../features/safeToSpend/SafeToSpendCard'
import SpendingPaceCard from '../features/financial/SpendingPaceCard'
import { calculateSafeToSpend } from '../features/safeToSpend/calculateSafeToSpend'
import { createFixedExpense, deleteFixedExpense, fetchFixedExpenses, fetchFixedExpenseOccurrences, fetchMonthlyBudgets, fetchTransactions, updateFixedExpense, upsertMonthlyBudget } from '../data/ledgerApi'
import { useLanguage } from '../i18n/LanguageContext'
import { getLocalMonthKey } from '../utils/dateKeys'

export default function Budget({ activeSpace, user, refreshKey }) {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState([])
  const [fixedOccurrences, setFixedOccurrences] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(() => getLocalMonthKey())
  const [actionError, setActionError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadedScope, setLoadedScope] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const loadVersion = useRef(0)
  const scope = `${activeSpace.id}:${selectedMonth}`
  const currentScope = useRef(scope)
  currentScope.current = scope
  const currency = activeSpace.currency || 'USD'

  async function loadAll() {
    const requestScope = scope
    if (requestScope !== currentScope.current) return
    const version = ++loadVersion.current
    setLoading(true)
    setLoadFailed(false)
    setActionError('')
    try {
    const [transactionResult, budgetResult, fixedResult, occurrenceResult] = await Promise.all([
      fetchTransactions(activeSpace.id),
      fetchMonthlyBudgets(activeSpace.id, user.id, selectedMonth),
      fetchFixedExpenses(activeSpace.id, user.id),
      fetchFixedExpenseOccurrences(activeSpace.id, user.id, selectedMonth),
    ])
    if (version !== loadVersion.current || requestScope !== currentScope.current) return
    if (transactionResult.error || budgetResult.error || fixedResult.error || occurrenceResult.error) {
      setActionError(t('budgetLoadError'))
      setLoadFailed(true)
    } else {
      setTransactions(transactionResult.data ?? [])
      setBudgets(budgetResult.data ?? [])
      setFixedExpenses(fixedResult.data ?? [])
      setFixedOccurrences(occurrenceResult.data ?? [])
    }
    } catch {
      if (version === loadVersion.current && requestScope === currentScope.current) {
        setActionError(t('budgetLoadError'))
        setLoadFailed(true)
      }
    } finally {
      if (version === loadVersion.current && requestScope === currentScope.current) {
        setLoadedScope(requestScope)
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (activeSpace.type === 'personal') loadAll()
    return () => { loadVersion.current += 1 }
  }, [activeSpace.id, user.id, refreshKey, selectedMonth])

  const budget = budgets.find(item => item.category === '__TOTAL__')
  const monthStart = `${selectedMonth}-01`
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number)
  const monthEnd = `${selectedMonth}-${String(new Date(selectedYear, selectedMonthNumber, 0).getDate()).padStart(2, '0')}`
  const visibleFixedExpenses = fixedExpenses.filter((item) =>
    (!item.starts_on || item.starts_on <= monthEnd) &&
    (!item.ends_on || item.ends_on >= monthStart)
  )
  const result = useMemo(() => calculateSafeToSpend({
    transactions, monthlyBudget: budget?.amount || 0, fixedExpenses, fixedExpenseOccurrences: fixedOccurrences, currency,
    periodMonth: selectedMonth, hasPlan: Boolean(budget),
  }), [transactions, budget?.amount, fixedExpenses, fixedOccurrences, currency, selectedMonth])

  if (activeSpace.type !== 'personal') return <Navigate to="/" replace />

  async function runBudgetAction(operation, errorKey) {
    setActionError('')
    try {
      const { error } = await operation()
      if (error) throw error
      await loadAll()
      return { error: null }
    } catch (error) {
      setActionError(t(errorKey))
      return { error }
    }
  }
  function saveBudget(amount) {
    return runBudgetAction(() => upsertMonthlyBudget({ space_id: activeSpace.id, user_id: user.id, category: '__TOTAL__', month: `${selectedMonth}-01`, amount, currency }), 'budgetSaveError')
  }
  function addFixedExpense(expense) {
    return runBudgetAction(() => createFixedExpense({ ...expense, space_id: activeSpace.id, user_id: user.id, currency, starts_on: `${selectedMonth}-01` }), 'fixedExpenseSaveError')
  }
  function editFixedExpense(id, changes) {
    return runBudgetAction(() => updateFixedExpense(id, changes), 'fixedExpenseSaveError')
  }
  function removeFixedExpense(id) {
    return runBudgetAction(() => deleteFixedExpense(id), 'fixedExpenseDeleteError')
  }

  return (
    <div className="page budget-page">
      <header className="page-header fin-budget-header">
        <div><p className="eyebrow">{t('personal')}</p><h1>{t('budgetPlanning')}</h1><p className="muted">{t('budgetPlanningCopy')}</p></div>
        <div className="budget-month-toolbar">
          <button className="secondary" type="button" onClick={() => setSelectedMonth(month => shiftMonth(month, -1))} aria-label={t('previousMonth')}><ChevronLeft size={18} /></button>
          <BudgetMonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          <button className="secondary" type="button" onClick={() => setSelectedMonth(month => shiftMonth(month, 1))} aria-label={t('nextMonth')}><ChevronRight size={18} /></button>
        </div>
      </header>
      {loading || loadedScope !== scope ? <section className="panel empty-state" role="status">{t('loadingYourMoney')}</section>
        : loadFailed ? <section className="panel empty-state"><p role="alert">{actionError}</p><button className="secondary" onClick={loadAll}>{t('retry')}</button></section>
        : <>{budget && <SafeToSpendCard result={result} currency={currency} />}
          <SpendingPaceCard result={result} currency={currency} />
          <BudgetPanel key={scope} budget={budget} fixedExpenses={visibleFixedExpenses} currency={currency} result={result} selectedMonth={selectedMonth} error={actionError} onSaveBudget={saveBudget} onAddFixed={addFixedExpense} onEditFixed={editFixedExpense} onDeleteFixed={removeFixedExpense} /></>}
    </div>
  )
}

function shiftMonth(month, delta) {
  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, monthIndex - 1 + delta, 1)
  if (date.getFullYear() < 1 || date.getFullYear() > 9999) return month
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
