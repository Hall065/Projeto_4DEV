import { useAppearance } from '../../contexts/AppearanceContext'
import { getAppBrandAssets, getBrandMarkSrc } from '../../utils/appBrandAssets'
import type { WallpaperTone } from '../../utils/wallpaperTone'

type AppBrandMarkSize = 'sm' | 'md'

const boxSize: Record<AppBrandMarkSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
}

const imgSize: Record<AppBrandMarkSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
}

export function AppBrandMark({
  slug,
  name,
  size = 'md',
  className = '',
  /** Force mark-light / mark-dark (e.g. light cards ignore dark wallpaper). */
  tone,
}: {
  slug: string
  name: string
  size?: AppBrandMarkSize
  className?: string
  tone?: WallpaperTone
}) {
  const { wallpaperTone } = useAppearance()
  const assets = slug === 'hub' ? undefined : getAppBrandAssets(slug)
  const mark = getBrandMarkSrc(slug, tone ?? wallpaperTone)
  const displayName = slug === 'hub' ? 'SENAI HUB' : assets?.name ?? name

  if (!mark) {
    return (
      <span
        className={`app-brand-mark app-brand-mark-fallback flex ${boxSize[size]} shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-hub-navy ${className}`}
        aria-hidden
      >
        {displayName.charAt(0)}
      </span>
    )
  }

  return (
    <span className={`app-brand-mark flex ${boxSize[size]} shrink-0 items-center justify-center rounded-2xl ${className}`}>
      <img src={mark} alt={displayName} className={`${imgSize[size]} object-contain`} />
    </span>
  )
}
