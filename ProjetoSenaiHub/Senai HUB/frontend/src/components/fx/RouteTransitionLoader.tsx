import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppLoader } from './AppLoader'
import { getRouteWaitFor, isMapHeavyRoute } from '../../utils/preloadAssets'
import { shouldSkipRouteTransitionLoader } from '../../utils/navShell'
import { useMotionPreference } from '../../motion/useMotionPreference'

/**
 * Brief Portfolio-style wipe between routes.
 * Skipped for in-shell (sidebar) navigations inside Hub / Connect / Grid / SAFE.
 * Heavy routes (map / Three / planilhas) also wait for chunk + assets when shown.
 */
export function RouteTransitionLoader() {
  const location = useLocation()
  const reduceMotion = useMotionPreference()
  const [visible, setVisible] = useState(false)
  const [key, setKey] = useState(0)
  const [prevPath, setPrevPath] = useState(location.pathname)
  const [activePath, setActivePath] = useState(location.pathname)

  useEffect(() => {
    if (location.pathname === prevPath) return
    const from = prevPath
    const to = location.pathname
    setPrevPath(to)

    // Don't flash loader when arriving at marketing landing from itself
    if (to === '/' && from === '/') return

    // Sidebar / authenticated-shell nav: no theatrical wipe
    if (shouldSkipRouteTransitionLoader(from, to)) return

    setActivePath(to)
    setKey((k) => k + 1)
    setVisible(true)
  }, [location.pathname, prevPath])

  const waitFor = useMemo(() => getRouteWaitFor(activePath), [activePath])

  if (!visible) return null

  return (
    <AppLoader
      key={key}
      brand="SENAI Hub // Rota"
      statusLabel={
        isMapHeavyRoute(activePath)
          ? 'Preparando mapa e assets'
          : waitFor
            ? 'Preparando módulo'
            : 'Preparando tela'
      }
      minDurationMs={reduceMotion ? 480 : waitFor ? 1100 : 950}
      waitFor={waitFor}
      compact
      onDone={() => setVisible(false)}
    />
  )
}
