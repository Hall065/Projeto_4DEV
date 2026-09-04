"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { project } from "@/data/content"
import { pageSections } from "@/data/sections"
import { useSectionProgress } from "@/hooks/useSectionProgress"

const navLinks = pageSections.filter((s) => s.navLabel)

export function Nav() {
  const navRef = useRef<HTMLElement>(null)
  const { activeId, progress, isDark } = useSectionProgress()
  const scrolled = progress > 0.02

  useEffect(() => {
    gsap.fromTo(
      navRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: "power3.out" },
    )
  }, [])

  const onDarkSurface = isDark && progress > 0.05

  return (
    <header
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? onDarkSurface
            ? "border-b border-white/10 bg-[var(--navy)]/80 text-white backdrop-blur-md"
            : "border-b border-[var(--line)] bg-[var(--bg)]/85 text-[var(--ink)] backdrop-blur-md"
          : "bg-transparent text-[var(--ink)]"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#topo" className="display text-lg tracking-tight sm:text-xl" data-cursor>
          SENAI HUB
        </a>

        <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.22em] md:flex">
          {navLinks.map((link) => {
            const isActive = activeId === link.id
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                data-cursor
                className={`relative transition ${
                  isActive ? "opacity-100" : "opacity-50 hover:opacity-100"
                }`}
              >
                {link.navLabel}
                <span
                  className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-[var(--accent)] transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </a>
            )
          })}
        </nav>

        <a
          href={project.repo}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(227,6,19,0.25)] transition hover:brightness-110"
          data-cursor
        >
          GitHub
        </a>
      </div>
    </header>
  )
}
