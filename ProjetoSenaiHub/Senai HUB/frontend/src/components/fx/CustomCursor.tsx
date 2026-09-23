import { useEffect, useRef } from 'react'
import { isSettingsReduceMotion } from '../../motion/useMotionPreference'

const INTERACTIVE =
  'a, button, input, textarea, select, [data-cursor], [data-clickable="true"]'

/**
 * Vector custom cursor (SVG red dot + lagging ring).
 * Dual-tone strokes stay readable on light and dark surfaces.
 * Disabled on coarse pointers. Lag stops only when Settings → reduce motion
 * is on (OS prefers-reduced-motion alone does not kill ring lag).
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100, scale: 1 })
  const target = useRef({ x: -100, y: -100, scale: 1 })
  const raf = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    document.body.classList.add('has-custom-cursor')

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }

    const setHover = (on: boolean) => {
      target.current.scale = on ? 1.75 : 1
    }

    const onOver = (e: Event) => {
      const el = e.target
      if (el instanceof Element && el.closest(INTERACTIVE)) setHover(true)
    }

    const onOut = (e: Event) => {
      const el = e.target
      if (!(el instanceof Element) || !el.closest(INTERACTIVE)) return
      const next = (e as MouseEvent).relatedTarget
      if (next instanceof Element && next.closest(INTERACTIVE)) return
      setHover(false)
    }

    const tick = () => {
      const reduce = isSettingsReduceMotion()
      const p = pos.current
      const t = target.current
      // Portfolio-ish lag: fast dot, slower ring.
      const easeDot = reduce ? 1 : 0.35
      const easeRing = reduce ? 1 : 0.12
      const easeScale = reduce ? 1 : 0.18

      p.x += (t.x - p.x) * easeDot
      p.y += (t.y - p.y) * easeDot
      p.rx += (t.x - p.rx) * easeRing
      p.ry += (t.y - p.ry) * easeRing
      p.scale += (t.scale - p.scale) * easeScale

      const dot = dotRef.current
      const ring = ringRef.current
      if (dot) {
        dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`
      }
      if (ring) {
        ring.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0) translate(-50%, -50%) scale(${p.scale})`
      }

      raf.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    raf.current = requestAnimationFrame(tick)

    return () => {
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="custom-cursor" aria-hidden>
        <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="geometricPrecision">
          {/* Outer ink hairline — readable on light hero */}
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="rgba(10,12,16,0.4)" strokeWidth="1" />
          {/* SENAI red + white stroke — readable on dark journey / CTA */}
          <circle cx="8" cy="8" r="5" fill="currentColor" stroke="#fff" strokeWidth="1.5" />
        </svg>
      </div>
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden>
        <svg viewBox="0 0 48 48" width="48" height="48" shapeRendering="geometricPrecision">
          <circle cx="24" cy="24" r="21.5" fill="none" stroke="rgba(10,12,16,0.4)" strokeWidth="1" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" />
        </svg>
      </div>
    </>
  )
}
