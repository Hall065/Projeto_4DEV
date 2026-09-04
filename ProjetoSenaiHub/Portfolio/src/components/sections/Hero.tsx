"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { heroStats, project } from "@/data/content"
import { pageSections } from "@/data/sections"
import { HeroOrbit } from "./HeroOrbit"

export function Hero() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } })

      tl.from(".hero-kicker", { y: 40, opacity: 0, duration: 0.8 })
        .from(".hero-line", { yPercent: 110, duration: 1.1, stagger: 0.12 }, "-=0.4")
        .from(".hero-sub", { y: 30, opacity: 0, duration: 0.8 }, "-=0.5")
        .from(".hero-widget", { y: 40, opacity: 0, duration: 0.7, stagger: 0.1 }, "-=0.45")

      gsap.to(".hero-glow", {
        scale: 1.15,
        opacity: 0.55,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="topo"
      ref={rootRef}
      className="topo-bg relative flex min-h-[100svh] flex-col justify-between overflow-hidden px-5 pb-10 pt-28 sm:px-8 lg:px-12"
    >
      <div className="hero-glow pointer-events-none absolute left-1/2 top-[38%] h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(227,6,19,0.18),transparent_70%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        <p className="hero-kicker mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          {project.semester} · Apresentação do projeto
        </p>

        <div className="mt-8 flex flex-1 flex-col justify-center lg:mt-4">
          {/* Título + órbita: título no meio do stacking (z-10); ícones atrás/frente via z-index dinâmico */}
          <div className="relative mx-auto w-full max-w-5xl text-center">
            {/* Sem isolate: ícones na frente (z>10) passam por cima do título (z-10) */}
            <div className="relative min-h-[min(62vw,500px)]">
              <HeroOrbit />

              <div className="relative z-10 flex flex-col items-center justify-center pt-[min(6vw,2rem)]">
                <div className="overflow-hidden">
                  <h1 className="hero-line display text-[clamp(3.5rem,14vw,10.5rem)] text-[var(--ink)]">
                    SENAI
                  </h1>
                </div>
                <div className="overflow-hidden">
                  <h1 className="hero-line display text-[clamp(3.5rem,14vw,10.5rem)] text-[var(--accent)]">
                    HUB
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-sub mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-[var(--ink-soft)] sm:mt-8 sm:text-lg">
            {project.description}
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="hero-widget hairline relative rounded-2xl bg-white/70 p-4 backdrop-blur sm:p-5"
            >
              {"pulse" in stat && stat.pulse ? (
                <span className="pulse-dot absolute right-4 top-4 h-2 w-2 rounded-full bg-[var(--accent)]" />
              ) : null}
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {stat.label}
              </p>
              <p className="mt-2 display text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{stat.detail}</p>
              <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] text-[var(--muted)]">
                {stat.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-8 flex w-full max-w-[1400px] items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        <span>Scroll para explorar</span>
        <span className="mono">
          01 / {String(pageSections.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  )
}
