"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { journey, outcomes, problems, project } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function Intro() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".intro-title span", {
        yPercent: 120,
        stagger: 0.08,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 75%",
        },
      })

      gsap.from(".intro-card", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".intro-grid",
          start: "top 80%",
        },
      })

      gsap.from(".journey-step", {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".journey-grid",
          start: "top 85%",
        },
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="intro" ref={rootRef} className="section-pad bg-[var(--bg)]">
      <div className="mx-auto max-w-[1200px]">
        <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          O desafio
        </p>
        <h2 className="intro-title mt-4 max-w-4xl display text-[clamp(2.4rem,6vw,5rem)]">
          {"Sistemas isolados geram atrito. O Hub une operação, academia e segurança."
            .split(" ")
            .map((word, i) => (
              <span key={`${word}-${i}`} className="mr-[0.28em] inline-block overflow-hidden align-bottom">
                <span className="inline-block">{word}</span>
              </span>
            ))}
        </h2>

        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
          {project.tagline}. Este portfólio apresenta cada camada do{" "}
          <strong className="text-[var(--ink)]">Projeto_4DEV</strong> — da autenticação aos
          módulos Connect, Grid e SAFE — com o mesmo nível de cuidado visual da experiência
          real.
        </p>

        <div className="intro-grid mt-14 grid gap-5 lg:grid-cols-2">
          <article className="intro-card hairline rounded-[1.5rem] bg-white p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <h3 className="display text-2xl text-[var(--accent)]">Problemas</h3>
              <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Antes
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
              Fragmentação operacional que o semestre identificou na unidade.
            </p>
            <ul className="mt-6 space-y-4">
              {problems.map((item, i) => (
                <li key={item} className="flex gap-3 text-[var(--ink-soft)]">
                  <span className="mono mt-0.5 shrink-0 text-[10px] text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="intro-card hairline rounded-[1.5rem] bg-[var(--navy)] p-7 text-white sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <h3 className="display text-2xl text-[var(--accent)]">Resultados</h3>
              <span className="mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                Depois
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              O que a plataforma entrega quando os módulos trabalham juntos.
            </p>
            <ul className="mt-6 space-y-4">
              {outcomes.map((item, i) => (
                <li key={item} className="flex gap-3 text-white/80">
                  <span className="mono mt-0.5 shrink-0 text-[10px] text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Jornada do usuário
              </p>
              <h3 className="mt-2 display text-2xl sm:text-3xl">Do login ao arquivo.</h3>
            </div>
          </div>

          <div className="journey-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((item) => (
              <article
                key={item.step}
                className="journey-step hairline relative overflow-hidden rounded-2xl bg-white p-5"
              >
                <span className="mono text-[11px] text-[var(--accent)]">{item.step}</span>
                <h4 className="mt-3 display text-xl leading-tight">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
