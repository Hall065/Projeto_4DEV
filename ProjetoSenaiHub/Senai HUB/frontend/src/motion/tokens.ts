import type { Transition } from 'framer-motion'

/** Shared duration tokens (seconds). Keep routine UI motion short. */
export const duration = {
  instant: 0,
  fast: 0.15,
  normal: 0.22,
  slow: 0.36,
  /** Marketing / landing scroll reveals (Portfolio-like). */
  marketing: 0.9,
} as const

/** Cubic-bezier easings tuned for soft operational UI motion. */
export const easing = {
  /** Soft ease-out — default for enter / page transitions */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Balanced in-out for hover / press */
  inOut: [0.45, 0, 0.55, 1] as [number, number, number, number],
  /** Subtle settle */
  soft: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Expressive landing / Portfolio-style */
  marketing: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

export const pageTransition: Transition = {
  duration: duration.normal,
  ease: easing.out,
}

export const fadeTransition: Transition = {
  duration: duration.normal,
  ease: easing.out,
}

export const marketingFadeTransition: Transition = {
  duration: duration.marketing,
  ease: easing.marketing,
}

export const hoverTransition: Transition = {
  duration: duration.fast,
  ease: easing.inOut,
}

/** Default vertical offset (px) for fade+slide enters. */
export const slideOffset = {
  page: 10,
  item: 12,
  hover: -2,
  /** Landing section travel — must be obvious on scroll */
  marketing: 48,
  marketingItem: 36,
} as const

/** Default stagger delay between children (seconds). */
export const staggerGap = 0.05
export const marketingStaggerGap = 0.1
