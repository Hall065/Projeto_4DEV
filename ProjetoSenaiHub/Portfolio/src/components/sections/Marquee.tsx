"use client"

import { marqueeItems } from "@/data/content"

export function Marquee() {
  const loop = [...marqueeItems, ...marqueeItems]

  return (
    <section className="overflow-hidden border-y border-[var(--line)] bg-[var(--ink)] py-4 text-white">
      <div className="marquee-track">
        {loop.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-6 whitespace-nowrap">
            <span className="display text-2xl sm:text-3xl">{item}</span>
            <span className="text-[var(--accent)]">●</span>
          </span>
        ))}
      </div>
    </section>
  )
}
