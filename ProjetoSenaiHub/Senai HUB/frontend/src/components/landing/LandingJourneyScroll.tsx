import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  APP_BRAND_ASSETS,
  HUB_BRAND_ASSETS,
  type SidebarAppSlug,
} from '../../utils/appBrandAssets'
import {
  journeyConnectClassroom,
  journeyConnectStudents,
  journeyGridWorkshop,
  journeyHubCampus,
  journeyHubLobby,
  journeyIntroDawn,
  journeySafeEntrance,
} from '../../assets/landing/journey'
import { useMotionPreference } from '../../motion/useMotionPreference'

gsap.registerPlugin(ScrollTrigger)

type JourneyPanel = {
  id: string
  slug: SidebarAppSlug
  chapter: string
  moment: string
  time: string
  title: string
  body: string
  beats: string[]
  accent: string
  accentSoft: string
  cover: string
  coverAlt: string
  secondary?: string
  secondaryAlt?: string
}

const JOURNEY: JourneyPanel[] = [
  {
    id: 'hub',
    slug: 'hub',
    chapter: '01',
    moment: 'Portal',
    time: '07:40',
    title: 'Um login. Toda a jornada.',
    body: 'O dia começa no Hub: SSO, temas e os apps liberados para o seu perfil — sem caça a senhas nem abas perdidas.',
    beats: ['SSO / um login', 'Apps por perfil', 'Temas & i18n', 'Arquivo histórico'],
    accent: '#00A9E0',
    accentSoft: '#004B93',
    cover: journeyHubCampus,
    coverAlt: 'Campus educacional ao amanhecer — entrada do portal Hub',
    secondary: journeyHubLobby,
    secondaryAlt: 'Lobby moderno — sensação de portal único',
  },
  {
    id: 'connect',
    slug: 'connect',
    chapter: '02',
    moment: 'Sala',
    time: '09:15',
    title: 'Academia em movimento.',
    body: 'Turmas, frequência e calendário no Connect — o ritmo acadêmico do campus, do chamado à chamada.',
    beats: ['Turmas & cursos', 'Frequência', 'Calendário', 'Contratos'],
    accent: '#3DBE4A',
    accentSoft: '#1E4FA3',
    cover: journeyConnectClassroom,
    coverAlt: 'Sala de aula com professor e alunos',
    secondary: journeyConnectStudents,
    secondaryAlt: 'Estudantes colaborando em grupo',
  },
  {
    id: 'grid',
    slug: 'grid',
    chapter: '03',
    moment: 'Campus',
    time: '13:20',
    title: 'O prédio também estuda.',
    body: 'Tickets, estoque e mapa de intervenção no Grid: manutenção predial que acompanha o fluxo real da unidade.',
    beats: ['Chamados', 'Estoque', 'Mapa de tarefas', 'Relatórios'],
    accent: '#F7941D',
    accentSoft: '#0057A8',
    cover: journeyGridWorkshop,
    coverAlt: 'Oficina técnica e manutenção em campus',
  },
  {
    id: 'safe',
    slug: 'safe',
    chapter: '04',
    moment: 'Portaria',
    time: '17:05',
    title: 'Entrar e sair com clareza.',
    body: 'Protocolo AQV no SAFE: solicitação, aprovação do professor e confirmação na portaria — com histórico completo.',
    beats: ['Protocolo AQV', 'Fila professor', 'Portaria', 'Histórico'],
    accent: '#7B4FC7',
    accentSoft: '#3A3F48',
    cover: journeySafeEntrance,
    coverAlt: 'Entrada de unidade escolar — portaria e acesso',
  },
]

const CHAPTER_DOTS = [
  { id: 'intro', label: 'Início' },
  ...JOURNEY.map((p) => ({ id: p.id, label: p.moment })),
  { id: 'outro', label: 'Fim' },
]

function brandFor(slug: SidebarAppSlug) {
  return slug === 'hub' ? HUB_BRAND_ASSETS : APP_BRAND_ASSETS[slug]
}

/**
 * Soft enter/exit holds as shares of the *pinned scrub*.
 * Slightly longer than the snappy 0.24/0.16 so seams breathe with the slower pin.
 */
const INTRO_HOLD_RATIO = 0.26
const OUTRO_HOLD_RATIO = 0.18
/** Previous intro-only hold baked into the old pin-end formula. */
const PREV_INTRO_HOLD_RATIO = 0.28
/**
 * Whole pin travel ≈ 1/4 of the original `travel / (1 - 0.28)`.
 * ~3× the prior 1/12 — panels readable while scrubbing, without the old “too long” extreme.
 */
