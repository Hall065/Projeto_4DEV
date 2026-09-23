import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionPreference } from '../../motion/useMotionPreference'

type AppLoaderProps = {
  onDone?: () => void
  brand?: string
  title?: string
  accentTitle?: string
  statusLabel?: string
  /**
   * Minimum time the count/bar stage stays visible before the wipe exit.
   * Always honored via Promise.all([waitFor, minDelay]) — instant asset
   * resolve must not skip the theatrical beat.
   */
  minDurationMs?: number
  waitFor?: () => Promise<void>
  compact?: boolean
  /** When false, renders inline (for Suspense fallbacks) instead of fixed overlay */
  overlay?: boolean
}

/**
 * Portfolio-style loader with count + progress bar.
 * Used for boot, route transitions, and Suspense fallbacks.
 */
export function AppLoader({
  onDone,
  brand = 'SENAI Hub',
  title = 'SENAI',
  accentTitle = 'HUB',
  statusLabel = 'Carregando experiência',
  minDurationMs = 2000,
  waitFor,
  compact = false,
  overlay = true,
}: AppLoaderProps) {
  const [count, setCount] = useState(0)
  const [exiting, setExiting] = useState(false)
  const reduceMotion = useMotionPreference()
  const doneRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const start = performance.now()

    const finish = async () => {
      if (cancelled || doneRef.current) return
      doneRef.current = true
      setCount(100)
      setExiting(true)
      // Wipe must stay readable even under reduced motion
      const exitMs = reduceMotion ? (overlay ? 280 : 120) : overlay ? 950 : 220
      await new Promise((r) => setTimeout(r, exitMs))
      if (!cancelled) onDone?.()
    }

    const run = async () => {
      const waitPromise = waitFor ? waitFor().catch(() => undefined) : Promise.resolve()

      // Reduced motion: shorter but still perceptible (no flash)
      const duration = reduceMotion
        ? Math.min(Math.max(Math.round(minDurationMs * 0.4), compact ? 450 : 700), compact ? 700 : 1100)
        : minDurationMs

      const minDelay = new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelled) {
            resolve()
            return
          }
          const elapsed = performance.now() - start
          const t = Math.min(1, elapsed / duration)
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
          setCount(Math.round(eased * 100))
          if (t >= 1) {
            resolve()
            return
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      })

      // Gate: assets may finish early; bar always runs full min duration
      await Promise.all([waitPromise, minDelay])
      await finish()
    }

    void run()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [minDurationMs, onDone, overlay, reduceMotion, waitFor, compact])

  const shell = (
    <motion.div
      className={`flex flex-col justify-between bg-hub-navy px-6 py-8 text-white sm:px-10 ${
        overlay ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-10 min-h-[40vh]'
      } ${compact ? 'py-6' : ''}`}
      aria-busy="true"
      aria-live="polite"
      initial={false}
      animate={
        exiting && overlay
          ? { y: '-100%', transition: { duration: reduceMotion ? 0.28 : 0.95, ease: [0.76, 0, 0.24, 1] } }
          : exiting
            ? { opacity: 0, transition: { duration: 0.2 } }
            : { y: 0, opacity: 1 }
      }
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
        <span className="font-mono">{brand}</span>
        <span className="font-mono">{String(count).padStart(3, '0')}</span>
      </div>

      <div className={`flex flex-col items-start ${compact ? 'gap-1' : 'gap-4'}`}>
        <div className="overflow-hidden">
          <motion.p
            className={`display ${compact ? 'text-[clamp(2.5rem,10vw,5rem)]' : 'text-[clamp(3rem,12vw,9rem)]'}`}
            initial={reduceMotion ? false : { y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          >
            {title}
          </motion.p>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className={`display text-hub-red ${compact ? 'text-[clamp(2.5rem,10vw,5rem)]' : 'text-[clamp(3rem,12vw,9rem)]'}`}
            initial={reduceMotion ? false : { y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
          >
            {accentTitle}
          </motion.p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-white/50">
          <span>{statusLabel}</span>
          <span className="font-mono">{count}%</span>
        </div>
        <div className="h-[2px] w-full overflow-hidden bg-white/15">
          <div
            className="h-full origin-left bg-hub-red"
            style={{ transform: `scaleX(${count / 100})` }}
          />
        </div>
      </div>
    </motion.div>
  )

  return shell
}
