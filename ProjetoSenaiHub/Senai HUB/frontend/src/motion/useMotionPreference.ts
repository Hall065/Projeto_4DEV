import { useSyncExternalStore } from 'react'
import { useReducedMotion } from 'framer-motion'

function subscribeReducePref(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => {
    mq.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function readSettingsReduce(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('reduce-motion-pref')
}

/** Settings → “Reduzir animações” (html.reduce-motion-pref). */
export function isSettingsReduceMotion(): boolean {
  return readSettingsReduce()
}

/**
 * True when motion should be skipped.
 *
 * - Default (`mode: 'all'`): OS prefers-reduced-motion OR Settings toggle.
 * - `mode: 'settings'` (landing / decorative): only Settings — matches Portfolio,
 *   which never gates hero orbit / cursor / marketing reveals on the OS flag.
 *   Corporate Windows often leaves “Animation effects” off, which would otherwise
 *   freeze the Hub while Portfolio stays alive on the same machine.
 */
export function useMotionPreference(mode: 'all' | 'settings' = 'all'): boolean {
  const osReduce = useReducedMotion()
  const prefReduce = useSyncExternalStore(subscribeReducePref, readSettingsReduce, () => false)
  if (mode === 'settings') return prefReduce
  return Boolean(osReduce || prefReduce)
}
