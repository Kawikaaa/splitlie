import { ArrowRight, House, ShoppingBasket, Utensils, WalletCards } from '../icons'
import { useLanguage } from '../i18n/LanguageContext'
import PublicLanguageSelect from '../components/PublicLanguageSelect'
import { useLandingEntrance } from '../hooks/usePublicEntrance'
import './LandingPage.css'

const PREVIEW_ROWS = [
  { key: 'categoryGroceries', amount: '−$84.20', Icon: ShoppingBasket },
  { key: 'utilities', amount: '−$126.00', Icon: House },
  { key: 'coffee', amount: '−$12.50', Icon: Utensils },
]
const FEATURES = [
  ['startPersonal', 'startPersonalCopy'],
  ['shareWhenNeeded', 'shareWhenNeededCopy'],
  ['seeFullStory', 'seeFullStoryCopy'],
]
const TITLE_PUNCTUATION = /[.,!?。！？…，、；：:;]/g

function ProductPreview({ t }) {
  return (
    <figure className="lp-preview" aria-label={t('landingProductPreview')}>
      <div className="lp-ledger">
        <div className="lp-available" data-public-shared data-flip-id="public-preview">
          <div className="public-brand-plane" data-public-shared data-flip-id="public-plane" aria-hidden="true" />
          <WalletCards size={32} aria-hidden="true" />
          <span>{t('safeToSpend')}</span>
          <strong data-public-shared data-flip-id="public-amount" aria-label="$631.93"><span data-preview-amount aria-hidden="true">$631.93</span></strong>
          <p>{t('monthlyBudget')} $1,000.00</p>
        </div>
        <div className="lp-ledger-rows">
          {PREVIEW_ROWS.map(({ key, amount, Icon }) => (
            <div className="lp-ledger-row" key={key}>
              <Icon size={24} aria-hidden="true" />
              <span>{t(key)}</span>
              <strong>{amount}</strong>
            </div>
          ))}
        </div>
      </div>
      <figcaption>{t('examplePreview')}</figcaption>
    </figure>
  )
}

export default function LandingPage({ onGetStarted, onLogin }) {
  const { language, t } = useLanguage()
  const entrance = useLandingEntrance(language)
  const title = t('landingTitle').replace(TITLE_PUNCTUATION, '')

  return (
    <div className="lp-page" lang={language} ref={entrance}>
      <a className="skip-link" href="#lp-main">{t('skipToContent')}</a>
      <header className="lp-header">
        <a className="lp-brand" data-public-shared data-flip-id="public-logo" href="#top" aria-label={t('splitlyHome')}>
          <span className="lp-brand-mark" aria-hidden="true" />Splitlie
        </a>
        <nav className="lp-header-actions" aria-label={t('splitlyHome')}>
          <PublicLanguageSelect />
          <button className="lp-login" type="button" onClick={onLogin}>{t('logIn')}</button>
          <button className="lp-button lp-nav-cta" type="button" onClick={onGetStarted}>{t('getStarted')}</button>
        </nav>
      </header>

      <main id="lp-main">
        <section className="lp-hero" id="top" aria-labelledby="lp-title">
          <div className="lp-hero-copy">
            <h1 id="lp-title" tabIndex={-1} data-public-shared data-flip-id="public-story">
              {language === 'zh'
                ? <><span>{title.slice(0, 5)}</span><span>{title.slice(5)}</span></>
                : title}
            </h1>
            <p className="lp-intro" data-public-shared data-flip-id="public-copy">{t('landingCopy')}</p>
            <div className="lp-hero-actions">
              <button className="lp-button lp-main-cta" type="button" onClick={onGetStarted}>
                {t('createAccount')}<ArrowRight size={26} aria-hidden="true" />
              </button>
              <button className="lp-account-link" type="button" onClick={onLogin}>{t('alreadyHaveAccount')}</button>
            </div>
          </div>
          <ProductPreview t={t} />
        </section>

        <div className="lp-capabilities">
          <span>{t('personalLedger')}</span>
          <span>{t('sharedExpenses')}</span>
          <span>{t('clearBalances')}</span>
        </div>

        <section className="lp-features" aria-label={t('landingKicker')}>
          {FEATURES.map(([heading, copy]) => (
            <article className="lp-feature" key={heading}>
              <h2>{t(heading).replace(TITLE_PUNCTUATION, '')}</h2>
              <div className="lp-feature-body">
                <p>{t(copy)}</p>
                {heading === 'shareWhenNeeded' && (
                  <div className="lp-sharing-example">
                    <span className="lp-example-label">{t('examplePreview')}</span>
                    <div>
                      <span>{t('splitEqually')} · {t('peopleCount', { count: 3 })}</span>
                      <strong>{t('sampleOwedBalance')}</strong>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer className="lp-footer">
        <a className="lp-brand" href="#top" aria-label={t('splitlyHome')}>Splitlie</a>
        <button className="lp-button" type="button" onClick={onGetStarted}>
          {t('createAccount')}<ArrowRight size={20} aria-hidden="true" />
        </button>
      </footer>
    </div>
  )
}
