import { useEffect, useRef } from 'react'
import {
  connectOrbitChip,
  gridOrbitChip,
  hubOrbitChip,
  safeOrbitChip,
} from '../../assets/brand'
import { isSettingsReduceMotion } from '../../motion/useMotionPreference'
import type { SidebarAppSlug } from '../../utils/appBrandAssets'

/**
 * Portfolio module order → diamond phases at angle 0:
 * hub (right) → connect (front/bottom) → grid (left) → safe (back/top).
 */
const ORBIT_MODULES: { slug: SidebarAppSlug; accent: string; src: string }[] = [
  { slug: 'hub', accent: '#00A9E0', src: hubOrbitChip },
  { slug: 'connect', accent: '#3DBE4A', src: connectOrbitChip },
  { slug: 'grid', accent: '#F7941D', src: gridOrbitChip },
  { slug: 'safe', accent: '#7B4FC7', src: safeOrbitChip },
]

/**
 * Portfolio-style 3D orbit of dark glass module chips around the hero title.
 * Driven only via rAF transforms (immune to CSS transition-duration kills).
 * Decorative motion ignores OS prefers-reduced-motion (Portfolio parity);
 * only Settings → “Reduzir animações” freezes the orbit.
 */
export function LandingHeroOrbit() {
  const stageRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])
  const angleRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const items = itemsRef.current.filter(Boolean) as HTMLDivElement[]
    if (!items.length) return

    // Match Portfolio: always orbit unless Hub Settings explicitly disables motion.
    const reduce = isSettingsReduceMotion()
    // Slightly faster than Portfolio 0.015 so motion is obvious within ~2s.
    const speed = reduce ? 0 : 0.02
    const phase = (Math.PI * 2) / items.length

    const measure = () => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      return {
        rx: Math.min(w * 0.48, 380),
        // Keep vertical radius inside the title stage so front chips don't cover copy.
        ry: Math.min(h * 0.4, 200),
      }
    }

    let { rx, ry } = measure()
    const onResize = () => {
      ;({ rx, ry } = measure())
    }
    window.addEventListener('resize', onResize)

    const place = (el: HTMLDivElement, i: number, angle: number) => {
      const a = angle + i * phase
      const depth = Math.sin(a)
      const x = Math.cos(a) * rx
      const y = depth * ry + 12
      const t = (depth + 1) / 2
      const scale = 0.55 + t * 0.55
      const opacity = 0.25 + t * 0.75
      const blur = (1 - t) * 1.2
      // Title sits at z-10 → back < 10, front > 10 (Portfolio stacking).
      const zIndex = depth > 0 ? 30 + Math.round(t * 10) : 1 + Math.round(t * 4)

      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`
      el.style.opacity = String(opacity)
      el.style.zIndex = String(zIndex)
      el.style.filter = blur > 0.25 ? `blur(${blur}px)` : 'none'
      el.dataset.depth = depth > 0.08 ? 'front' : depth < -0.08 ? 'back' : 'side'
    }

    if (reduce) {
      items.forEach((el, i) => place(el, i, 0))
      return () => window.removeEventListener('resize', onResize)
    }

    const tick = () => {
      angleRef.current += speed
      items.forEach((el, i) => place(el, i, angleRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }

    // First paint immediately so chips aren't stuck at opacity:0 for a frame.
    items.forEach((el, i) => place(el, i, angleRef.current))
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div
      ref={stageRef}
      className="hero-orbit-stage pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      {ORBIT_MODULES.map((mod, i) => (
        <div
          key={mod.slug}
          ref={(node) => {
            itemsRef.current[i] = node
          }}
          className="hero-orbit-item absolute left-1/2 top-1/2 flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-[1.3rem] will-change-transform sm:h-[6rem] sm:w-[6rem] sm:rounded-[1.5rem]"
          style={{
            opacity: 0,
            boxShadow: `0 16px 40px ${mod.accent}40`,
          }}
        >
          <img
            src={mod.src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}
