import { useState } from 'react'
import { LandingAudience } from '../components/landing/LandingAudience'
import { LandingCta } from '../components/landing/LandingCta'
import { LandingFeatures } from '../components/landing/LandingFeatures'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingHeader } from '../components/landing/LandingHeader'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingJourneyScroll } from '../components/landing/LandingJourneyScroll'
import { LandingMarquee } from '../components/landing/LandingMarquee'
import { LandingPlatform } from '../components/landing/LandingPlatform'
import { LandingThemesPreview } from '../components/landing/LandingThemesPreview'

export function LandingPage() {
  const [overJourney, setOverJourney] = useState(false)

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-[var(--bg)] text-hub-navy">
      <LandingHeader overJourney={overJourney} />
      <main className="relative z-0">
        <LandingHero />
        <LandingMarquee />
        <LandingPlatform />
        <LandingJourneyScroll onOverJourneyChange={setOverJourney} />
        <LandingThemesPreview />
        <LandingAudience />
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
