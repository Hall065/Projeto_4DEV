"use client"

import { useCallback, useState } from "react"
import { SmoothScroll } from "@/components/SmoothScroll"
import { CustomCursor } from "@/components/CustomCursor"
import { Loader } from "@/components/Loader"
import { Nav } from "@/components/Nav"
import { SectionProgress } from "@/components/SectionProgress"
import { SectionProgressProvider } from "@/hooks/useSectionProgress"
import { Hero } from "@/components/sections/Hero"
import { Marquee } from "@/components/sections/Marquee"
import { Intro } from "@/components/sections/Intro"
import { ModulesHorizontal } from "@/components/sections/ModulesHorizontal"
import { MapShowcase } from "@/components/sections/MapShowcase"
import { Features } from "@/components/sections/Features"
import { TechStack } from "@/components/sections/TechStack"
import { Team } from "@/components/sections/Team"
import { CTA } from "@/components/sections/CTA"

export function PortfolioExperience() {
  const [ready, setReady] = useState(false)
  const onDone = useCallback(() => setReady(true), [])

  return (
    <>
      {!ready && <Loader onDone={onDone} />}
      {ready && (
        <>
          <CustomCursor />
          <SmoothScroll>
            <SectionProgressProvider>
              <Nav />
              <SectionProgress />
              <main>
                <Hero />
                <Marquee />
                <Intro />
                <ModulesHorizontal />
                <MapShowcase />
                <Features />
                <TechStack />
                <Team />
                <CTA />
              </main>
            </SectionProgressProvider>
          </SmoothScroll>
        </>
      )}
    </>
  )
}
