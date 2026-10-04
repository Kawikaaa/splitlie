import { useLanguage } from '../../i18n/LanguageContext'

const SPLIT_TYPES = [
  ['none', 'dontSplit'],
  ['equal', 'equal'],
  ['percentage', 'percentage'],
  ['custom', 'custom'],
]

export default function SplitTypeToggle({
  value,
  onChange,
}) {
  const { t } = useLanguage()
  return (
    <div className="split-type-toggle">
      {SPLIT_TYPES.map(([type, label]) => (
        <button
          key={type}
          type="button"
          className={value === type ? 'active' : ''}
          onClick={() => onChange(type)}
        >
          {t(label)}
        </button>
      ))}
    </div>
  )
}
