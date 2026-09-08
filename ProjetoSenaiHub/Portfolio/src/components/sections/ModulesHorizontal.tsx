"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { modules } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function ModulesHorizontal() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add("(min-width: 900px)", () => {
        const getScroll = () => track.scrollWidth - window.innerWidth

        const tween = gsap.to(track, {
          x: () => -getScroll(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => `+=${getScroll()}`,
            invalidateOnRefresh: true,
          },
        })

        gsap.utils.toArray<HTMLElement>(".module-panel").forEach((panel) => {
          gsap.from(panel.querySelectorAll(".mod-reveal"), {
            y: 40,
            opacity: 0,
            stagger: 0.05,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tween,
              start: "left 70%",
              toggleActions: "play none none reverse",
            },
          })
        })
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section id="modulos" ref={sectionRef} className="relative overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute left-6 top-5 z-20 mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)] sm:left-10">
        Módulos · scroll horizontal
      </div>

      <div ref={trackRef} className="flex w-max flex-col md:flex-row">
        {modules.map((mod, modIndex) => (
          <article
            key={mod.id}
            className="module-panel relative flex flex-col justify-center px-5 py-20 sm:px-10 lg:px-14"
            style={{
              background: `linear-gradient(145deg, #ffffff 0%, ${mod.accent}12 45%, ${mod.accentSoft}0c 100%)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
              style={{ background: mod.accent }}
            />

            <div className="mx-auto grid w-full max-w-[1280px] gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-8">
              {/* Coluna visual: capa + identidade */}
              <div className="flex flex-col gap-4">
                <div className="mod-reveal relative overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_50px_rgba(10,12,16,0.1)] ring-1 ring-black/5">
                  <div className="relative aspect-[16/10] w-full sm:aspect-[16/9] lg:aspect-[5/3]">
                    <Image
                      src={mod.cover}
                      alt={`Capa ${mod.name}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      className="object-cover object-center"
                      priority={modIndex === 0}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, transparent 45%, ${mod.accentSoft}cc 100%)`,
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                      <div className="rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                        <Image
                          src={mod.logo}
                          alt={`Logo ${mod.name}`}
                          width={200}
                          height={64}
                          className="h-9 w-auto max-w-[160px] object-contain sm:h-11 sm:max-w-[200px]"
                        />
                      </div>
                      <span className="mono rounded-full bg-white/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] backdrop-blur">
                        {mod.route}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mod-reveal rounded-[1.25rem] bg-white/90 p-5 shadow-[0_10px_30px_rgba(10,12,16,0.05)] ring-1 ring-black/5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mono text-sm" style={{ color: mod.accentSoft }}>
                      {mod.label} · {mod.name}
                    </p>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white"
                      style={{ background: mod.accent }}
                    >
                      {mod.audience}
                    </span>
                  </div>
                  <p className="mt-3 display text-[clamp(1.7rem,3.4vw,2.5rem)]" style={{ color: mod.accent }}>
                    {mod.title}
                  </p>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
                    {mod.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mod.highlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          background: `${mod.accent}18`,
                          color: mod.accentSoft,
                          border: `1px solid ${mod.accent}35`,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna de capacidades */}
              <div className="mod-reveal flex flex-col rounded-[1.5rem] bg-white/95 p-4 shadow-[0_14px_40px_rgba(10,12,16,0.06)] ring-1 ring-black/5 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Capacidades
                  </p>
                  <span className="mono text-[10px]" style={{ color: mod.accent }}>
                    {String(mod.features.length).padStart(2, "0")} itens
                  </span>
                </div>

                <ul className="grid flex-1 gap-2 sm:grid-cols-2 sm:grid-rows-4">
                  {mod.features.map((feature, idx) => (
                    <li
                      key={feature}
                      className={`flex gap-3 rounded-xl bg-[var(--bg)] p-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${
                        idx === mod.features.length - 1 && mod.features.length % 2 === 1
                          ? "sm:col-span-2"
                          : ""
                      }`}
                      style={{ boxShadow: `inset 3px 0 0 ${mod.accent}` }}
                      data-cursor
                    >
                      <span
                        className="mono mt-0.5 shrink-0 text-[10px]"
                        style={{ color: mod.accent }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm font-medium leading-snug text-[var(--ink)]">{feature}</p>
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: `${mod.accent}12` }}
                >
                  <Image
                    src={mod.icon}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                  <p className="text-xs leading-snug text-[var(--ink-soft)]">
                    Capa oficial do módulo no SENAI Hub · visual do produto real
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
