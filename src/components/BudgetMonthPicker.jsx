import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays } from '../icons'
import { useLanguage } from '../i18n/LanguageContext'

export default function BudgetMonthPicker({ value, onChange }) {
  const { t, locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(value.slice(0, 4))
  const root = useRef(null)
  const trigger = useRef(null)
  const id = useId()
  const date = new Date(`${value}-15T12:00:00`)
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)

  useEffect(() => {
    if (!open) return
    root.current?.querySelector('[aria-pressed="true"]')?.focus()
    function dismiss(event) {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <div className="budget-month-picker" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
    }}>
      <span className="budget-month-caption">{t('budgetMonth')}</span>
      <button ref={trigger} type="button" className="budget-month-display" aria-label={`${t('budgetMonth')}: ${label}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => {
        setYear(value.slice(0, 4))
        setOpen(current => !current)
      }}>
        <strong>{label}</strong><CalendarDays size={18} aria-hidden="true" />
      </button>
      {open && <div id={id} className="budget-month-menu" role="dialog" aria-label={t('budgetMonth')}>
        <div className="budget-year-row">
          <input type="number" min="1" max="9999" step="1" value={year} aria-label={t('budgetYear')} onChange={event => setYear(event.target.value)} />
          <button type="button" className="secondary" onClick={close}>{t('close')}</button>
        </div>
        <div className="budget-month-options">
          {Array.from({ length: 12 }, (_, index) => {
            const month = String(index + 1).padStart(2, '0')
            const validYear = /^\d{1,4}$/.test(year) && Number(year) >= 1
            const key = `${year.padStart(4, '0')}-${month}`
            return <button type="button" key={month} disabled={!validYear} aria-pressed={value === key} onClick={() => { onChange(key); close() }}>
              {new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2026, index, 15))}
            </button>
          })}
        </div>
      </div>}
    </div>
  )
}
