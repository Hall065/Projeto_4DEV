"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { team } from "@/data/content"

gsap.registerPlugin(ScrollTrigger)

export function Team() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".team-card", {
        y: 60,
        opacity: 0,
        rotate: 2,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="equipe" ref={rootRef} className="section-pad bg-white">
      <div className="mx-auto max-w-[1100px]">
        <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          Equipe
        </p>
        <h2 className="mt-4 display text-[clamp(2.4rem,6vw,4.5rem)]">
          Quem construiu o Hub.
        </h2>
        <p className="mt-4 max-w-xl text-[var(--ink-soft)]">
          Disciplina de Desenvolvimento Back-End · entregas por sprints · Prof. Bruno Moraes.
          Três desenvolvedores, um produto integrado.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {team.map((member, i) => (
            <article
              key={member.name}
              className="team-card group hairline relative flex min-h-[20rem] flex-col overflow-hidden rounded-[1.5rem] bg-[var(--bg)] p-7"
              data-cursor
            >
              <div className="flex items-start justify-between">
                <span className="mono text-[11px] text-[var(--muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] ring-1 ring-[var(--line)]">
                  {member.role}
                </span>
              </div>
              <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--navy)] text-2xl font-bold text-white transition group-hover:scale-110 group-hover:bg-[var(--accent)]">
                {member.name
                  .split(" ")
                  .filter((_, idx, arr) => idx === 0 || idx === arr.length - 1)
                  .map((p) => p[0])
                  .join("")}
              </div>
              <h3 className="mt-6 display text-2xl leading-tight">{member.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">
                {member.focus}
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-4">
                {member.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[var(--muted)] ring-1 ring-[var(--line)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
