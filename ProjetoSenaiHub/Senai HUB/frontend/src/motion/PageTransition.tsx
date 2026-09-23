import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { duration, pageTransition, slideOffset } from './tokens'

/**
 * Default route outlet enter/exit — subtle fade + slide.
 * Drop-in replacement for `<Outlet />` inside shared layouts.
 * Honors `prefers-reduced-motion` (near-instant / no motion).
 */
export function PageTransition() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="w-full min-w-0"
        initial={reduceMotion ? false : { opacity: 0, y: slideOffset.page }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduceMotion
            ? { opacity: 1, y: 0, transition: { duration: duration.instant } }
            : { opacity: 0, y: -slideOffset.page * 0.6, transition: pageTransition }
        }
        transition={reduceMotion ? { duration: duration.instant } : pageTransition}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
