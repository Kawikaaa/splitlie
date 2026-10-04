import { motion, useMotionValue, useSpring } from 'framer-motion'

const spring = { stiffness: 220, damping: 22, mass: 0.45 }

export default function MagneticButton({ children, className = '', ...props }) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, spring)
  const y = useSpring(rawY, spring)

  function handlePointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    rawX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 5)
    rawY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 5)
  }

  function resetPosition() {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <motion.button
      className={className}
      style={{ x, y }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPosition}
      {...props}
    >
      {children}
    </motion.button>
  )
}
