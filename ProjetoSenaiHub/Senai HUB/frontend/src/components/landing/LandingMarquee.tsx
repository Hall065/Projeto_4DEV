import { useTranslation } from 'react-i18next'
import { FadeIn } from '../../motion'
import { useMotionPreference } from '../../motion/useMotionPreference'

const MARQUEE = [
  'Hub',
  'Connect',
  'Grid',
  'SAFE',
  'Um login',
  'Educação profissional',
  'RBAC',
  'Mapa 3D',
]

export function LandingMarquee() {
  const { t } = useTranslation()
  // Decorative ticker: Settings only — OS prefers-reduced-motion must not freeze it (Portfolio parity).
  const reduceMotion = useMotionPreference('settings')
  const items = [
    ...MARQUEE,
    t('landing.highlightLearn'),
    t('landing.highlightAllInOne'),
    t('landing.highlightSafe'),
  ]
  const loop = [...items, ...items]

  return (
    <FadeIn whenVisible tone="marketing" y={24} durationSec={0.7}>
      <section className="overflow-hidden border-y border-[var(--line)] bg-hub-navy py-4 text-white" aria-hidden>
        <div className={`marquee-track${reduceMotion ? ' is-paused' : ''}`}>
          {loop.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-6 whitespace-nowrap">
              <span className="display text-2xl sm:text-3xl">{item}</span>
              <span className="text-hub-red">●</span>
            </span>
          ))}
        </div>
      </section>
    </FadeIn>
  )
}
