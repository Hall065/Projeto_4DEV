import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  duration,
  fadeTransition,
  marketingFadeTransition,
  slideOffset,
} from './tokens'
import { useMotionPreference } from './useMotionPreference'

type FadeInProps = {
  children: ReactNode
  className?: string
  /** Extra delay before enter (ignored when reduced-motion). */
  delay?: number
  /** Vertical offset in px (default: item slide / marketing travel). */
  y?: number
  /**
   * When true, animate when scrolled into view.
   * When false (default), animate on mount.
   */
  whenVisible?: boolean
  /**
   * With `whenVisible`: play only once, or re-trigger both ways.
   * Default: `true` for `ui`, `false` for `marketing` (Portfolio-style reverse).
   */
  once?: boolean
  /**
   * `ui` — short operational motion (default).
   * `marketing` — Portfolio-length reveal for landing sections.
   */
  tone?: 'ui' | 'marketing'
  /** Override duration in seconds. */
  durationSec?: number
}

/**
 * Lightweight fade + slide enter for sections / blocks.
 * Prefer this for page polish — do not wrap KPI card styling itself.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  y,
  whenVisible = false,
  once,
  tone = 'ui',
  durationSec,
}: FadeInProps) {
  // Marketing/landing: Settings only (same as Portfolio — OS reduce alone must not freeze reveals).
  const reduceMotion = useMotionPreference(tone === 'marketing' ? 'settings' : 'all')
  const marketing = tone === 'marketing'
  /** Marketing scrolls reverse on leave; UI dashboards stay once-only. */
  const playOnce = once ?? !marketing
  const offset = y ?? (marketing ? slideOffset.marketing : slideOffset.item)
  const base = marketing ? marketingFadeTransition : fadeTransition
  const transition = reduceMotion
    ? { duration: duration.instant }
    : {
        ...base,
        ...(durationSec != null ? { duration: durationSec } : null),
        delay,
      }

  if (whenVisible) {
    return (
      <motion.div
        className={className}
        initial={reduceMotion ? false : { opacity: 0, y: offset }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{
          once: playOnce,
          // Higher amount + modest inset margins cut edge thrashing on reverse scroll.
          amount: marketing ? 0.28 : 0.2,
          margin: marketing ? '-6% 0px -10% 0px' : '0px 0px -8% 0px',
        }}
        transition={transition}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
