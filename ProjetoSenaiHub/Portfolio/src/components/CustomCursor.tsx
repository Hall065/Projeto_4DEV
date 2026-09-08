"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const xTo = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" })
    const yTo = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" })
    const rxTo = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" })
    const ryTo = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" })

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      rxTo(e.clientX)
      ryTo(e.clientY)
    }

    const onEnter = () => gsap.to(ring, { scale: 1.8, duration: 0.3 })
    const onLeave = () => gsap.to(ring, { scale: 1, duration: 0.3 })

    window.addEventListener("mousemove", onMove)
    document.querySelectorAll("a, button, [data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", onEnter)
      el.addEventListener("mouseleave", onLeave)
    })

    return () => {
      window.removeEventListener("mousemove", onMove)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="custom-cursor" />
      <div ref={ringRef} className="custom-cursor-ring" />
    </>
  )
}
