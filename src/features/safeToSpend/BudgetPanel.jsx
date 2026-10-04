import { Pencil, Plus, Trash2, X } from '../../icons'
import { useEffect, useMemo, useState } from 'react'
import CategoryIcon from '../../components/CategoryIcon'
import CategorySelect, { getCategoryTranslationKey } from '../../components/CategorySelect'
import { TRANSACTION_CATEGORIES } from '../transactions/transactionUtils'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'
import ConfirmActionModal from '../../components/ConfirmActionModal'

function money(value, currency) { return formatCurrency(value, currency) }

export default function BudgetPanel({ budget, fixedExpenses, currency, result, selectedMonth, error, onSaveBudget, onAddFixed, onEditFixed, onDeleteFixed }) {
  const { t } = useLanguage()
  const [budgetAmount, setBudgetAmount] = useState('')
  const [addingFixed, setAddingFixed] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Housing')
  const [dueDay, setDueDay] = useState('1')
  const [editingId, setEditingId] = useState(null)
  const [busyAction, setBusyAction] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const choices = useMemo(() => TRANSACTION_CATEGORIES.filter(item => item !== 'Income'), [])
  useEffect(() => { setBudgetAmount(budget?.amount != null ? String(budget.amount) : '') }, [budget?.amount, selectedMonth])
  async function saveBudget() {
    if (!budgetAmount.trim() || !Number.isFinite(Number(budgetAmount)) || !(Number(budgetAmount) >= 0) || busyAction) return
    setBusyAction('budget')
    await onSaveBudget(Number(budgetAmount))
    setBusyAction('')
  }
  function resetFixedForm() { setName(''); setAmount(''); setCategory('Housing'); setDueDay('1'); setEditingId(null); setAddingFixed(false) }
  async function saveFixed() {
    if (busyAction || !name.trim() || !Number.isFinite(Number(amount)) || !(Number(amount) > 0) || !(Number(dueDay) >= 1 && Number(dueDay) <= 31 && Number.isInteger(Number(dueDay)))) return
    const changes = { name: name.trim(), amount: Number(amount), category, due_day: Math.min(31, Math.max(1, Number(dueDay) || 1)) }
    setBusyAction('fixed')
    const result = editingId ? await onEditFixed(editingId, changes) : await onAddFixed(changes)
    setBusyAction('')
    if (!result?.error) resetFixedForm()
  }
  async function confirmDelete() {
    if (!deleteTarget || busyAction) return
    setBusyAction('delete')
    const result = await onDeleteFixed(deleteTarget.id)
    setBusyAction('')
    if (!result?.error) setDeleteTarget(null)
  }
  function beginEdit(item) { setEditingId(item.id); setName(item.name); setAmount(String(item.amount)); setCategory(item.category || 'Other'); setDueDay(String(item.due_day || 1)); setAddingFixed(true) }
  const progressClass = result.safeToSpend < 0 ? 'over' : result.usedPercent >= 80 ? 'warning' : ''
  return (
    <section className="panel budget-panel">
      <div className="panel-heading"><div><p className="eyebrow">{selectedMonth}</p><h2>{t('monthlyBudget')}</h2><p className="muted">{t('totalBudgetCopy')}</p></div></div>
      <div className={`budget-usage ${progressClass}`}>
        <div className="budget-usage-copy"><span>{t('budgetUsed')}</span><strong>{money(result.usedAmount, currency)} / {money(result.budgetAmount, currency)}</strong></div>
        <div className="budget-usage-track"><span style={{ width: `${Math.min(result.usedPercent, 100)}%` }} /></div>
        <small>{result.safeToSpend < 0 ? t('budgetOverBy', { amount: money(Math.abs(result.safeToSpend), currency) }) : t('budgetUsedPercent', { percent: result.usedPercent })}</small>
      </div>
      {error && <div className="auth-message error budget-action-error" role="alert">{error}</div>}
      <div className="total-budget-editor">
        <label>{t('monthlyBudgetAmount')}<input type="number" min="0" step="0.01" value={budgetAmount} onChange={event => setBudgetAmount(event.target.value)} placeholder="0.00" /></label>
        <button className="primary" type="button" disabled={Boolean(busyAction) || !budgetAmount.trim() || !Number.isFinite(Number(budgetAmount)) || Number(budgetAmount) < 0} onClick={saveBudget}>{busyAction === 'budget' ? t('saving') : t('saveBudget')}</button>
      </div>
      <div className="fixed-expense-heading">
        <div><h3>{t('fixedExpenses')}</h3><p className="muted">{t('fixedExpensesCopy')}</p></div>
        <button className="secondary" type="button" disabled={Boolean(busyAction)} onClick={() => { if (addingFixed) resetFixedForm(); else setAddingFixed(true) }}>{addingFixed ? <X size={16} /> : <Plus size={16} />} {addingFixed ? t('cancel') : t('addFixedExpense')}</button>
      </div>
      {addingFixed && (
        <div className="fixed-expense-form">
          <label>{t('fixedExpenseName')}<input value={name} onChange={event => setName(event.target.value)} placeholder={t('fixedExpenseExample')} /></label>
          <label>{t('amount')}<input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label>{t('category')}<CategorySelect value={category} options={choices} onChange={setCategory} /></label>
          <label>{t('dueDay')}<input type="number" min="1" max="31" value={dueDay} onChange={event => setDueDay(event.target.value)} /></label>
          <button className="primary" type="button" disabled={Boolean(busyAction) || !name.trim() || !Number.isFinite(Number(amount)) || !(Number(amount) > 0) || !(Number(dueDay) >= 1 && Number(dueDay) <= 31 && Number.isInteger(Number(dueDay)))} onClick={saveFixed}>{busyAction === 'fixed' ? t('saving') : editingId ? t('saveChanges') : t('saveFixedExpense')}</button>
        </div>
      )}
      <div className="budget-list">
        {fixedExpenses.length === 0 && <p className="muted budget-empty">{t('noFixedExpenses')}</p>}
        {fixedExpenses.map(item => (
          <div className="budget-row" key={item.id}>
            <CategoryIcon category={item.category} />
            <div className="budget-progress-copy"><div><strong>{item.name}</strong><span>{money(item.amount, currency)}</span></div><small>{t(getCategoryTranslationKey(item.category))} · {t('monthlyDueDay', { day: item.due_day })}</small></div>
            <div className="budget-row-actions"><button className="icon-button" type="button" disabled={Boolean(busyAction)} onClick={() => beginEdit(item)} aria-label={t('editFixedExpense')}><Pencil size={15} /></button><button className="icon-button" type="button" disabled={Boolean(busyAction)} onClick={() => setDeleteTarget(item)} aria-label={t('deleteFixedExpense')}><Trash2 size={15} /></button></div>
          </div>
        ))}
      </div>
      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={t('deleteFixedExpenseQuestion')}
        description={t('deleteFixedExpenseCopy', { name: deleteTarget?.name || '' })}
        confirmLabel={t('deleteFixedExpense')}
        busyLabel={t('deleting')}
        busy={busyAction === 'delete'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  )
}
