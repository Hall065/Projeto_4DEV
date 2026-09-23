import i18n from '../i18n'
import { readCustomWallpaperImage } from '../utils/wallpaperImage'

export const CUSTOM_WALLPAPER_ID = 'custom' as const

export type PresetWallpaperId =
  | 'senai-classic'
  | 'senai-dawn'
  | 'senai-cool'
  | 'senai-warm'
  | 'senai-minimal'
  | 'senai-sunset'
  | 'senai-lavender'
  | 'senai-mint'
  | 'senai-dark-navy'
  | 'senai-dark-charcoal'
  | 'senai-dark-red'
  | 'senai-midnight'
  | 'senai-forest'
  | 'senai-ocean-deep'
  | 'senai-slate'
  | 'senai-neon'

export type WallpaperId = PresetWallpaperId | typeof CUSTOM_WALLPAPER_ID

export type WallpaperCategory = 'light' | 'dark' | 'vivid'

export interface WallpaperPreset {
  id: PresetWallpaperId
  nameKey: string
  descriptionKey: string
  category: WallpaperCategory
  baseColor: string
  mesh: string
  blobs: string[]
  /** Véu sobre o mesh (legibilidade dos painéis glass) */
  veil?: string
}

export type ResolvedWallpaper = {
  id: WallpaperId
  name: string
  description: string
  category: WallpaperCategory | 'custom'
  kind: 'preset' | 'image'
  baseColor: string
  mesh: string
  blobs: string[]
  veil: string
  imageUrl?: string
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'senai-dawn',
    nameKey: 'wallpapers.presets.senai-dawn.name',
    descriptionKey: 'wallpapers.presets.senai-dawn.description',
    category: 'light',
    baseColor: '#f2e6df',
    mesh: `
      radial-gradient(ellipse 85% 65% at 5% 20%, rgba(255, 178, 150, 0.55), transparent 55%),
      radial-gradient(ellipse 80% 60% at 95% 5%, rgba(168, 197, 255, 0.5), transparent 52%),
      radial-gradient(ellipse 70% 50% at 70% 85%, rgba(227, 6, 19, 0.12), transparent 50%),
      radial-gradient(ellipse 55% 45% at 40% 45%, rgba(255, 220, 200, 0.35), transparent 48%)
    `,
    blobs: [
      'absolute -left-20 top-0 h-[36rem] w-[36rem] rounded-full bg-[#ffb4a2]/45 blur-[95px]',
      'absolute right-[-6rem] top-[-4rem] h-[38rem] w-[38rem] rounded-full bg-[#a8c5ff]/42 blur-[100px]',
      'absolute bottom-[-6rem] left-[25%] h-96 w-96 rounded-full bg-[#e8b4ff]/25 blur-[80px]',
    ],
  },
  {
    id: 'senai-classic',
    nameKey: 'wallpapers.presets.senai-classic.name',
    descriptionKey: 'wallpapers.presets.senai-classic.description',
    category: 'light',
    baseColor: '#e8edf4',
    mesh: `
      radial-gradient(ellipse 90% 70% at 8% 15%, rgba(2, 26, 58, 0.22), transparent 55%),
      radial-gradient(ellipse 75% 60% at 92% 8%, rgba(227, 6, 19, 0.2), transparent 50%),
      radial-gradient(ellipse 65% 55% at 55% 95%, rgba(91, 141, 239, 0.28), transparent 52%),
      radial-gradient(ellipse 50% 45% at 30% 55%, rgba(168, 197, 255, 0.2), transparent 48%)
    `,
    blobs: [
      'absolute -left-32 -top-20 h-[32rem] w-[32rem] rounded-full bg-[#0a0c10]/28 blur-[90px]',
      'absolute -right-24 top-[12%] h-[34rem] w-[34rem] rounded-full bg-[#e30613]/22 blur-[100px]',
      'absolute bottom-[-8rem] left-[20%] h-[28rem] w-[28rem] rounded-full bg-[#7ba3f0]/30 blur-[85px]',
    ],
  },
  {
    id: 'senai-cool',
    nameKey: 'wallpapers.presets.senai-cool.name',
    descriptionKey: 'wallpapers.presets.senai-cool.description',
    category: 'light',
    baseColor: '#dce6f2',
    mesh: `
      radial-gradient(ellipse 90% 70% at 0% 0%, rgba(2, 26, 58, 0.35), transparent 55%),
      radial-gradient(ellipse 75% 65% at 100% 30%, rgba(74, 124, 201, 0.4), transparent 52%),
      radial-gradient(ellipse 60% 50% at 45% 100%, rgba(168, 197, 255, 0.32), transparent 50%)
    `,
    blobs: [
      'absolute left-[-8rem] top-[-6rem] h-[36rem] w-[36rem] rounded-full bg-[#0a0c10]/32 blur-[95px]',
      'absolute right-[-5rem] bottom-[-4rem] h-[30rem] w-[30rem] rounded-full bg-[#4a7cc9]/38 blur-[90px]',
    ],
  },
  {
    id: 'senai-warm',
    nameKey: 'wallpapers.presets.senai-warm.name',
    descriptionKey: 'wallpapers.presets.senai-warm.description',
    category: 'vivid',
    baseColor: '#f5ebe6',
    mesh: `
      radial-gradient(ellipse 80% 65% at 90% 10%, rgba(227, 6, 19, 0.38), transparent 52%),
      radial-gradient(ellipse 70% 55% at 10% 80%, rgba(245, 158, 11, 0.35), transparent 50%),
      radial-gradient(ellipse 65% 50% at 35% 25%, rgba(2, 26, 58, 0.18), transparent 48%)
    `,
    blobs: [
      'absolute -right-16 -top-16 h-[34rem] w-[34rem] rounded-full bg-[#e30613]/35 blur-[95px]',
      'absolute left-[-4rem] bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#f59e0b]/32 blur-[85px]',
    ],
  },
  {
    id: 'senai-minimal',
    nameKey: 'wallpapers.presets.senai-minimal.name',
    descriptionKey: 'wallpapers.presets.senai-minimal.description',
    category: 'light',
    baseColor: '#eef1f5',
    mesh: `
      radial-gradient(ellipse 70% 55% at 85% 15%, rgba(168, 197, 255, 0.28), transparent 50%),
      radial-gradient(ellipse 65% 50% at 15% 75%, rgba(227, 6, 19, 0.14), transparent 48%)
    `,
    blobs: [
      'absolute right-0 top-0 h-96 w-96 rounded-full bg-[#0a0c10]/18 blur-[80px]',
      'absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#e30613]/14 blur-[75px]',
    ],
  },
  {
    id: 'senai-sunset',
    nameKey: 'wallpapers.presets.senai-sunset.name',
    descriptionKey: 'wallpapers.presets.senai-sunset.description',
    category: 'vivid',
    baseColor: '#f8e8e0',
    mesh: `
      radial-gradient(ellipse 80% 60% at 10% 20%, rgba(251, 146, 60, 0.45), transparent 55%),
      radial-gradient(ellipse 75% 55% at 90% 15%, rgba(236, 72, 153, 0.35), transparent 52%),
      radial-gradient(ellipse 65% 50% at 50% 90%, rgba(99, 102, 241, 0.25), transparent 50%)
    `,
    blobs: [
      'absolute -left-16 top-0 h-[32rem] w-[32rem] rounded-full bg-[#fb923c]/40 blur-[90px]',
      'absolute right-0 top-[-2rem] h-[30rem] w-[30rem] rounded-full bg-[#ec4899]/35 blur-[85px]',
    ],
  },
  {
    id: 'senai-lavender',
    nameKey: 'wallpapers.presets.senai-lavender.name',
    descriptionKey: 'wallpapers.presets.senai-lavender.description',
    category: 'light',
    baseColor: '#ebe8f5',
    mesh: `
      radial-gradient(ellipse 75% 60% at 20% 10%, rgba(167, 139, 250, 0.4), transparent 52%),
      radial-gradient(ellipse 70% 55% at 85% 70%, rgba(196, 181, 253, 0.35), transparent 50%),
      radial-gradient(ellipse 55% 45% at 60% 40%, rgba(227, 6, 19, 0.08), transparent 48%)
    `,
    blobs: [
      'absolute left-[-6rem] top-[-4rem] h-[28rem] w-[28rem] rounded-full bg-[#a78bfa]/38 blur-[85px]',
      'absolute right-[-4rem] bottom-[-2rem] h-96 w-96 rounded-full bg-[#c4b5fd]/32 blur-[80px]',
    ],
  },
  {
    id: 'senai-mint',
    nameKey: 'wallpapers.presets.senai-mint.name',
    descriptionKey: 'wallpapers.presets.senai-mint.description',
    category: 'light',
    baseColor: '#e4f3ef',
    mesh: `
      radial-gradient(ellipse 80% 65% at 5% 80%, rgba(45, 212, 191, 0.38), transparent 52%),
      radial-gradient(ellipse 70% 55% at 95% 20%, rgba(56, 189, 248, 0.32), transparent 50%),
      radial-gradient(ellipse 60% 45% at 40% 30%, rgba(2, 26, 58, 0.1), transparent 48%)
    `,
    blobs: [
      'absolute bottom-[-4rem] left-[-2rem] h-[30rem] w-[30rem] rounded-full bg-[#2dd4bf]/35 blur-[90px]',
      'absolute right-[-3rem] top-[10%] h-80 w-80 rounded-full bg-[#38bdf8]/28 blur-[75px]',
    ],
  },
  {
    id: 'senai-dark-navy',
    nameKey: 'wallpapers.presets.senai-dark-navy.name',
    descriptionKey: 'wallpapers.presets.senai-dark-navy.description',
    category: 'dark',
    baseColor: '#060d18',
    mesh: `
      radial-gradient(ellipse 90% 70% at 15% 10%, rgba(2, 26, 58, 0.95), transparent 55%),
      radial-gradient(ellipse 75% 60% at 90% 20%, rgba(227, 6, 19, 0.35), transparent 52%),
      radial-gradient(ellipse 65% 55% at 50% 95%, rgba(74, 124, 201, 0.28), transparent 50%)
    `,
    blobs: [
      'absolute -left-24 top-0 h-[34rem] w-[34rem] rounded-full bg-[#0a0c10]/55 blur-[100px]',
      'absolute right-[-8rem] top-[5%] h-[32rem] w-[32rem] rounded-full bg-[#e30613]/25 blur-[95px]',
      'absolute bottom-[-6rem] left-[30%] h-96 w-96 rounded-full bg-[#1e3a5f]/45 blur-[85px]',
    ],
    veil: 'bg-gradient-to-b from-white/6 via-transparent to-black/25',
  },
  {
    id: 'senai-dark-charcoal',
    nameKey: 'wallpapers.presets.senai-dark-charcoal.name',
    descriptionKey: 'wallpapers.presets.senai-dark-charcoal.description',
    category: 'dark',
    baseColor: '#0c0e12',
    mesh: `
      radial-gradient(ellipse 85% 65% at 0% 0%, rgba(30, 35, 45, 0.9), transparent 55%),
      radial-gradient(ellipse 70% 55% at 100% 100%, rgba(55, 65, 81, 0.5), transparent 52%),
      radial-gradient(ellipse 55% 45% at 70% 25%, rgba(227, 6, 19, 0.15), transparent 48%)
    `,
    blobs: [
      'absolute left-[-10rem] top-[-8rem] h-[36rem] w-[36rem] rounded-full bg-[#1f2937]/50 blur-[100px]',
      'absolute right-[-6rem] bottom-[-4rem] h-[28rem] w-[28rem] rounded-full bg-[#374151]/40 blur-[90px]',
    ],
    veil: 'bg-gradient-to-b from-white/5 via-transparent to-black/30',
  },
  {
    id: 'senai-dark-red',
    nameKey: 'wallpapers.presets.senai-dark-red.name',
    descriptionKey: 'wallpapers.presets.senai-dark-red.description',
    category: 'dark',
    baseColor: '#12080a',
    mesh: `
      radial-gradient(ellipse 80% 65% at 85% 15%, rgba(227, 6, 19, 0.55), transparent 52%),
      radial-gradient(ellipse 70% 55% at 10% 70%, rgba(2, 26, 58, 0.65), transparent 50%),
      radial-gradient(ellipse 60% 50% at 45% 40%, rgba(180, 20, 30, 0.25), transparent 48%)
    `,
    blobs: [
      'absolute -right-12 -top-12 h-[34rem] w-[34rem] rounded-full bg-[#e30613]/40 blur-[100px]',
      'absolute left-[-8rem] bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#0a0c10]/45 blur-[90px]',
    ],
    veil: 'bg-gradient-to-b from-white/6 via-transparent to-black/28',
  },
  {
    id: 'senai-midnight',
    nameKey: 'wallpapers.presets.senai-midnight.name',
    descriptionKey: 'wallpapers.presets.senai-midnight.description',
    category: 'dark',
    baseColor: '#080612',
    mesh: `
      radial-gradient(ellipse 85% 70% at 20% 0%, rgba(49, 46, 129, 0.7), transparent 55%),
      radial-gradient(ellipse 75% 60% at 95% 60%, rgba(88, 28, 135, 0.45), transparent 52%),
      radial-gradient(ellipse 60% 50% at 40% 90%, rgba(30, 58, 138, 0.35), transparent 50%)
    `,
    blobs: [
      'absolute left-[-6rem] top-[-4rem] h-[32rem] w-[32rem] rounded-full bg-[#4338ca]/40 blur-[95px]',
      'absolute right-[-4rem] top-[20%] h-[28rem] w-[28rem] rounded-full bg-[#7c3aed]/35 blur-[85px]',
    ],
    veil: 'bg-gradient-to-b from-white/5 via-transparent to-black/30',
  },
  {
    id: 'senai-forest',
    nameKey: 'wallpapers.presets.senai-forest.name',
    descriptionKey: 'wallpapers.presets.senai-forest.description',
    category: 'dark',
    baseColor: '#061008',
    mesh: `
      radial-gradient(ellipse 80% 65% at 10% 80%, rgba(6, 78, 59, 0.75), transparent 52%),
      radial-gradient(ellipse 70% 55% at 90% 15%, rgba(2, 26, 58, 0.55), transparent 50%),
      radial-gradient(ellipse 55% 45% at 55% 45%, rgba(34, 197, 94, 0.18), transparent 48%)
    `,
    blobs: [
      'absolute bottom-[-6rem] left-[-4rem] h-[32rem] w-[32rem] rounded-full bg-[#065f46]/45 blur-[90px]',
      'absolute right-[-6rem] top-0 h-96 w-96 rounded-full bg-[#0a0c10]/40 blur-[85px]',
    ],
    veil: 'bg-gradient-to-b from-white/5 via-transparent to-black/28',
  },
  {
    id: 'senai-ocean-deep',
    nameKey: 'wallpapers.presets.senai-ocean-deep.name',
    descriptionKey: 'wallpapers.presets.senai-ocean-deep.description',
    category: 'dark',
    baseColor: '#051018',
    mesh: `
      radial-gradient(ellipse 85% 65% at 0% 50%, rgba(8, 47, 73, 0.85), transparent 55%),
      radial-gradient(ellipse 75% 60% at 100% 20%, rgba(14, 116, 144, 0.5), transparent 52%),
      radial-gradient(ellipse 60% 50% at 60% 90%, rgba(2, 26, 58, 0.4), transparent 50%)
    `,
    blobs: [
      'absolute left-[-10rem] top-[10%] h-[34rem] w-[34rem] rounded-full bg-[#0c4a6e]/50 blur-[95px]',
      'absolute right-[-5rem] bottom-[-2rem] h-[28rem] w-[28rem] rounded-full bg-[#0891b2]/30 blur-[85px]',
    ],
    veil: 'bg-gradient-to-b from-white/5 via-transparent to-black/30',
  },
  {
    id: 'senai-slate',
    nameKey: 'wallpapers.presets.senai-slate.name',
    descriptionKey: 'wallpapers.presets.senai-slate.description',
    category: 'dark',
    baseColor: '#0f1419',
    mesh: `
      radial-gradient(ellipse 90% 70% at 50% 0%, rgba(51, 65, 85, 0.55), transparent 55%),
      radial-gradient(ellipse 70% 55% at 0% 100%, rgba(30, 41, 59, 0.65), transparent 52%),
      radial-gradient(ellipse 55% 45% at 100% 40%, rgba(148, 163, 184, 0.12), transparent 48%)
    `,
    blobs: [
      'absolute top-[-8rem] left-[20%] h-[32rem] w-[32rem] rounded-full bg-[#334155]/45 blur-[95px]',
      'absolute bottom-[-4rem] right-[-2rem] h-96 w-96 rounded-full bg-[#475569]/35 blur-[80px]',
    ],
    veil: 'bg-gradient-to-b from-white/5 via-transparent to-black/28',
  },
  {
    id: 'senai-neon',
    nameKey: 'wallpapers.presets.senai-neon.name',
    descriptionKey: 'wallpapers.presets.senai-neon.description',
    category: 'vivid',
    baseColor: '#0a0c14',
    mesh: `
      radial-gradient(ellipse 75% 60% at 10% 20%, rgba(227, 6, 19, 0.5), transparent 52%),
      radial-gradient(ellipse 70% 55% at 90% 10%, rgba(56, 189, 248, 0.45), transparent 50%),
      radial-gradient(ellipse 65% 50% at 50% 90%, rgba(167, 139, 250, 0.4), transparent 48%)
    `,
    blobs: [
      'absolute -left-16 top-0 h-[32rem] w-[32rem] rounded-full bg-[#e30613]/35 blur-[100px]',
      'absolute -right-12 top-[5%] h-[30rem] w-[30rem] rounded-full bg-[#38bdf8]/35 blur-[95px]',
      'absolute bottom-[-4rem] left-[35%] h-80 w-80 rounded-full bg-[#a78bfa]/30 blur-[80px]',
    ],
    veil: 'bg-gradient-to-b from-white/6 via-transparent to-black/25',
  },
]

