import { useEffect } from 'react'

// Keep the two custom listboxes on the same keyboard interaction model.
export default function useSelectKeyboard(rootRef, open, setOpen) {
  useEffect(() => {
    if (open) {
      const root = rootRef.current
      ;(root?.querySelector('[role="option"][aria-selected="true"]') || root?.querySelector('[role="option"]'))?.focus()
    }
  }, [open, rootRef])

  return function handleKeyDown(event) {
    const root = rootRef.current
    const trigger = root?.querySelector('[aria-haspopup="listbox"]')
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger?.focus()
      return
    }
    if (event.key === 'Tab') {
      if (open) trigger?.focus()
      setOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (!open) { setOpen(true); return }
    const options = [...root.querySelectorAll('[role="option"]')]
    if (!options.length) return
    const current = options.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
    options[next]?.focus()
  }
}
