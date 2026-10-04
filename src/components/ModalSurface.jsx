import { useEffect, useRef } from 'react'

const modalStack = []
let originalOverflow = ''
let originalPaddingRight = ''
const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export default function ModalSurface({ as: Element = 'section', onClose, busy = false, children, ...props }) {
  const surfaceRef = useRef(null)
  const latest = useRef({ onClose, busy })
  latest.current = { onClose, busy }

  useEffect(() => {
    const surface = surfaceRef.current
    const previousFocus = document.activeElement
    if (modalStack.length === 0) {
      originalOverflow = document.body.style.overflow
      originalPaddingRight = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`
      document.body.style.overflow = 'hidden'
    }
    modalStack.push(surface)
    const controls = () => [...surface.querySelectorAll(focusableSelector)]
      .filter(element => element.getClientRects().length && !element.closest('[hidden], [inert]'))
    if (!surface.contains(document.activeElement)) (controls()[0] || surface).focus()

    function handleKeyDown(event) {
      if (modalStack.at(-1) !== surface) return
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault()
        event.stopPropagation()
        latest.current.onClose?.()
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items.at(-1)
      if (!first) { event.preventDefault(); surface.focus(); return }
      const outside = !surface.contains(document.activeElement) || document.activeElement === surface
      if (event.shiftKey && (outside || document.activeElement === first)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (outside || document.activeElement === last)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const index = modalStack.indexOf(surface)
      if (index !== -1) modalStack.splice(index, 1)
      if (!modalStack.length) {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
      const top = modalStack.at(-1)
      if (previousFocus?.isConnected && (!top || top.contains(previousFocus))) previousFocus.focus()
      else if (top) (top.querySelector(focusableSelector) || top).focus()
    }
  }, [])

  return <Element ref={surfaceRef} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={busy} {...props}>{children}</Element>
}
