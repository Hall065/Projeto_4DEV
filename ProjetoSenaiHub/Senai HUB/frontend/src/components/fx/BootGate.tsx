import { useCallback, useState, type ReactNode } from 'react'
import { AppLoader } from './AppLoader'
import { CustomCursor } from './CustomCursor'
import { RouteTransitionLoader } from './RouteTransitionLoader'
import { preloadBootAssets } from '../../utils/preloadAssets'

/**
 * Site-wide boot loader + custom cursor + route transition wipe.
 */
export function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const onDone = useCallback(() => setReady(true), [])

  return (
    <>
      {/* Cursor mounts immediately (Portfolio parity) — not gated on boot ready. */}
      <CustomCursor />
      {!ready && (
        <AppLoader
          brand="SENAI Hub // Boot"
          statusLabel="Carregando experiência"
          minDurationMs={2000}
          waitFor={preloadBootAssets}
          onDone={onDone}
        />
      )}
      {ready && (
        <>
          <RouteTransitionLoader />
          {children}
        </>
      )}
    </>
  )
}
