import { useEffect, useState } from 'react'

export default function useAnimatedNumber(value, { start = 0, duration = 1200, delay = 0, enabled = true } = {}) {
  const target = Number(value) || 0
  const initial = Number(start) || 0
  const [displayValue, setDisplayValue] = useState(enabled ? initial : target)

  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target)
      return undefined
    }

    let frameId = 0
    let startTime = null
    setDisplayValue(initial)

    function animate(timestamp) {
      if (startTime == null) startTime = timestamp
      const elapsed = timestamp - startTime - delay
      if (elapsed < 0) {
        frameId = window.requestAnimationFrame(animate)
        return
      }

      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 5)
      setDisplayValue(initial + (target - initial) * eased)

      if (progress < 1) frameId = window.requestAnimationFrame(animate)
      else setDisplayValue(target)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [delay, duration, enabled, initial, target])

  return displayValue
}