const PIN_DISTANCE_SCALE = 1 / 4

type LandingJourneyScrollProps = {
  /** Notifies landing header when the journey pin / section is the active surface. */
  onOverJourneyChange?: (active: boolean) => void
}

/**
 * Portfolio-style pin + scrub horizontal strip — full-viewport cinematic panels.
 * Desktop (≥900px): pin holds intro → pan → holds outro (soft seams both ways).
 * Mobile / reduced motion: vertical stack (images still visible).
 */
export function LandingJourneyScroll({ onOverJourneyChange }: LandingJourneyScrollProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const onOverJourneyChangeRef = useRef(onOverJourneyChange)
  onOverJourneyChangeRef.current = onOverJourneyChange
  const reduceMotion = useMotionPreference('settings')
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track || reduceMotion) return

    const setOver = (active: boolean) => onOverJourneyChangeRef.current?.(active)

    const observeSection = () => {
      const io = new IntersectionObserver(
        ([entry]) => {
          setOver(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35))
        },
        { threshold: [0, 0.35, 0.5, 0.75, 1] },
      )
      io.observe(section)
      return () => {
        io.disconnect()
        setOver(false)
      }
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add('(min-width: 900px)', () => {
        const getTravel = () => Math.max(0, track.scrollWidth - window.innerWidth)
        /** Old end was `travel / (1 - 0.28)`; scale whole pin ≈ ×1/4. */
        const getPinDistance = () =>
          (getTravel() / (1 - PREV_INTRO_HOLD_RATIO)) * PIN_DISTANCE_SCALE
        const panRatio = 1 - INTRO_HOLD_RATIO - OUTRO_HOLD_RATIO
        const panels = gsap.utils.toArray<HTMLElement>('.journey-panel')

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: true,
            // Portfolio-like lag-smooth scrub (seconds); avoid mushy >1.1
            scrub: 1,
            start: 'top top',
            end: () => `+=${getPinDistance()}`,
            invalidateOnRefresh: true,
            onToggle: (self) => setOver(self.isActive),
            onUpdate: (self) => {
              const panProgress = Math.min(
                1,
                Math.max(0, (self.progress - INTRO_HOLD_RATIO) / panRatio),
              )
              const idx = Math.min(
                panels.length - 1,
                Math.round(panProgress * (panels.length - 1)),
              )
              setActiveChapter(idx)
            },
          },
        })

        // Soft enter: hold full-bleed intro (~26% of pin), mirrored on reverse scrub.
        tl.to({}, { duration: INTRO_HOLD_RATIO })

        const panTween = gsap.to(track, {
          x: () => -getTravel(),
          ease: 'none',
          duration: panRatio,
        })
        tl.add(panTween)

        // Soft exit into Themes: outro hold (~18%); reverse = soft re-enter from below.
        tl.to({}, { duration: OUTRO_HOLD_RATIO })

        panels.forEach((panel) => {
          gsap.from(panel.querySelectorAll('.journey-reveal'), {
            y: 40,
            opacity: 0,
            stagger: 0.06,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: panTween,
              start: 'left 72%',
              toggleActions: 'play none none reverse',
            },
          })
        })

        return () => setOver(false)
      })

      // Mobile stack (no pin): transparent header while journey fills the viewport.
      mm.add('(max-width: 899px)', observeSection)
    }, section)

    return () => {
      ctx.revert()
      setOver(false)
    }
  }, [reduceMotion])

  // Reduced motion: vertical stack — same intersection signal for the header.
  useEffect(() => {
    if (!reduceMotion) return
    const section = sectionRef.current
    if (!section) return

    const setOver = (active: boolean) => onOverJourneyChangeRef.current?.(active)
    const io = new IntersectionObserver(
      ([entry]) => {
        setOver(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35))
      },
      { threshold: [0, 0.35, 0.5, 0.75, 1] },
    )
    io.observe(section)
    return () => {
      io.disconnect()
      setOver(false)
    }
  }, [reduceMotion])

  const stackClass = reduceMotion
    ? 'flex-col'
    : 'flex-col min-[900px]:flex-row'

  return (
    <section
      id="jornada"
      ref={sectionRef}
      className="relative overflow-hidden border-b border-white/10 bg-hub-navy"
      aria-label="Do campus ao futuro — jornada pelos módulos"
    >
      {/* Soft seam from light Platform → full-bleed intro (no hard white/dark edge) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)]/35 to-transparent opacity-70 min-[900px]:h-20"
        aria-hidden
      />
      {/* Soft seam into Themes / reverse re-enter (mirrors top hold visually) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-white via-white/35 to-transparent opacity-70 min-[900px]:h-20"
        aria-hidden
      />

      {/* Chrome — below fixed LandingHeader (~4–5rem) so labels never sit under logo/nav */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-20 sm:px-10 sm:pt-24">
        <p className="mono text-[11px] uppercase tracking-[0.25em] text-white/55">
          Jornada · scroll horizontal
        </p>
        <p className="mono hidden text-[11px] uppercase tracking-[0.2em] text-white/40 min-[900px]:block">
          {String(activeChapter + 1).padStart(2, '0')} / {String(CHAPTER_DOTS.length).padStart(2, '0')}
        </p>
      </div>

      {!reduceMotion && (
        <div
          className="pointer-events-none absolute bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 min-[900px]:flex"
          aria-hidden
        >
          {CHAPTER_DOTS.map((dot, i) => (
            <span
              key={dot.id}
              title={dot.label}
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeChapter ? 28 : 8,
                background:
                  i === activeChapter ? '#e30613' : 'rgba(255,255,255,0.28)',
              }}
            />
          ))}
        </div>
      )}

      <div ref={trackRef} className={`flex w-max ${stackClass}`}>
        {/* ── Intro (full-bleed hold frame before horizontal pan) ── */}
        <article className="journey-panel relative flex h-[100svh] min-h-[640px] w-screen max-w-[100vw] shrink-0 flex-col justify-end overflow-hidden min-[900px]:w-screen min-[900px]:max-w-none">
          <img
            src={journeyIntroDawn}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-hub-navy via-hub-navy/70 to-hub-navy/20" />
          <div className="absolute inset-y-0 left-0 w-1.5 bg-hub-red" />

          <div className="relative z-10 max-w-2xl px-5 pb-16 pt-28 sm:px-10 sm:pb-20 lg:px-16">
            <p className="journey-reveal mono text-[11px] uppercase tracking-[0.28em] text-hub-red">
              00 · Do campus ao futuro
            </p>
            <h2 className="journey-reveal mt-4 display text-[clamp(2.6rem,6.5vw,4.6rem)] leading-[1.02] text-white">
              Um dia no SENAI Hub
            </h2>
            <p className="journey-reveal mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              Role para atravessar a jornada: do portal único à sala, ao campus e à
              portaria — Connect, Grid e SAFE no mesmo ritmo do campus.
            </p>
            <div className="journey-reveal mt-8 flex flex-wrap items-center gap-3">
              <span className="mono rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                Segure o quadro · depois pan horizontal
              </span>
              <span className="mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                4 módulos · 1 login
              </span>
            </div>
          </div>
        </article>

        {/* ── Module panels ── */}
        {JOURNEY.map((panel) => {
          const brand = brandFor(panel.slug)

          return (
            <article
              key={panel.id}
              className="journey-panel relative flex h-[100svh] min-h-[640px] w-screen max-w-[100vw] shrink-0 overflow-hidden min-[900px]:w-[min(100vw,1280px)] min-[900px]:max-w-none"
              style={{ background: panel.accentSoft }}
            >
              {/* Full-bleed media plane */}
              <div className="absolute inset-0">
                <img
                  src={panel.cover}
                  alt={panel.coverAlt}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(105deg, rgba(10,12,16,0.92) 0%, rgba(10,12,16,0.72) 38%, ${panel.accentSoft}99 72%, ${panel.accent}55 100%)`,
                  }}
                />
                <div
                  className="absolute inset-0 opacity-40 mix-blend-soft-light"
                  style={{
                    background: `radial-gradient(ellipse at 70% 30%, ${panel.accent}66, transparent 55%)`,
                  }}
                />
              </div>

              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1.5"
                style={{ background: panel.accent }}
              />

              <div className="relative z-10 mx-auto grid h-full w-full max-w-[1280px] grid-rows-[auto_1fr] gap-5 px-5 pb-20 pt-24 sm:px-10 sm:pb-20 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-1 lg:items-stretch lg:gap-8 lg:px-14 lg:pb-24 lg:pt-28">
                {/* Media card */}
                <div className="journey-reveal flex min-h-0 flex-col gap-3">
                  <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/15 sm:min-h-[280px]">
                    <img
                      src={panel.cover}
                      alt={panel.coverAlt}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                    {panel.secondary && (
                      <div className="absolute bottom-3 right-3 hidden w-[38%] overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20 sm:block">
                        <img
                          src={panel.secondary}
                          alt={panel.secondaryAlt ?? ''}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
                      <span className="mono rounded-full border border-white/12 bg-hub-navy/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        {panel.time} · {panel.moment}
                      </span>
                      <span className="mono rounded-full border border-white/12 bg-hub-navy/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
                        /{panel.slug}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-hub-navy/90 via-hub-navy/40 to-transparent p-4 pt-16 sm:p-5">
                      {/* Dark glass — expanded wordmarks use light glyphs (no white pill) */}
                      <div className="rounded-xl border border-white/12 bg-hub-navy/70 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
                        <img
                          src={brand.expanded}
                          alt={brand.name}
                          className="h-9 w-auto max-w-[160px] object-contain sm:h-11 sm:max-w-[200px]"
                        />
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-hub-navy/60 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md sm:h-14 sm:w-14">
                        <img
                          src={brand.markDark}
                          alt=""
                          aria-hidden
                          className="h-[72%] w-[72%] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glass copy column */}
                <div className="journey-reveal flex flex-col justify-between gap-4 rounded-[1.5rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6 lg:my-1">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mono text-sm text-white/70">
                        {panel.chapter} · {brand.name}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white"
                        style={{ background: panel.accent }}
                      >
                        {panel.moment}
                      </span>
                    </div>
                    <p
                      className="mt-3 display text-[clamp(1.85rem,3.6vw,2.75rem)] leading-[1.08] text-white"
                    >
                      <span style={{ color: panel.accent }}>{panel.title}</span>
                    </p>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                      {panel.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {panel.beats.map((beat) => (
                        <span
                          key={beat}
                          className="rounded-full border px-3 py-1 text-xs font-medium text-white/90"
                          style={{
                            background: `${panel.accent}22`,
                            borderColor: `${panel.accent}55`,
                          }}
                        >
                          {beat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                        Neste momento
                      </p>
                      <span className="mono text-[10px]" style={{ color: panel.accent }}>
                        {String(panel.beats.length).padStart(2, '0')} focos
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {panel.beats.map((beat, beatIndex) => (
                        <li
                          key={beat}
                          className="flex gap-3 rounded-xl border border-white/8 bg-hub-navy/35 p-3 backdrop-blur-sm transition hover:bg-hub-navy/50"
                          style={{ boxShadow: `inset 3px 0 0 ${panel.accent}` }}
                        >
                          <span
                            className="mono mt-0.5 shrink-0 text-[10px]"
                            style={{ color: panel.accent }}
                          >
                            {String(beatIndex + 1).padStart(2, '0')}
                          </span>
                          <p className="text-sm font-medium leading-snug text-white/90">
                            {beat}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <div
                      className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
                      style={{ background: `${panel.accent}22` }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-hub-navy/50">
                        <img
                          src={brand.icon}
                          alt=""
                          aria-hidden
                          className="h-6 w-6 object-contain"
                        />
                      </span>
                      <p className="text-xs leading-snug text-white/70">
                        Identidade oficial do módulo — marca real do produto no SENAI Hub.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {/* ── Outro ── */}
        <article className="journey-panel relative flex h-[100svh] min-h-[640px] w-screen max-w-[100vw] shrink-0 flex-col justify-center overflow-hidden bg-hub-navy min-[900px]:w-[min(88vw,960px)] min-[900px]:max-w-none">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(ellipse at 30% 40%, rgba(227,6,19,0.28), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(0,169,224,0.18), transparent 50%)',
            }}
          />
          <div className="absolute inset-y-0 left-0 w-1.5 bg-hub-red" />

          <div className="relative z-10 mx-auto w-full max-w-xl px-5 pb-24 pt-24 sm:px-10 lg:px-14">
            <p className="journey-reveal mono text-[11px] uppercase tracking-[0.28em] text-hub-red">
              05 · Mesma jornada
            </p>
            <h2 className="journey-reveal mt-4 display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] text-white">
              Quatro módulos. Um campus.
            </h2>
            <p className="journey-reveal mt-5 text-base leading-relaxed text-white/65 sm:text-lg">
              Hub, Connect, Grid e SAFE compartilham identidade, autenticação e o ritmo
              do dia — da entrada à portaria.
            </p>

            <div className="journey-reveal mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['hub', 'connect', 'grid', 'safe'] as const).map((slug) => {
                const brand = brandFor(slug)
                return (
                  <div
                    key={slug}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-hub-navy/40 px-3 py-4 backdrop-blur"
                  >
                    <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-black/25">
                      <img
                        src={brand.markDark}
                        alt={brand.name}
                        className="h-8 w-8 object-contain"
                      />
                    </span>
                    <span className="mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                      {slug}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="journey-reveal mt-10 mono text-[10px] uppercase tracking-[0.2em] text-white/35">
              Continue · temas, públicos e recursos
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
