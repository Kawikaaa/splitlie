import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// FadeContent-inspired continuity, adapted for data readiness rather than scroll.
// One short crossfade; no blur, stagger, layout movement or artificial load delay.
export default function useOverviewReveal(loadState, scope) {
  const root = useRef(null)
  useGSAP(() => {
    if (loadState !== 'ready' || !root.current) return
    const page = root.current
    const header = page.querySelector(':scope > .page-header')
    const veil = page.querySelector(':scope > .overview-transition-skeleton')
    const content = [...page.children].filter(element => !element.matches('.page-header, .overview-transition-skeleton, .modal-backdrop'))
    if (!header || !veil || !content.length) return
    // Batch geometry reads once; only opacity changes during playback.
    const start = header.offsetTop + header.offsetHeight + parseFloat(getComputedStyle(page).rowGap || 0)
    const height = Math.max(0, page.offsetHeight - start)
    const media = gsap.matchMedia()
    media.add({ always: '(min-width: 0px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const reduced = context.conditions.reduced
      const duration = reduced ? 0.1 : 0.3
      gsap.set(veil, { display: 'block', top: start, height, opacity: reduced ? 0.3 : 1, willChange: 'opacity' })
      gsap.set(content, { opacity: reduced ? 0.85 : 0.35, willChange: 'opacity' })
      const sequence = gsap.timeline({ defaults: { ease: 'power2.out', overwrite: 'auto' } })
      sequence.to(veil, { opacity: 0, duration: reduced ? 0.08 : 0.2 }, 0)
      sequence.set(veil, { display: 'none', clearProps: 'opacity,willChange' }, reduced ? 0.08 : 0.2)
      sequence.to(content, { opacity: 1, duration, clearProps: 'opacity,willChange' }, 0)
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [loadState, scope], revertOnUpdate: true })
  return root
}
