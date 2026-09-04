"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { techStack } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function TechStack() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".stack-card", {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      })

      gsap.from(".stack-chip", {
        scale: 0.85,
        opacity: 0,
        stagger: 0.03,
        duration: 0.5,
        ease: "back.out(1.6)",
        scrollTrigger: { trigger: ".stack-grid", start: "top 75%" },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="stack" ref={rootRef} className="section-pad topo-bg">
      <div className="mx-auto max-w-[1200px]">
        <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          Tecnologia
        </p>
        <h2 className="mt-4 max-w-3xl display text-[clamp(2.4rem,6vw,4.5rem)]">
          Stack pensada para escala e clareza.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
          Cada camada tem um papel claro: interface tipada, API com permissões, extensões mobile/IA
          e processo de entrega documentado.
        </p>

        <div className="stack-grid mt-12 grid gap-5 md:grid-cols-2">
          {techStack.map((group) => (
            <article
              key={group.group}
              className="stack-card hairline flex min-h-[12rem] flex-col rounded-[1.5rem] bg-white/80 p-7 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="display text-2xl">{group.group}</h3>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {group.items.length} itens
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{group.blurb}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="stack-chip feature-chip rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                    data-cursor
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 hairline overflow-hidden rounded-[1.5rem] bg-[var(--ink)] p-8 text-white sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                Arquitetura
              </p>
              <h3 className="mt-3 display text-[clamp(1.8rem,4vw,3rem)]">
                Frontend SPA + API Laravel + extensões mobile e IA.
              </h3>
              <p className="mt-4 max-w-xl text-white/70">
                Rotas protegidas por módulo, permissões granulares, lazy loading de mapas e
                planilhas, e layouts dedicados para Hub, Connect, Grid e SAFE.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { path: "/hub", label: "aplicações & arquivo" },
                { path: "/connect", label: "academia" },
                { path: "/grid", label: "manutenção" },
                { path: "/safe", label: "autorizações" },
              ].map((route) => (
                <div
                  key={route.path}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="mono text-sm text-white/80">{route.path}</span>
                  <span className="text-xs text-white/45">{route.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
