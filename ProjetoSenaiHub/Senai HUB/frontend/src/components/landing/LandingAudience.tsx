import { useTranslation } from 'react-i18next'
import { audienceAdmin, audienceStudent, audienceTeacher } from '../../assets/landing'
import { FadeIn, StaggerChildren, MotionItem } from '../../motion'

export function LandingAudience() {
  const { t } = useTranslation()

  const audiences = [
    {
      image: audienceStudent,
      title: t('landing.audience.studentsTitle'),
      description: t('landing.audience.studentsDesc'),
    },
    {
      image: audienceTeacher,
      title: t('landing.audience.teachersTitle'),
      description: t('landing.audience.teachersDesc'),
    },
    {
      image: audienceAdmin,
      title: t('landing.audience.adminTitle'),
      description: t('landing.audience.adminDesc'),
    },
  ]

  return (
    <section id="para-quem" className="section-pad bg-[var(--bg)]">
      <div className="mx-auto max-w-[1200px]">
        <FadeIn whenVisible tone="marketing" className="max-w-3xl">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            {t('landing.navAudience')}
          </p>
          <h2 className="mt-4 display text-[clamp(2.4rem,6vw,4.5rem)] text-hub-navy">
            {t('landing.audience.title')}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            {t('landing.audience.subtitle')}
          </p>
        </FadeIn>

        <StaggerChildren whenVisible tone="marketing" className="mt-14 grid gap-6 md:grid-cols-3" stagger={0.12}>
          {audiences.map((item) => (
            <MotionItem key={item.title} tone="marketing">
              <article className="hairline group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white transition-shadow hover:shadow-[0_20px_50px_rgba(10,12,16,0.08)]">
                <div className="flex h-64 items-end justify-center bg-[var(--bg)] px-3 pt-4 sm:h-72">
                  <img
                    src={item.image}
                    alt=""
                    className="h-[92%] w-auto max-w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.03] sm:h-[95%]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="display text-2xl text-hub-navy">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {item.description}
                  </p>
                  <a
                    href="#recursos"
                    data-cursor
                    className="mt-4 inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-hub-red transition hover:brightness-110"
                  >
                    {t('landing.audience.learnMore')}
                  </a>
                </div>
              </article>
            </MotionItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
