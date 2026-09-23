import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HUB_BRAND_ASSETS } from '../../utils/appBrandAssets'
import { SupportChatTrigger } from '../support/SupportChatTrigger'

type FooterLink = { label: string; href?: string; openChat?: boolean }

function SocialIcon({ name }: { name: 'facebook' | 'instagram' | 'linkedin' | 'youtube' }) {
  const common = 'h-4 w-4 fill-current'
  if (name === 'facebook') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  }
  if (name === 'instagram') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    )
  }
  if (name === 'linkedin') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 110-4.124 2.062 2.062 0 010 4.124zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  }
  return (
    <svg className={common} viewBox="0 0 24 24" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

const social = [
  { icon: 'facebook' as const, label: 'Facebook', href: 'https://www.facebook.com/senai' },
  { icon: 'instagram' as const, label: 'Instagram', href: 'https://www.instagram.com/senai' },
  { icon: 'linkedin' as const, label: 'LinkedIn', href: 'https://www.linkedin.com/company/senai' },
  { icon: 'youtube' as const, label: 'YouTube', href: 'https://www.youtube.com/@senai' },
]

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="mono text-[11px] uppercase tracking-[0.2em] text-white/50">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.openChat ? (
              <SupportChatTrigger className="text-sm text-white/70 transition-colors hover:text-white">
                {link.label}
              </SupportChatTrigger>
            ) : (
              <a href={link.href} data-cursor className="text-sm text-white/70 transition-colors hover:text-white">
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LandingFooter() {
  const { t } = useTranslation()

  const navigation = [
    { label: t('landing.navFeatures'), href: '#recursos' },
    { label: t('landing.navSolutions'), href: '#solucoes' },
    { label: t('landing.navBenefits'), href: '#beneficios' },
    { label: t('landing.navAudience'), href: '#para-quem' },
  ]

  const support: FooterLink[] = [
    { label: t('landing.footer.helpCenter'), openChat: true },
    { label: t('landing.footer.contactUs'), openChat: true },
    { label: t('landing.footer.documentation'), openChat: true },
    { label: t('landing.footer.systemStatus'), href: '#suporte' },
  ]

  const institutional = [
    { label: t('landing.footer.aboutSenai'), href: '#suporte' },
    { label: t('landing.footer.privacyPolicy'), href: '#suporte' },
    { label: t('landing.footer.termsOfUse'), href: '#suporte' },
  ]

  return (
    <footer id="suporte" className="bg-hub-navy text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <img src={HUB_BRAND_ASSETS.expanded} alt={HUB_BRAND_ASSETS.name} className="h-12 w-auto sm:h-14" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">{t('landing.footer.tagline')}</p>
            <div className="mt-6 flex gap-3">
              {social.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-hub-red"
                  aria-label={label}
                >
                  <SocialIcon name={icon} />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title={t('landing.footer.navigation')} links={navigation} />
          <FooterColumn title={t('landing.footer.support')} links={support} />
          <FooterColumn title={t('landing.footer.institutional')} links={institutional} />
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <p>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
          <p className="mono">
            <Link to="/login" data-cursor className="hover:text-white/70">
              {t('landing.restrictedArea')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
