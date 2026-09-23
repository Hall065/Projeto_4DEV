import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ctaBanner } from '../../assets/landing'
import { FadeIn, HoverLift } from '../../motion'

export function LandingCta() {
  const { t } = useTranslation()

  return (
    <section id="beneficios" className="relative overflow-hidden section-pad bg-hub-navy text-white">
      {/* Atmosphere: red invite glow + soft tech wash */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[12%] h-[min(52vw,480px)] w-[min(78vw,720px)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(227,6,19,0.2),transparent_68%)] opacity-90" />
        <div className="absolute -right-[8%] bottom-[-12%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,169,224,0.1),transparent_62%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1100px]">
        <FadeIn whenVisible tone="marketing" className="text-center">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-hub-red/80">
            {t('landing.cta.eyebrow')}
          </p>
          <h2 className="mx-auto mt-5 max-w-4xl display text-[clamp(2.6rem,7vw,5.5rem)] text-balance">
            {t('landing.cta.title')}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            {t('landing.cta.body')}
          </p>
        </FadeIn>

        <FadeIn whenVisible tone="marketing" delay={0.12} className="mt-12">
          <div
            className="group relative min-h-[240px] overflow-hidden rounded-[1.5rem] border border-white/14 bg-cover bg-right bg-no-repeat shadow-[0_28px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(227,6,19,0.12)] ring-1 ring-white/10 transition-[border-color,box-shadow] duration-500 hover:border-hub-red/25 hover:shadow-[0_32px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(227,6,19,0.12)] sm:min-h-[300px]"
            style={{ backgroundImage: `url(${ctaBanner})` }}
          >
            {/* Depth washes — keep CTA readable, let illustration breathe */}
            <div className="absolute inset-0 bg-gradient-to-r from-hub-navy from-[38%] via-hub-navy/88 to-hub-navy/25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_55%,rgba(227,6,19,0.22),transparent_48%)] opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(227,6,19,0.28),transparent_70%)] blur-2xl" />

            <div className="relative z-10 flex h-full min-h-[240px] flex-col items-start justify-center gap-5 px-8 py-12 sm:min-h-[300px] sm:gap-6 sm:px-12">
              <p className="max-w-xs text-sm leading-relaxed text-white/55 sm:max-w-sm">
                {t('landing.cta.inviteLine')}
              </p>

              <HoverLift>
                <Link
                  to="/login"
                  data-cursor
                  className="inline-flex items-center justify-center rounded-full bg-hub-red px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_36px_rgba(227,6,19,0.45),0_0_0_1px_rgba(255,255,255,0.08)] transition hover:brightness-110"
                >
                  {t('landing.cta.accessPlatform')}
                </Link>
              </HoverLift>

              <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                {t('landing.cta.trust')}
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
