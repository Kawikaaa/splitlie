import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(Flip, CustomEase)
const arrive = CustomEase.create('public-navigation', '.22,1,.36,1')
const SHARED = '[data-public-shared]'

// Match real destination elements by data-flip-id: no snapshots, duplicated
// pages/forms, timer-delayed navigation or animation overlay.
export default function usePublicNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useRef(null)
  const animation = useRef(null)
  const epoch = useRef(0)

  const settle = () => {
    animation.current?.revert()
    animation.current = null
    delete document.documentElement.dataset.publicTransition
  }

  useEffect(() => {
    const cancel = () => { epoch.current += 1; pending.current = null; settle() }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    window.addEventListener('popstate', cancel)
    window.addEventListener('resize', cancel)
    preference.addEventListener('change', cancel)
    return () => {
      window.removeEventListener('popstate', cancel)
      window.removeEventListener('resize', cancel)
      preference.removeEventListener('change', cancel)
      cancel()
    }
  }, [])

  // BrowserRouter can schedule its commit. Measure after the destination's
  // real layout exists, without changing router configuration or routes.
  useLayoutEffect(() => {
    const request = pending.current
    if (!request || request.path !== location.pathname) return
    pending.current = null
    // Finish any outgoing feedback context before it gets detached.
    animation.current?.revert()
    animation.current = null
    const page = document.querySelector(request.direction === 'auth' ? '.auth-page' : '.lp-page')
    if (!page) { settle(); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const desktop = window.matchMedia('(min-width: 1001px)').matches
    const finish = () => {
      if (request.token !== epoch.current) return
      settle()
      const focused = document.activeElement
      if (focused === document.body || !focused?.isConnected) {
        page.querySelector(request.direction === 'auth' ? '.auth-card h1' : '#lp-title')?.focus({ preventScroll: true })
      }
    }
    try {
      // Scoped context, reverted on completion, resize, history, another CTA
      // or App unmount; no tween survives navigation.
      animation.current = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: arrive }, onComplete: finish })
        if (reduced || !desktop || !request.state) {
          tl.from(page, { opacity: reduced ? .75 : .5, y: reduced ? 0 : 8,
            duration: reduced ? .1 : .18, clearProps: 'opacity,transform' })
          return
        }
        // Only the empty background plane stretches. Text and the preview
        // keep a uniform scale despite their different line wraps/aspect ratios.
        const targets = [...page.querySelectorAll(SHARED)].filter(el => el.dataset.flipId !== 'public-plane' && el.dataset.flipId !== 'public-amount')
        const measured = targets.map(el => ({ el, rect: el.getBoundingClientRect(), style: getComputedStyle(el) }))
        tl.add(Flip.from(request.state, {
          targets: [page.querySelector('.public-brand-plane')], scale: true,
          duration: .5, ease: arrive, prune: true,
        }), request.direction === 'auth' ? .08 : .12)
        for (const { el, rect, style } of measured) {
          const before = request.geometry[el.dataset.flipId]
          if (!before || !rect.width) continue
          const fontRatio = before.fontSize / parseFloat(style.fontSize)
          const scale = Math.min(before.width / rect.width, fontRatio || 1)
          tl.fromTo(el, {
            x: before.left - rect.left, y: before.top - rect.top,
            scale, color: before.color, transformOrigin: '0 0',
          }, { x: 0, y: 0, scale: 1, color: style.color, duration: .5,
            clearProps: 'transform,transformOrigin,color',
          }, request.direction === 'auth' ? .08 : .12)
        }
        if (request.direction === 'auth') {
          tl.from(page.querySelectorAll('[data-auth-reveal]'), { opacity: 0, x: 32,
            duration: .2, stagger: .045, clearProps: 'opacity,transform' }, .3)
          tl.from(page.querySelectorAll('.auth-showcase-eyebrow,.auth-showcase-proof'), {
            opacity: 0, duration: .2, clearProps: 'opacity',
          }, .35)
        } else {
          tl.from(page.querySelectorAll('.lp-header-actions,.lp-hero-actions,.lp-preview figcaption'), {
            opacity: 0, duration: .2, clearProps: 'opacity',
          }, .35)
        }
      }, page)
    } catch {
      finish() // Motion is optional; navigation and content are not.
    }
  }, [location.pathname, location.key])

  return path => {
    settle()
    const token = ++epoch.current
    const desktop = window.matchMedia('(min-width: 1001px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let state = null
    const geometry = {}
    if (desktop && !reduced) {
      const source = document.querySelector('.lp-page,.auth-page')
      if (source) {
        for (const el of source.querySelectorAll(SHARED)) {
          const rect = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          geometry[el.dataset.flipId] = { left: rect.left, top: rect.top, width: rect.width,
            color: style.color, fontSize: parseFloat(style.fontSize) }
        }
        state = Flip.getState([source.querySelector('.public-brand-plane')], { props: 'backgroundColor,borderRadius' })
      }
    }
    const direction = path === '/welcome' ? 'home' : 'auth'
    pending.current = { path, state, geometry, direction, token }
    document.documentElement.dataset.publicTransition = direction
    const sourceForm = document.querySelector('.auth-card')
    if (direction === 'home' && sourceForm && !reduced) {
      animation.current = gsap.context(() => {
        gsap.to(sourceForm, { opacity: .5, x: 12, duration: .12 })
      }, sourceForm)
    }
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}
