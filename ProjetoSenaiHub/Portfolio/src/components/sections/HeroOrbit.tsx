"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { modules } from "@/data/content"

/**
 * Órbita 3D ao redor do título.
 * Ícones na frente (depth+) passam NA FRENTE do texto (z alto) e mais embaixo.
 * Ícones atrás passam atrás do texto e mais em cima.
 */
export function HeroOrbit() {
  const stageRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const items = itemsRef.current.filter(Boolean) as HTMLDivElement[]
    if (!items.length) return

    let angle = 0
    const speed = 0.015
    const phase = (Math.PI * 2) / items.length

    const measure = () => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      return {
        // mais largo → ícones passam pelos lados da logo
        rx: Math.min(w * 0.48, 380),
        // curva vertical forte → frente bem embaixo, atrás bem em cima
        ry: Math.min(h * 0.48, 240),
      }
    }

    let { rx, ry } = measure()

    const onResize = () => {
      ;({ rx, ry } = measure())
    }
    window.addEventListener("resize", onResize)

    gsap.fromTo(
      items,
      { opacity: 0, scale: 0.4 },
      { opacity: 0.95, scale: 1, duration: 1.2, stagger: 0.1, ease: "power3.out", delay: 0.6 },
    )

    const tick = () => {
      angle += speed

      items.forEach((el, i) => {
        const a = angle + i * phase
        const depth = Math.sin(a) // + frente / − atrás
        const x = Math.cos(a) * rx
        // frente mais baixo; atrás mais alto (+ leve offset pra limpar o miolo da logo)
        const y = depth * ry + 12

        const t = (depth + 1) / 2
        const scale = 0.55 + t * 0.55
        const opacity = 0.25 + t * 0.75
        const blur = (1 - t) * 1.2

        // título fica em z-10 → atrás < 10, frente > 10
        const zIndex = depth > 0 ? 30 + Math.round(t * 10) : 1 + Math.round(t * 4)

        el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`
        el.style.opacity = String(opacity)
        el.style.zIndex = String(zIndex)
        el.style.filter = blur > 0.25 ? `blur(${blur}px)` : "none"
        el.dataset.depth = depth > 0.08 ? "front" : depth < -0.08 ? "back" : "side"
      })
    }

    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div
      ref={stageRef}
      className="hero-orbit-stage pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      {modules.map((mod, i) => (
        <div
          key={mod.id}
          ref={(node) => {
            itemsRef.current[i] = node
          }}
          className="hero-orbit-item absolute left-1/2 top-1/2 flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-[1.3rem] will-change-transform sm:h-[6rem] sm:w-[6rem] sm:rounded-[1.5rem]"
          style={{
            opacity: 0,
            boxShadow: `0 16px 40px ${mod.accent}40`,
          }}
        >
          <Image
            src={`/logos/${mod.id}/orbit.png`}
            alt={mod.name}
            width={120}
            height={120}
            className="h-full w-full object-cover"
            draggable={false}
            priority={i < 2}
          />
        </div>
      ))}
    </div>
  )
}
