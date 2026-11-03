import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// The frame enters once per mount, not on route changes or data refreshes.
// Keep the charcoal rail stationary; Overview owns its own data crossfade.
export default function useAppEntrance() {
  const root = useRef(null)

  useGSAP(() => {
    if (!root.current) return
    const frame = root.current
    const canvas = frame.querySelector(':scope > .main-content, :scope > .loading-shell-canvas')
    const railContent = frame.querySelectorAll(':scope > .sidebar > div, :scope > .loading-shell-rail > *')
    const heading = canvas?.querySelector('.page-header, .loading-shell-heading')
    const media = gsap.matchMedia()

    media.add({
      always: '(min-width: 0px)',
      reduced: '(prefers-reduced-motion: reduce)',
    }, context => {
      const reduced = context.conditions.reduced
      const duration = reduced ? 0.12 : 0.42
      const targets = [...railContent, ...(canvas ? [canvas] : [])]
      if (targets.length) {
        gsap.fromTo(targets,
          { opacity: reduced ? 0.85 : 0.55 },
          { opacity: 1, duration, ease: 'power2.out', overwrite: 'auto', clearProps: 'opacity' },
        )
      }
      if (heading && !reduced) {
        gsap.fromTo(heading,
          { y: 8 },
          { y: 0, duration, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' },
        )
      }
    }, root)

    return () => media.revert()
  }, { scope: root })

  return root
}
