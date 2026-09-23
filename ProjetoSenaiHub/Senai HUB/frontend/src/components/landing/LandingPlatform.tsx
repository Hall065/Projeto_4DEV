import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FadeIn, HoverLift, MotionItem, StaggerChildren } from '../../motion'
import {
  APP_BRAND_ASSETS,
  MODULE_BRAND_SLUGS,
  type AppBrandSlug,
} from '../../utils/appBrandAssets'
import { getApplicationCover } from '../../utils/applicationCovers'
import {
  PLATFORM_APP_CARD_CTA_CLASS,
  PlatformAppCard,
  PlatformAppCardCtaIcon,
} from '../hub/PlatformAppCard'
import { HubPreviewMockup } from './HubPreviewMockup'

const MODULE_DESC_KEYS: Record<AppBrandSlug, string> = {
  connect: 'landing.platform.connectDesc',
  grid: 'landing.platform.gridDesc',
  safe: 'landing.platform.safeDesc',
}

export function LandingPlatform() {
  const { t } = useTranslation()

  const benefits = [
    t('landing.platform.benefit1'),
    t('landing.platform.benefit2'),
    t('landing.platform.benefit3'),
    t('landing.platform.benefit4'),
  ]

  const openAppLabel = t('appCard.openApp')

  return (
    <section id="solucoes" className="relative section-pad bg-[var(--bg)] pb-4 sm:pb-8">
      {/* Soft handoff into #jornada full-bleed intro */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-hub-navy/25"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1200px]">
        <FadeIn whenVisible tone="marketing">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            {t('landing.navSolutions')}
          </p>
          <h2 className="mt-4 max-w-4xl display text-[clamp(2.4rem,6vw,4.5rem)] text-hub-navy">
            {t('landing.platform.title')}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            {t('landing.platform.body')}
          </p>
        </FadeIn>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <FadeIn whenVisible tone="marketing" className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
            <HubPreviewMockup />
          </FadeIn>

          <FadeIn whenVisible tone="marketing" delay={0.12}>
            <article className="rounded-[1.5rem] border border-hub-navy/[0.08] bg-white/70 p-8 shadow-[0_12px_40px_rgba(10,12,16,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl sm:p-10">
              <ul className="space-y-4">
                {benefits.map((item, i) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-[var(--ink-soft)] sm:text-base">
                    <span className="mono mt-0.5 shrink-0 text-[10px] text-hub-red">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex flex-1 items-center gap-3 leading-snug text-hub-navy">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hub-red text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <HoverLift>
                <Link
                  to="/login"
                  data-cursor
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-hub-red px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_28px_rgba(227,6,19,0.35)] transition hover:brightness-110"
                >
                  {t('landing.platform.exploreHub')}
                </Link>
              </HoverLift>
            </article>
          </FadeIn>
        </div>

        {/* Module cards — Connect / Grid / SAFE */}
        <StaggerChildren
          whenVisible
          tone="marketing"
          className="mt-16 grid items-stretch gap-6 sm:mt-20 lg:grid-cols-2"
          stagger={0.1}
        >
          {MODULE_BRAND_SLUGS.map((slug) => {
            const brand = APP_BRAND_ASSETS[slug]
            return (
              <MotionItem key={slug} tone="marketing" className="h-full min-w-0">
                <HoverLift className="h-full">
                  <PlatformAppCard
                    className="h-full"
                    slug={slug}
                    name={brand.name}
                    description={t(MODULE_DESC_KEYS[slug])}
                    cover={getApplicationCover(slug)}
                    cta={
                      <Link to="/login" data-cursor className={PLATFORM_APP_CARD_CTA_CLASS}>
                        {openAppLabel}
                        <PlatformAppCardCtaIcon />
                      </Link>
                    }
                  />
                </HoverLift>
              </MotionItem>
            )
          })}
        </StaggerChildren>
      </div>
    </section>
  )
}
