import AppSelect from './AppSelect'
import { LANGUAGE_OPTIONS, useLanguage } from '../i18n/LanguageContext'
import './PublicLanguageSelect.css'

export default function PublicLanguageSelect() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <AppSelect
      className="public-language-select"
      value={language}
      options={LANGUAGE_OPTIONS}
      onChange={setLanguage}
      ariaLabel={t('language')}
    />
  )
}
