import { BarChart3, Headphones, LayoutGrid, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FadeIn, StaggerChildren, MotionItem } from '../../motion'

export function LandingFeatures() {
  const { t } = useTranslation()

  const features = [
    {
      icon: LayoutGrid,
      title: t('landing.features.hubTitle'),
      description: t('landing.features.hubDesc'),
    },
    {
      icon: Headphones,
      title: t('landing.features.supportTitle'),
      description: t('landing.features.supportDesc'),
    },
    {
      icon: Shield,
      title: t('landing.features.securityTitle'),
      description: t('landing.features.securityDesc'),
    },
    {
      icon: BarChart3,
      title: t('landing.features.managementTitle'),
      description: t('landing.features.managementDesc'),
    },
  ]

  return (
    <section id="recursos" className="section-pad bg-white">
      <div className="mx-auto max-w-[1200px]">
        <FadeIn whenVisible tone="marketing" className="max-w-3xl">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            {t('landing.navFeatures')}
          </p>
          <h2 className="mt-4 display text-[clamp(2.4rem,6vw,4.5rem)] text-hub-navy">
            {t('landing.features.title')}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            {t('landing.features.subtitle')}
          </p>
        </FadeIn>

        <StaggerChildren
          whenVisible
          tone="marketing"
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.1}
        >
          {features.map(({ icon: Icon, title, description }) => (
            <MotionItem key={title} tone="marketing">
              <article className="feature-chip group hairline flex h-full flex-col rounded-[1.35rem] bg-[var(--bg)] p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hub-red/10 text-hub-red transition-[background,box-shadow,transform] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-hub-red/25 group-hover:shadow-[0_0_0_1px_rgba(227,6,19,0.45)]">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 display text-2xl text-hub-navy transition-colors duration-[350ms] group-hover:text-white">
                  {title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--ink-soft)] transition-colors duration-[350ms] group-hover:text-white/75">
                  {description}
                </p>
              </article>
            </MotionItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
