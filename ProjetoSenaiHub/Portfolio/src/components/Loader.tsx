"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

export function Loader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const obj = { value: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(rootRef.current, {
          yPercent: -100,
          duration: 1.05,
          ease: "power4.inOut",
          onComplete: onDone,
        })
      },
    })

    tl.to(obj, {
      value: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => setCount(Math.round(obj.value)),
    })

    tl.to(
      ".loader-bar-fill",
      { scaleX: 1, duration: 1.6, ease: "power2.inOut" },
      0,
    )

    tl.to(".loader-word", {
      y: 0,
      opacity: 1,
      stagger: 0.08,
      duration: 0.6,
      ease: "power3.out",
    }, 0.2)

    return () => {
      tl.kill()
    }
  }, [onDone])

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-[var(--navy)] px-6 py-8 text-white sm:px-10"
      aria-hidden
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
        <span className="mono">SENAI Hub // Portfolio</span>
        <span className="mono">{String(count).padStart(3, "0")}</span>
      </div>

      <div className="flex flex-col items-start gap-4">
        <div className="overflow-hidden">
          <p className="loader-word display translate-y-full text-[clamp(3rem,12vw,9rem)] opacity-0">
            SENAI
          </p>
        </div>
        <div className="overflow-hidden">
          <p className="loader-word display translate-y-full text-[clamp(3rem,12vw,9rem)] text-[var(--accent)] opacity-0">
            HUB
          </p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-white/50">
          <span>Carregando experiência</span>
          <span className="mono">{count}%</span>
        </div>
        <div className="h-[2px] w-full overflow-hidden bg-white/15">
          <div className="loader-bar-fill h-full origin-left scale-x-0 bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  )
}
