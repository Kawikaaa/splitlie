import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from '../icons'
import useSelectKeyboard from './useSelectKeyboard'

export default function AppSelect({ value, options, onChange, ariaLabel, disabled = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const handleKeyDown = useSelectKeyboard(rootRef, open, setOpen)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className={`app-select ${open ? 'open' : ''} ${className}`.trim()} ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        className="app-select-trigger"
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || value}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="app-select-menu" id={menuId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              className={`app-select-option ${option.value === value ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                rootRef.current?.querySelector('.app-select-trigger')?.focus()
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
