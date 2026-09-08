"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { darkSections, pageSections, type PageSectionId } from "@/data/sections"

gsap.registerPlugin(ScrollTrigger)

type SectionProgressValue = {
  progress: number
  activeId: PageSectionId
  active: (typeof pageSections)[number]
  activeIndex: number
  total: number
  isDark: boolean
}

const SectionProgressContext = createContext<SectionProgressValue | null>(null)

export function SectionProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState<PageSectionId>("topo")
  const ratiosRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const pickActive = () => {
      let bestId: PageSectionId = "topo"
      let bestRatio = -1

      for (const section of pageSections) {
        const ratio = ratiosRef.current[section.id] ?? 0
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestId = section.id
        }
      }

      if (bestRatio <= 0) {
        const mid = window.innerHeight / 2
        let bestDist = Infinity
        for (const section of pageSections) {
          const el = document.getElementById(section.id)
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const center = (rect.top + rect.bottom) / 2
          const dist = Math.abs(center - mid)
          if (dist < bestDist) {
            bestDist = dist
            bestId = section.id
          }
        }
      }

      setActiveId((prev) => (prev === bestId ? prev : bestId))
    }

    const progressTrigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        setProgress(self.progress)
        pickActive()
      },
    })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratiosRef.current[entry.target.id] = entry.isIntersecting
            ? entry.intersectionRatio
            : 0
        }
        pickActive()
      },
      {
        threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1],
        rootMargin: "-42% 0px -42% 0px",
      },
    )

    const observeAll = () => {
      observer.disconnect()
      for (const section of pageSections) {
        const el = document.getElementById(section.id)
        if (el) observer.observe(el)
      }
      pickActive()
    }

    observeAll()

    const t = window.setTimeout(() => {
      ScrollTrigger.refresh()
      observeAll()
    }, 600)

    return () => {
      window.clearTimeout(t)
      observer.disconnect()
      progressTrigger.kill()
    }
  }, [])

  const value = useMemo(() => {
    const activeIndex = Math.max(
      0,
      pageSections.findIndex((section) => section.id === activeId),
    )
    const active = pageSections[activeIndex] ?? pageSections[0]

    return {
      progress,
      activeId,
      active,
      activeIndex,
      total: pageSections.length,
      isDark: darkSections.includes(activeId),
    }
  }, [progress, activeId])

  return (
    <SectionProgressContext.Provider value={value}>{children}</SectionProgressContext.Provider>
  )
}

export function useSectionProgress() {
  const ctx = useContext(SectionProgressContext)
  if (!ctx) {
    throw new Error("useSectionProgress must be used within SectionProgressProvider")
  }
  return ctx
}
