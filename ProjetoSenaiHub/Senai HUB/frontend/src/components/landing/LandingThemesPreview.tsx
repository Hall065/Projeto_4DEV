import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WALLPAPER_PRESETS } from '../../constants/wallpapers'
import { FadeIn } from '../../motion'

const PREVIEW_IDS = ['senai-dawn', 'senai-classic', 'senai-slate', 'senai-dark-navy'] as const

export function LandingThemesPreview() {
  const { t } = useTranslation()
  const presets = WALLPAPER_PRESETS.filter((preset) =>
    PREVIEW_IDS.includes(preset.id as (typeof PREVIEW_IDS)[number]),
  )

  return (
    <section className="section-pad border-y border-[var(--line)] bg-white">
      <div className="mx-auto max-w-[1200px]">
        <FadeIn whenVisible tone="marketing" className="max-w-3xl">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Temas</p>
          <h2 className="mt-4 display text-[clamp(2.2rem,5vw,3.75rem)] text-hub-navy">
            {t('landing.themesTitle')}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
            {t('landing.themesSubtitle')}
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((preset, i) => (
            <FadeIn key={preset.id} whenVisible tone="marketing" delay={i * 0.08}>
              <article className="hairline overflow-hidden rounded-[1.25rem] bg-[var(--bg)]">
                <div className="relative h-28">
                  <div className="absolute inset-0" style={{ backgroundColor: preset.baseColor }} />
                  <div
                    className="absolute inset-0"
                    style={{ background: preset.mesh.replace(/\s+/g, ' ').trim() }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-hub-navy">{t(preset.nameKey)}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{t(preset.descriptionKey)}</p>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          {t('landing.themesHint')}{' '}
          <Link to="/login" data-cursor className="font-medium text-hub-red hover:underline">
            {t('landing.themesCta')}
          </Link>
        </p>
      </div>
    </section>
  )
}
