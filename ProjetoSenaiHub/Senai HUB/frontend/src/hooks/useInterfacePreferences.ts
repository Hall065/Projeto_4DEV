import { useCallback, useEffect, useState } from 'react'

const REDUCE_MOTION_KEY = 'senai_hub_reduce_motion'

/**
 * Default OFF — animations on unless the user opts in via Settings.
 * Only an explicit `'1'` enables reduce; missing/corrupt values stay off.
 */
function readReduceMotion(): boolean {
  try {
    return localStorage.getItem(REDUCE_MOTION_KEY) === '1'
  } catch {
    return false
  }
}

function applyReduceMotion(enabled: boolean) {
  document.documentElement.classList.toggle('reduce-motion-pref', enabled)
  document.documentElement.style.setProperty(
    'scroll-behavior',
    enabled ? 'auto' : '',
  )
}

export function useInterfacePreferences() {
  const [reduceMotion, setReduceMotionState] = useState(readReduceMotion)

  useEffect(() => {
    applyReduceMotion(reduceMotion)
  }, [reduceMotion])

  const setReduceMotion = useCallback((value: boolean) => {
    setReduceMotionState(value)
    try {
      localStorage.setItem(REDUCE_MOTION_KEY, value ? '1' : '0')
    } catch {
      /* ignore */
    }
    applyReduceMotion(value)
  }, [])

  return { reduceMotion, setReduceMotion }
}

applyReduceMotion(readReduceMotion())
