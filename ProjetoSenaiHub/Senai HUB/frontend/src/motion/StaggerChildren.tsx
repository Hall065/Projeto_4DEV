import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Transition } from 'framer-motion'
import {
  duration,
  easing,
  marketingStaggerGap,
  slideOffset,
  staggerGap,
} from './tokens'
import { useMotionPreference } from './useMotionPreference'

type StaggerChildrenProps = {
  children: ReactNode
  className?: string
  /** Delay between each child (seconds). */
  stagger?: number
  /** Delay before the first child starts. */
  delay?: number
  /**
   * When true, stagger starts when the group scrolls into view
   * (required for below-fold landing grids — otherwise they finish off-screen).
   */
  whenVisible?: boolean
  /**
   * With `whenVisible`: play only once, or re-trigger both ways.
   * Default: `true` for `ui`, `false` for `marketing` (Portfolio-style reverse).
   */
  once?: boolean
  tone?: 'ui' | 'marketing'
}

type MotionItemProps = {
  children: ReactNode
  className?: string
  tone?: 'ui' | 'marketing'
}

function itemTransition(reduceMotion: boolean | null, marketing: boolean): Transition {
  if (reduceMotion) return { duration: duration.instant }
  return {
    duration: marketing ? duration.marketing : duration.normal,
    ease: marketing ? easing.marketing : easing.out,
  }
}

/** Slightly snappier leave so reverse scroll doesn’t feel sticky. */
function itemExitTransition(reduceMotion: boolean | null, marketing: boolean): Transition {
  if (reduceMotion) return { duration: duration.instant }
  return {
    duration: marketing ? duration.slow : duration.fast,
    ease: marketing ? easing.marketing : easing.out,
  }
}

/**
 * Parent for staggered enter animations.
 * Pair with {@link MotionItem} children (or any child that uses the same variants).
 */
export function StaggerChildren({
  children,
  className,
  stagger,
  delay = 0,
  whenVisible = false,
  once,
  tone = 'ui',
}: StaggerChildrenProps) {
  const marketing = tone === 'marketing'
  const reduceMotion = useMotionPreference(marketing ? 'settings' : 'all')
  const gap = stagger ?? (marketing ? marketingStaggerGap : staggerGap)
  const playOnce = once ?? !marketing

  const variants = {
    hidden: {
      transition: {
        staggerChildren: reduceMotion ? 0 : gap,
        staggerDirection: -1 as const,
      },
    },
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : gap,
        delayChildren: reduceMotion ? 0 : delay,
      },
    },
  }

  if (whenVisible) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={{
          once: playOnce,
          amount: marketing ? 0.22 : 0.2,
          margin: marketing ? '-6% 0px -8% 0px' : '0px 0px -6% 0px',
        }}
        variants={variants}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div className={className} initial="hidden" animate="show" variants={variants}>
      {children}
    </motion.div>
  )
}

/**
 * Child of {@link StaggerChildren}. Fade + slight slide on stagger show.
 */
export function MotionItem({ children, className, tone = 'ui' }: MotionItemProps) {
  const marketing = tone === 'marketing'
  const reduceMotion = useMotionPreference(marketing ? 'settings' : 'all')
  const y = marketing ? slideOffset.marketingItem : slideOffset.item

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduceMotion
          ? { opacity: 1, y: 0 }
          : {
              opacity: 0,
              y,
              transition: itemExitTransition(reduceMotion, marketing),
            },
        show: {
          opacity: 1,
          y: 0,
          transition: itemTransition(reduceMotion, marketing),
        },
      }}
    >
      {children}
    </motion.div>
  )
}
