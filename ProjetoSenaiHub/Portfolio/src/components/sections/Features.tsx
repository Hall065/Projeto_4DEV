"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { audience, extras, modules } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function Features() {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feat-head", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const allFeatures = modules.flatMap((m) =>
    m.features.map((f) => ({ module: m.name, accent: m.accent, text: f })),
  )

  const activeMod = modules[active]

  return (
    <section id="recursos" ref={rootRef} className="section-pad bg-white">
      <div className="mx-auto max-w-[1200px]">
        <div className="feat-head max-w-3xl">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            Funcionalidades
          </p>
          <h2 className="mt-4 display text-[clamp(2.4rem,6vw,4.5rem)]">
            Tudo o que o SENAI Hub entrega — em detalhe.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            Filtre por módulo para ver o inventário real de telas e fluxos — o mesmo mapa de
            capacidades usado na apresentação do semestre.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-2">
          {modules.map((m, i) => (
            <button
              key={m.id}
              type="button"
              data-cursor
              onClick={() => setActive(i)}
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                background: active === i ? m.accent : `${m.accent}12`,
                color: active === i ? "#fff" : m.accentSoft,
                border: `1px solid ${active === i ? m.accent : `${m.accent}40`}`,
              }}
            >
              <Image src={m.icon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              {m.name}
            </button>
          ))}
        </div>

        <div
          className="mt-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:items-center"
          style={{ background: `${activeMod.accent}10` }}
        >
          <Image
            src={activeMod.logo}
            alt={activeMod.name}
            width={220}
            height={56}
            className="h-12 w-auto max-w-[220px] object-contain"
          />
          <div>
            <p className="text-sm font-medium" style={{ color: activeMod.accentSoft }}>
              {activeMod.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{activeMod.summary}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeMod.features.map((feature, idx) => (
            <div
              key={feature}
              className="feature-chip flex min-h-[7.5rem] flex-col justify-between rounded-2xl bg-[var(--bg)] p-5"
              style={{ boxShadow: `inset 3px 0 0 ${activeMod.accent}` }}
              data-cursor
            >
              <span className="mono text-[10px]" style={{ color: activeMod.accent }}>
                {activeMod.name} · {String(idx + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-base font-medium leading-snug">{feature}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Extensões
              </p>
              <h3 className="mt-2 display text-3xl">Camadas extras</h3>
            </div>
            <p className="max-w-sm text-sm text-[var(--ink-soft)]">
              Além dos quatro módulos: mapa, IA, mobile, planilhas e arquivo.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((item) => (
              <article
                key={item.id}
                className="group hairline relative flex min-h-[11rem] flex-col overflow-hidden rounded-[1.5rem] bg-[var(--navy)] p-6 text-white"
                data-cursor
              >
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--accent)] opacity-20 transition group-hover:scale-150" />
                <p className="mono relative text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Extensão
                </p>
                <h4 className="relative mt-3 display text-2xl leading-tight">{item.title}</h4>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-white/75">
                  {item.body}
                </p>
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/55"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Personas
              </p>
              <h3 className="mt-2 display text-3xl">Para quem é</h3>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((item) => (
              <article
                key={item.title}
                className="hairline flex min-h-[14rem] flex-col rounded-2xl bg-[var(--bg)] p-5"
                data-cursor
              >
                <h4 className="display text-xl text-[var(--accent)]">{item.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
                <ul className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2 text-xs text-[var(--muted)]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-12 mono text-center text-[11px] text-[var(--muted)]">
          {allFeatures.length} capacidades documentadas neste portfólio
        </p>
      </div>
    </section>
  )
}
