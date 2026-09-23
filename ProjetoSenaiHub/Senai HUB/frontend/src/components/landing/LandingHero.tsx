import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { LandingHeroOrbit } from './LandingHeroOrbit'
import { WordRise } from '../../motion/WordRise'
import { easing } from '../../motion/tokens'
import { useMotionPreference } from '../../motion/useMotionPreference'

const ease = easing.marketing

/** Portfolio Intro word stagger (0.08) / Hero line gap (~0.12). */
const WORD_STAGGER = 0.08
const TITLE_WORD_DURATION = 1
const LINE_STAGGER = 0.12

export function LandingHero() {
  const { t } = useTranslation()
  // Decorative landing motion: Settings only (Portfolio parity).
  const reduceMotion = useMotionPreference('settings')
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduceMotion || !glowRef.current) return
    let dir = 1
    let scale = 1
    let raf = 0
    const tick = () => {
      scale += 0.0012 * dir
      if (scale > 1.15) dir = -1
      if (scale < 1) dir = 1
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`
        glowRef.current.style.opacity = String(0.4 + (scale - 1) * 1.2)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduceMotion])

  const heroTitle = t('landing.heroTitle')
  const heroHighlight = t('landing.heroHighlight')
  const heroHeadlineWords =
    `${heroTitle} ${heroHighlight}`.trim().split(/\s+/).filter(Boolean).length
  // After SENAI (delay 0.15) + HUB (+0.12) settle overlap — headline starts mid-rise.
  const headlineDelay = 0.15 + LINE_STAGGER + 0.2
  const bodyDelay = headlineDelay + Math.max(0, heroHeadlineWords - 1) * WORD_STAGGER + 0.25
  const ctaDelay = bodyDelay + 0.2

  return (
    <section
      id="topo"
      className="topo-bg relative flex min-h-[100svh] flex-col justify-between overflow-hidden px-5 pb-10 pt-28 sm:px-8 lg:px-12"
    >
      <div
        ref={glowRef}
        className="hero-glow pointer-events-none absolute left-1/2 top-[38%] h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(227,6,19,0.18),transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        <motion.p
          className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]"
          initial={reduceMotion ? false : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.85, ease }}
        >
          {t('landing.platformTag')}
        </motion.p>

        <div className="mt-8 flex flex-1 flex-col justify-center lg:mt-4">
          <div className="relative mx-auto w-full max-w-5xl text-center">
            {/* Orbit stage sized so front chips stay above the copy block */}
            <div className="relative min-h-[min(58vw,460px)] pb-6">
              <LandingHeroOrbit />

              <div className="relative z-10 flex flex-col items-center justify-center pt-[min(6vw,2rem)]">
                {/* Word-rise clip per line — Portfolio Intro technique, Hero timing between lines */}
                <h1 className="display text-[clamp(3.5rem,14vw,10.5rem)] text-hub-navy">
                  <WordRise
                    text="SENAI"
                    delay={0.15}
                    stagger={LINE_STAGGER}
                    durationSec={TITLE_WORD_DURATION}
                    yPercent={110}
                  />
                </h1>
                <h1 className="display text-[clamp(3.5rem,14vw,10.5rem)] text-hub-red">
                  <WordRise
                    text="HUB"
                    delay={0.15 + LINE_STAGGER}
                    stagger={LINE_STAGGER}
                    durationSec={TITLE_WORD_DURATION}
                    yPercent={110}
                  />
                </h1>
              </div>
            </div>
          </div>

          <p className="relative z-20 mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-[var(--ink-soft)] sm:mt-12 sm:text-lg">
            <WordRise
              segments={[
                { text: heroTitle },
                { text: heroHighlight, className: 'font-semibold text-hub-navy' },
              ]}
              delay={headlineDelay}
              stagger={WORD_STAGGER}
              durationSec={TITLE_WORD_DURATION}
              yPercent={120}
            />
          </p>

          <motion.p
            className="relative z-20 mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-[var(--muted)] sm:text-base"
            initial={reduceMotion ? false : { y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease, delay: bodyDelay }}
          >
            {t('landing.heroBody')}
          </motion.p>

          <motion.div
            className="relative z-20 mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4"
            initial={reduceMotion ? false : { y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.75, ease, delay: ctaDelay }}
          >
            <Link
              to="/login"
              data-cursor
              className="inline-flex items-center justify-center rounded-full bg-hub-red px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(227,6,19,0.28)] transition hover:brightness-110"
            >
              {t('landing.ctaLogin')}
            </Link>
            <a
              href="#recursos"
              data-cursor
              className="cta-fill inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-hub-navy backdrop-blur"
            >
              <span>{t('landing.exploreFeatures')}</span>
            </a>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="relative z-10 mx-auto mt-8 flex w-full max-w-[1400px] items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: ctaDelay + 0.15 }}
      >
        <span>Scroll para explorar</span>
        <span className="mono">01 / 06</span>
      </motion.div>
    </section>
  )
}
