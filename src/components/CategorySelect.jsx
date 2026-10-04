import { useEffect, useId, useRef, useState } from 'react'
import useSelectKeyboard from './useSelectKeyboard'
import { Check, ChevronDown } from '../icons'
import CategoryIcon from './CategoryIcon'
import { useLanguage } from '../i18n/LanguageContext'

const categoryKeys = {
  Food: 'categoryFood', Groceries: 'categoryGroceries', Housing: 'categoryHousing', Transportation: 'categoryTransportation', Shopping: 'categoryShopping',
  Entertainment: 'categoryEntertainment', Health: 'categoryHealth', Education: 'categoryEducation', Income: 'categoryIncome', Other: 'categoryOther',
}

export function getCategoryTranslationKey(category) {
  return categoryKeys[category] || 'categoryOther'
}

export default function CategorySelect({ value, options, onChange }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const handleKeyDown = useSelectKeyboard(rootRef, open, setOpen)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  return (
    <div className={`category-select ${open ? 'open' : ''}`} ref={rootRef} onKeyDown={handleKeyDown}>
      <button className="category-select-trigger" type="button" onClick={() => setOpen(current => !current)} aria-label={t('category')} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}>
        <CategoryIcon category={value} />
        <span>{t(getCategoryTranslationKey(value))}</span>
        <ChevronDown className="category-select-chevron" size={16} />
      </button>

      {open && (
        <div className="category-select-menu" id={menuId} role="listbox" aria-label={t('category')}>
          {options.map(option => (
            <button
              className={`category-select-option ${option === value ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option === value}
              tabIndex={-1}
              key={option}
              onClick={() => { onChange(option); setOpen(false); rootRef.current?.querySelector('.category-select-trigger')?.focus() }}
            >
              <CategoryIcon category={option} />
              <span>{t(getCategoryTranslationKey(option))}</span>
              {option === value && <Check className="category-select-check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
