import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(useGSAP, SplitText, CustomEase)
const arrive = CustomEase.create('public-arrive', '0.22,1,0.36,1')

export function useLandingEntrance(language) {
  const root = useRef(null)
  useGSAP((_, contextSafe) => {
    // Shared-route motion owns these targets until it settles. Do not run a
    // competing entrance or recount during reverse navigation.
    if (document.documentElement.dataset.publicTransition) return
    const media = gsap.matchMedia()
    media.add({ always: '(min-width: 0px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const q = selector => root.current.querySelector(selector)
      if (context.conditions.reduced) {
        gsap.from([q('.lp-header'), q('.lp-hero')], { opacity: .7, duration: .12, clearProps: 'opacity' })
        return
      }
      const split = SplitText.create(q('#lp-title'), {
        type: 'lines', autoSplit: true, linesClass: 'lp-title-line',
        onSplit(self) {
          return gsap.from(self.lines, { opacity: 0, y: 22, stagger: .065, delay: .1, duration: .5, ease: arrive, clearProps: 'opacity,transform' })
        },
      })
      const afterTitle = .1 + .5 + Math.max(0, split.lines.length - 1) * .065
      const tl = gsap.timeline({ defaults: { ease: arrive } })
      const settle = { clearProps: 'opacity,transform' }
      tl.from(q('.lp-header'), { ...settle, opacity: 0, y: -8, duration: .4 }, 0)
        .from(q('.lp-intro'), { ...settle, opacity: 0, y: 12, duration: .36 }, afterTitle)
        .from(q('.lp-hero-actions'), { ...settle, opacity: 0, y: 12, duration: .36 }, afterTitle + .08)
      const number = q('[data-preview-amount]')
      let previewTimeline
      const revealPreview = contextSafe(() => {
        if (previewTimeline) return
        const value = { amount: 0 }
        previewTimeline = gsap.timeline({ defaults: { ease: arrive } })
          .from(q('.lp-preview'), { ...settle, opacity: 0, y: 26, scale: .985, duration: .6 }, 0)
          .from(root.current.querySelectorAll('.lp-ledger-row'), { ...settle, opacity: 0, x: 12, stagger: .07, duration: .35 }, .3)
          // Decorative sample only; screen readers retain the settled amount.
          .to(value, { amount: 631.93, duration: .72, onUpdate: () => { number.textContent = `$${value.amount.toFixed(2)}` } }, .12)
      })
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        revealPreview()
        observer.disconnect()
      }, { threshold: .15 })
      observer.observe(q('.lp-preview'))
      return () => {
        observer.disconnect()
        previewTimeline?.revert()
        split.revert()
        number.textContent = '$631.93'
      }
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [language], revertOnUpdate: true })
  return root
}

export function useAuthEntrance(language, mode) {
  const root = useRef(null)
  const lastMode = useRef(mode)
  useGSAP(() => {
    const changed = lastMode.current !== mode
    lastMode.current = mode
    if (document.documentElement.dataset.publicTransition) return
    const media = gsap.matchMedia()
    media.add({ always: '(min-width: 0px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const reduced = context.conditions.reduced
      const targets = changed
        ? root.current.querySelectorAll('.auth-form')
        : root.current.querySelectorAll('[data-auth-reveal]')
      gsap.from(targets, { opacity: 0, x: reduced ? 0 : changed ? 10 : 32,
        duration: reduced ? .12 : changed ? .25 : .35,
        stagger: reduced || changed ? 0 : .045, ease: arrive, clearProps: 'opacity,transform' })
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [language, mode], revertOnUpdate: true })
  return root
}