export const DEFAULT_WALLPAPER_ID: PresetWallpaperId = 'senai-dawn'

const DEFAULT_VEIL = 'bg-gradient-to-b from-white/8 via-transparent to-white/12'

const PRESET_MAP = new Map(WALLPAPER_PRESETS.map((p) => [p.id, p]))

export function isPresetWallpaperId(id: string): id is PresetWallpaperId {
  return PRESET_MAP.has(id as PresetWallpaperId)
}

export function isWallpaperId(id: string): id is WallpaperId {
  if (id === CUSTOM_WALLPAPER_ID) {
    return readCustomWallpaperImage() !== null
  }
  return isPresetWallpaperId(id)
}

export function getWallpaperPreset(id: string): WallpaperPreset {
  return PRESET_MAP.get(id as PresetWallpaperId) ?? WALLPAPER_PRESETS[0]
}

export function presetToResolved(preset: WallpaperPreset): ResolvedWallpaper {
  return {
    id: preset.id,
    name: i18n.t(preset.nameKey),
    description: i18n.t(preset.descriptionKey),
    category: preset.category,
    kind: 'preset',
    baseColor: preset.baseColor,
    mesh: preset.mesh,
    blobs: preset.blobs,
    veil: preset.veil ?? DEFAULT_VEIL,
  }
}

export function resolveWallpaper(id: WallpaperId, customImageUrl: string | null): ResolvedWallpaper {
  if (id === CUSTOM_WALLPAPER_ID && customImageUrl) {
    return {
      id: CUSTOM_WALLPAPER_ID,
      name: i18n.t('wallpapers.custom.name'),
      description: i18n.t('wallpapers.custom.description'),
      category: 'custom',
      kind: 'image',
      baseColor: '#0f172a',
      mesh: '',
      blobs: [],
      veil: 'bg-gradient-to-b from-black/35 via-black/15 to-black/45',
      imageUrl: customImageUrl,
    }
  }

  return presetToResolved(getWallpaperPreset(id))
}

export const WALLPAPER_GROUPS: { label: string; category: WallpaperCategory }[] = [
  { label: 'Claros', category: 'light' },
  { label: 'Escuros', category: 'dark' },
  { label: 'Coloridos', category: 'vivid' },
]
