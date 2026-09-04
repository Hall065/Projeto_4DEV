"use client"

import { pageSections } from "@/data/sections"
import { useSectionProgress } from "@/hooks/useSectionProgress"

export function SectionProgress() {
  const { progress, activeId, active, activeIndex, total } = useSectionProgress()

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent"
        aria-hidden
      >
        <div
          className="h-full origin-left bg-[var(--accent)] transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      {/* Sempre tema claro/sólido — contraste estável em qualquer seção */}
      <aside
        className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 text-[var(--ink)] lg:flex xl:right-6"
        aria-label="Progresso das seções"
      >
        <div className="pointer-events-auto mb-1 rounded-full bg-white px-3 py-1.5 mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] shadow-md ring-1 ring-[var(--line)]">
          {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>

        <nav className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-white p-2.5 shadow-md ring-1 ring-[var(--line)]">
          {pageSections.map((section) => {
            const isActive = section.id === activeId
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                data-cursor
                title={section.label}
                className="group flex items-center justify-end gap-2"
              >
                <span
                  className={`overflow-hidden whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition-all duration-300 ${
                    isActive
                      ? "max-w-[7rem] opacity-100"
                      : "max-w-0 opacity-0 group-hover:max-w-[7rem] group-hover:opacity-70"
                  }`}
                >
                  {section.label}
                </span>
                <span
                  className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "scale-125 bg-[var(--accent)] shadow-[0_0_0_3px_rgba(227,6,19,0.2)]"
                      : "bg-[var(--ink)]/25 group-hover:bg-[var(--ink)]/55"
                  }`}
                  aria-hidden
                />
                <span className="sr-only">
                  {section.label}
                  {isActive ? " (atual)" : ""}
                </span>
              </a>
            )
          })}
        </nav>

        <p className="pointer-events-none max-w-[8rem] rounded-lg bg-white/95 px-2 py-1 text-right text-[11px] font-medium leading-snug text-[var(--ink-soft)] shadow-sm ring-1 ring-[var(--line)]">
          {active.label}
        </p>
      </aside>
    </>
  )
}
