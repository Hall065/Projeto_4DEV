"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowUpRight } from "lucide-react"
import { ctaLinks } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function CTA() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cta-reveal", {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="cta" ref={rootRef} className="section-pad bg-[var(--navy)] text-white">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <p className="cta-reveal mono text-[11px] uppercase tracking-[0.28em] text-white/50">
            Próximo passo
          </p>
          <h2 className="cta-reveal mx-auto mt-5 max-w-4xl display text-[clamp(2.6rem,7vw,5.5rem)]">
            Explore o código. Apresente o produto.
          </h2>
          <p className="cta-reveal mx-auto mt-6 max-w-xl text-lg text-white/70">
            Repositório público do 4º semestre ADS — SENAI Hub / Projeto_4DEV. Escolha o canal:
            código, design ou planejamento.
          </p>
        </div>

        <div className="cta-reveal mt-12 grid gap-4 md:grid-cols-3">
          {ctaLinks.map((link) => (
            <a
              key={link.title}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              data-cursor
              className={`group flex min-h-[13rem] flex-col rounded-[1.5rem] border p-6 transition ${
                link.primary
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-white/15 bg-white/5 text-white hover:bg-white hover:border-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      link.primary
                        ? "text-white/70"
                        : "text-white/45 group-hover:text-[var(--muted)]"
                    }`}
                  >
                    {link.subtitle}
                  </p>
                  <h3
                    className={`mt-2 display text-3xl transition-colors ${
                      link.primary ? "text-white" : "text-white group-hover:text-[var(--ink)]"
                    }`}
                  >
                    {link.title}
                  </h3>
                </div>
                <ArrowUpRight
                  className={`h-5 w-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    link.primary
                      ? "text-white"
                      : "text-white/50 group-hover:text-[var(--ink)]"
                  }`}
                />
              </div>
              <p
                className={`mt-4 flex-1 text-sm leading-relaxed transition-colors ${
                  link.primary
                    ? "text-white/85"
                    : "text-white/65 group-hover:text-[var(--ink-soft)]"
                }`}
              >
                {link.body}
              </p>
              <span
                className={`mt-5 inline-flex text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  link.primary
                    ? "text-white"
                    : "text-white/80 group-hover:text-[var(--ink)]"
                }`}
              >
                Abrir {link.title}
              </span>
            </a>
          ))}
        </div>
      </div>

      <footer className="mx-auto mt-16 flex max-w-[1100px] flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
        <p>SENAI Hub Portfolio · {new Date().getFullYear()}</p>
        <p className="mono">Hall065 / Projeto_4DEV</p>
      </footer>
    </section>
  )
}
