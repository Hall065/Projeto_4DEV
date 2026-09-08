"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CAMPUS_BLOCKS, MAP_HIGHLIGHTS } from "@/data/campus"

gsap.registerPlugin(ScrollTrigger)

const CampusMap3D = dynamic(
  () => import("@/components/map/CampusMap3D").then((m) => m.CampusMap3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(72vh,640px)] w-full items-center justify-center rounded-[1.5rem] bg-[#e8edf5]">
        <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Preparando mapa 3D…
        </p>
      </div>
    ),
  },
)

export function MapShowcase() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".map-reveal", {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="mapa" ref={rootRef} className="section-pad bg-[var(--navy)] text-white">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="map-reveal mono text-[11px] uppercase tracking-[0.28em] text-white/50">
              Carro-chefe · diferencial técnico
            </p>
            <h2 className="map-reveal mt-4 display text-[clamp(2.4rem,5.5vw,4.2rem)]">
              Mapa 3D do campus.
            </h2>
            <p className="map-reveal mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              O campus SENAI modelado em Blender e renderizado com Three.js — o mesmo visualizador
              usado no Connect (localização) e no Grid (mapa de tarefas). Quatro blocos em GLB,
              navegação livre e seleção interativa.
            </p>
          </div>

          <ul className="map-reveal grid gap-3 sm:grid-cols-2">
            {MAP_HIGHLIGHTS.map((item, i) => (
              <li
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80"
              >
                <span className="mono text-[10px] text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 leading-snug">{item}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="map-reveal mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPUS_BLOCKS.map((block) => (
            <article
              key={block.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: block.accent }}
                >
                  {block.id}
                </span>
                <h3 className="display text-lg">{block.name}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/55">{block.blurb}</p>
            </article>
          ))}
        </div>

        <div className="map-reveal mt-8">
          <CampusMap3D />
        </div>

        <p className="map-reveal mt-4 mono text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
          Interativo · Three.js + OrbitControls · modelos reais do Projeto_4DEV
        </p>
      </div>
    </section>
  )
}
