import {
  APP_BRAND_ASSETS,
  HUB_BRAND_ASSETS,
  MODULE_BRAND_SLUGS,
} from './appBrandAssets'
import { prefetchCampusMap3DAssets } from './campusMapAssets'

/** Detects OS / site reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion-pref')
  )
}

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

/** Decode a single image URL into the browser cache. */
export function preloadImage(src: string, timeoutMs = 2000): Promise<void> {
  if (!src) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    img.onload = done
    img.onerror = done
    img.src = src
    if (img.complete) done()
    setTimeout(done, timeoutMs)
  })
}

export function preloadImages(srcs: string[], timeoutMs = 2000): Promise<void> {
  const unique = [...new Set(srcs.filter(Boolean))]
  if (!unique.length) return Promise.resolve()
  return Promise.all(unique.map((src) => preloadImage(src, timeoutMs))).then(() => undefined)
}

/** Wait for document fonts (Syne / Instrument Sans / JetBrains Mono). */
export function waitForFonts(timeoutMs = 800): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve()
  }
  return withTimeout(document.fonts.ready.then(() => undefined), timeoutMs, undefined)
}

/** Brand URLs needed for first paint: header logo + hero orbit marks. */
export function getCriticalBootImageUrls(): string[] {
  return [
    HUB_BRAND_ASSETS.expanded,
    HUB_BRAND_ASSETS.markLight,
    ...MODULE_BRAND_SLUGS.map((slug) => APP_BRAND_ASSETS[slug].markLight),
  ]
}

/** Boot gate: fonts + key landing brand images. */
export async function preloadBootAssets(): Promise<void> {
  const reduce = prefersReducedMotion()
  const imageTimeout = reduce ? 180 : 1400
  const fontTimeout = reduce ? 200 : 900

  await Promise.all([
    waitForFonts(fontTimeout),
    preloadImages(getCriticalBootImageUrls(), imageTimeout),
  ])
}

const MAP_ROUTE_RE = /^\/(grid\/mapa|connect\/localizacao)(\/|$)/

export function isMapHeavyRoute(pathname: string): boolean {
  return MAP_ROUTE_RE.test(pathname)
}

let gridMapPagePromise: Promise<typeof import('../pages/grid/GridTaskMapPage')> | null = null
let locationPagePromise: Promise<typeof import('../pages/connect/LocationPage')> | null = null
let spreadsheetPagePromise: Promise<typeof import('../pages/spreadsheet/SpreadsheetHubPage')> | null =
  null

/** Start / reuse lazy chunk fetch for Grid map page. */
export function preloadGridMapPage() {
  if (!gridMapPagePromise) {
    gridMapPagePromise = import('../pages/grid/GridTaskMapPage')
  }
  return gridMapPagePromise
}

/** Start / reuse lazy chunk fetch for Connect location page. */
export function preloadLocationPage() {
  if (!locationPagePromise) {
    locationPagePromise = import('../pages/connect/LocationPage')
  }
  return locationPagePromise
}

export function preloadSpreadsheetPage() {
  if (!spreadsheetPagePromise) {
    spreadsheetPagePromise = import('../pages/spreadsheet/SpreadsheetHubPage')
  }
  return spreadsheetPagePromise
}

/**
 * Wait until campus map GLB/Three chunk (and page module) are warm.
 * Caps under reduced motion so the wipe does not hang.
 */
export async function waitForMapRouteAssets(pathname: string): Promise<void> {
  const reduce = prefersReducedMotion()
  const capMs = reduce ? 280 : 12_000

  const pageImport = pathname.startsWith('/connect/localizacao')
    ? preloadLocationPage()
    : preloadGridMapPage()

  const work = Promise.all([
    prefetchCampusMap3DAssets().then(() => undefined),
    pageImport.then(() => undefined),
  ]).then(() => undefined)

  await withTimeout(work, capMs, undefined)
}

/** Route-level waitFor factory for AppLoader / transitions. */
export function getRouteWaitFor(pathname: string): (() => Promise<void>) | undefined {
  if (isMapHeavyRoute(pathname)) {
    return () => waitForMapRouteAssets(pathname)
  }

  if (pathname.includes('/planilhas')) {
    return async () => {
      const reduce = prefersReducedMotion()
      await withTimeout(preloadSpreadsheetPage().then(() => undefined), reduce ? 200 : 4000, undefined)
    }
  }

  return undefined
}
