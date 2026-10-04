import { useEffect, useRef } from 'react'

export default function MenuSurface({ children, onClose, ...props }) {
  const rootRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const root = rootRef.current
    root.querySelector('button:not(:disabled)')?.focus()
    function dismiss(event) {
      if (!root.parentElement.contains(event.target)) closeRef.current?.()
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  function handleKeyDown(event) {
    const root = rootRef.current
    const trigger = root.parentElement.querySelector('button[aria-expanded]')
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation() }
      trigger?.focus()
      closeRef.current?.()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...root.querySelectorAll('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }
  function restoreTrigger(event) {
    if (event.target.closest('button')) rootRef.current.parentElement.querySelector('button[aria-expanded]')?.focus()
  }
  return <div ref={rootRef} onKeyDown={handleKeyDown} onClickCapture={restoreTrigger} {...props}>{children}</div>
}
