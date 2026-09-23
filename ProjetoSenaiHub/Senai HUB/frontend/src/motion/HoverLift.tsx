import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { hoverTransition, slideOffset } from './tokens'
import { useMotionPreference } from './useMotionPreference'

type HoverLiftProps = {
  children: ReactNode
  className?: string
  /** Disable lift / scale (useful when parent already handles hover). */
  disabled?: boolean
}

/**
 * Subtle lift + press scale for interactive surfaces (buttons, clickable tiles).
 * Do not wrap existing KPI cards that already own their hover styles.
 * Respects OS prefers-reduced-motion and Settings → Reduzir animações.
 */
export function HoverLift({ children, className, disabled = false }: HoverLiftProps) {
  const reduceMotion = useMotionPreference('all')
  const motionOff = reduceMotion || disabled

  return (
    <motion.div
      className={className}
      whileHover={motionOff ? undefined : { y: slideOffset.hover, scale: 1.01 }}
      whileTap={motionOff ? undefined : { scale: 0.985 }}
      transition={hoverTransition}
    >
      {children}
    </motion.div>
  )
}
