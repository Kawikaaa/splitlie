import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, ArrowRight, Pencil, WalletCards } from '../../icons'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatCurrency } from '../../services/currency/currencyFormatter'

gsap.registerPlugin(useGSAP)

const CARD_HEIGHT = 200
const CARD_STEP = 36

export default function AccountWallet({ rows, currency, busy, editing, onEdit, onArchive, onDelete }) {
  const { t, locale } = useLanguage()
  const [selectedId, setSelectedId] = useState(rows[0]?.id)
  const root = useRef(null)
  const initialized = useRef(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const active = Math.max(0, rows.findIndex(row => row.id === selectedId))
  const selected = rows[active]
  const signature = rows.map(row => row.id).join(':')
  useEffect(() => {
    if (root.current?.contains(document.activeElement) && document.activeElement.classList.contains('wallet-account-card')) {
      root.current.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true })
    }
  }, [active, signature])
  const money = (amount, code) => formatCurrency(amount, code, locale)
  useGSAP(() => {
    const cards = root.current.querySelectorAll('.wallet-account-card')
    cards.forEach((card, index) => {
      const slot = (index - active + rows.length) % rows.length
      gsap.to(card, { y: Math.min(slot, 4) * CARD_STEP, scale: 1 - Math.min(slot, 4) * .025,
        rotation: slot === 0 ? 0 : (slot % 2 ? -.7 : .7), autoAlpha: slot < 4 ? 1 : 0,
        duration: reduced || !initialized.current ? 0 : .42, ease: 'power3.out', overwrite: 'auto' })
    })
    initialized.current = true
    // Keep current transforms between selections so interrupted switches continue
    // from their visible positions. useGSAP reverts all scoped tweens on unmount.
  }, { scope: root, dependencies: [active, signature, reduced] })
  const move = direction => setSelectedId(rows[(active + direction + rows.length) % rows.length].id)
  if (!selected) return null
  return <div className="account-wallet" ref={root} style={{ '--wallet-card-height': `${CARD_HEIGHT}px` }}>
    <div className="wallet-cards-column">
      <div className="wallet-card-stack" style={{ height: CARD_HEIGHT + Math.min(rows.length - 1, 3) * CARD_STEP }} role="group" aria-label={t('moneyWallet')} onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) }
      }}>
        {rows.map((row, index) => {
          const slot = (index - active + rows.length) % rows.length
          return <button key={row.id} type="button" className={`wallet-account-card wallet-tone-${index % 4}`} aria-pressed={slot === 0}
            aria-label={t('moneySelectNamed', { name: row.name, amount: money(row.balance, row.currency) })}
            aria-hidden={slot >= 4} tabIndex={slot >= 4 ? -1 : 0} style={{ zIndex: rows.length - slot, transformOrigin: '50% 0%', transform: `translateY(${Math.min(index, 4) * CARD_STEP}px) scale(${1 - Math.min(index, 4) * .025})` }} onClick={() => setSelectedId(row.id)}>
            <span className="wallet-card-top"><span>{row.institution || t(`moneyType_${row.type}`)}</span><WalletCards size={24} aria-hidden="true" /></span>
            <span className="wallet-card-middle"><span>{t(row.isDebt ? 'moneyOwed' : 'moneyBalance')} · {row.currency}</span><strong>{money(row.balance, row.currency)}</strong></span>
            <span className="wallet-card-name">{row.name}</span>
          </button>
        })}
      </div>
      {rows.length > 1 && <div className="wallet-switcher"><button className="icon-button" onClick={() => move(-1)} aria-label={t('moneyPrevious')}><ArrowLeft size={18} /></button><span>{active + 1} / {rows.length}</span><button className="icon-button" onClick={() => move(1)} aria-label={t('moneyNext')}><ArrowRight size={18} /></button></div>}
    </div>
    <div className="wallet-info-column">
    <div className="wallet-account-detail" aria-live="polite" aria-atomic="true">
      <div className="wallet-detail-copy">
      <h3>{selected.name}</h3><p className="money-help">{t(`moneyType_${selected.type}`)}{!selected.include_in_total ? ` · ${t('moneyExcluded')}` : ''}</p>
      <div className="wallet-detail-meta">
      <p className="money-help">{t('moneyConfirmed', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.balance_updated_at)) })}</p>
      {selected.conversion && <p className="money-help">{t('moneyEstimate', { amount: money(selected.baseAmount, currency) })}<br />{selected.conversion.provider} · {selected.conversion.rate_date}</p>}
      {selected.currency !== currency && selected.balance > 0 && !selected.conversion && selected.include_in_total && <p className="money-error">{t('moneyRateMissing')}</p>}
      </div>
      {selected.note && <p className="money-help">{selected.note}</p>}
      </div>
      <div className="wallet-detail-actions"><button className="secondary" disabled={busy || editing} onClick={() => onEdit(selected)}><Pencil size={18} aria-hidden="true" />{t('moneyEdit')}</button><button className="money-text-button" disabled={busy || editing} onClick={() => onArchive(selected)}>{t('moneyArchive')}</button><button className="money-text-button money-delete-button" disabled={busy || editing} onClick={() => onDelete(selected)}>{t('moneyDelete')}</button></div>
    </div>
    </div>
  </div>
}
