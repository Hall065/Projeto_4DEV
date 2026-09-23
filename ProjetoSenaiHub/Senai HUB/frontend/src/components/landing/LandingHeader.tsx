import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { HUB_BRAND_ASSETS } from '../../utils/appBrandAssets'
import { useAuth } from '../../contexts/AuthContext'
import { SupportChatTrigger } from '../support/SupportChatTrigger'

type LandingHeaderProps = {
  /** True while `#jornada` pin / intersection is active — transparent chrome over photos. */
  overJourney?: boolean
}

export function LandingHeader({ overJourney = false }: LandingHeaderProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const navLinks = [
    { label: t('landing.navFeatures'), href: '#recursos' },
    { label: t('landing.navSolutions'), href: '#solucoes' },
    { label: t('landing.navBenefits'), href: '#beneficios' },
    { label: t('landing.navAudience'), href: '#para-quem' },
    { label: t('landing.navSupport'), href: '#suporte' },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Light chrome: scrolled solid bar OR transparent-over-journey (white text/logo).
  const lightChrome = scrolled || overJourney

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color,backdrop-filter] duration-300 ${
        overJourney
          ? 'border-b border-transparent bg-transparent text-white'
          : scrolled
            ? 'border-b border-white/10 bg-hub-navy/85 text-white backdrop-blur-md'
            : 'border-b border-transparent bg-transparent text-hub-navy'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="shrink-0" data-cursor aria-label={HUB_BRAND_ASSETS.name}>
          {lightChrome ? (
            <img
              src={HUB_BRAND_ASSETS.expanded}
              alt={HUB_BRAND_ASSETS.name}
              className="h-9 w-auto sm:h-10"
            />
          ) : (
            <span className="display text-lg tracking-tight sm:text-xl">SENAI HUB</span>
          )}
        </Link>

        <nav
          className={`hidden items-center gap-7 text-[11px] uppercase tracking-[0.22em] md:flex ${
            lightChrome ? 'text-white' : 'text-hub-navy'
          }`}
          aria-label="Principal"
        >
          {navLinks.map((link) =>
            link.href === '#suporte' ? (
              <SupportChatTrigger
                key={link.href}
                data-cursor
                className={`relative transition ${lightChrome ? 'opacity-70 hover:opacity-100' : 'opacity-55 hover:opacity-100'}`}
              >
                {link.label}
              </SupportChatTrigger>
            ) : (
              <a
                key={link.href}
                href={link.href}
                data-cursor
                className={`relative transition ${lightChrome ? 'opacity-70 hover:opacity-100' : 'opacity-55 hover:opacity-100'}`}
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {isAuthenticated ? (
            <Link
              to="/hub"
              data-cursor
              className="rounded-full bg-hub-red px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(227,6,19,0.25)] transition hover:brightness-110"
            >
              {t('landing.accessHub')}
            </Link>
          ) : (
            <Link
              to="/login"
              data-cursor
              className="rounded-full bg-hub-red px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(227,6,19,0.25)] transition hover:brightness-110"
            >
              {t('landing.login')}
            </Link>
          )}
        </div>

        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-lg p-2 md:hidden ${
            lightChrome ? 'text-white' : 'text-hub-navy'
          }`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
          data-cursor
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/15 bg-hub-navy px-5 py-4 text-white md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) =>
              link.href === '#suporte' ? (
                <SupportChatTrigger
                  key={link.href}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </SupportChatTrigger>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                to="/hub"
                className="rounded-full bg-hub-red px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                {t('landing.accessHub')}
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-hub-red px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                {t('landing.login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
