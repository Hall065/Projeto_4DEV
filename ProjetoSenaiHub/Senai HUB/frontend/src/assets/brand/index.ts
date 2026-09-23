/**
 * Logos oficiais — padrão de arquivo por app:
 *   {slug}-logo-expanded.png   → sidebar expandida
 *   {slug}-logo-icon.png       → sidebar recolhida (fundo escuro)
 *   {slug}-logo-mark-light.png → chips/cards em fundo claro
 *   {slug}-logo-mark-dark.png  → chips/cards em fundo escuro
 *
 * Consumo via `utils/appBrandAssets.ts` (fonte única).
 * Regenerar ícones SAFE: `node scripts/sync-brand-assets.mjs`
 */

/** SENAI HUB */
export { default as hubLogoExpanded } from './hub-logo-expanded.png'
export { default as hubLogoIcon } from './hub-logo-icon.png'
export { default as hubLogoMarkLight } from './hub-logo-mark-light.png'
export { default as hubLogoMarkDark } from './hub-logo-mark-dark.png'

/** SENAI Connect */
export { default as connectLogoExpanded } from './connect-logo-expanded.png'
export { default as connectLogoIcon } from './connect-logo-icon.png'
export { default as connectLogoMarkLight } from './connect-logo-mark-light.png'
export { default as connectLogoMarkDark } from './connect-logo-mark-dark.png'

/** SENAI Grid */
export { default as gridLogoExpanded } from './grid-logo-expanded.png'
export { default as gridLogoIcon } from './grid-logo-icon.png'
export { default as gridLogoMarkLight } from './grid-logo-mark-light.png'
export { default as gridLogoMarkDark } from './grid-logo-mark-dark.png'

/** SENAI SAFE */
export { default as safeLogoExpanded } from './safe-logo-expanded.png'
export { default as safeLogoIcon } from './safe-logo-icon.png'
export { default as safeLogoMarkLight } from './safe-logo-mark-light.png'
export { default as safeLogoMarkDark } from './safe-logo-mark-dark.png'

/** Hero orbit glass chips (Portfolio parity) */
export { default as hubOrbitChip } from './orbit/hub-orbit.png'
export { default as connectOrbitChip } from './orbit/connect-orbit.png'
export { default as gridOrbitChip } from './orbit/grid-orbit.png'
export { default as safeOrbitChip } from './orbit/safe-orbit.png'

/** @deprecated Prefer hubLogoExpanded */
export { default as logoSenaiHub } from './hub-logo-expanded.png'
