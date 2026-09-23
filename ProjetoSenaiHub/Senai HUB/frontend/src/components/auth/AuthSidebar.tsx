import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Headphones } from 'lucide-react'
import { HUB_BRAND_ASSETS } from '../../utils/appBrandAssets'
import { useSupportChat } from '../../contexts/SupportChatContext'
import { MotionItem, StaggerChildren } from '../../motion'

export function AuthSidebar() {
  const { t } = useTranslation()
  const { open: openSupportChat } = useSupportChat()

  return (
    <aside className="hub-chrome-sidebar relative flex min-h-screen w-[34%] min-w-[300px] max-w-[440px] flex-col items-center justify-start px-10 py-10 text-white">
      <StaggerChildren stagger={0.08} delay={0.06} className="flex h-full w-full flex-1 flex-col items-center">
        <MotionItem className="w-full max-w-[340px]">
          <Link to="/" className="block w-full transition-opacity hover:opacity-90" aria-label={t('common.home')}>
            <img src={HUB_BRAND_ASSETS.expanded} alt={HUB_BRAND_ASSETS.name} className="h-auto w-full object-contain" />
          </Link>
        </MotionItem>

        <MotionItem className="my-auto w-full py-10">
          <h2 className="display text-[2rem] leading-[0.95] tracking-tight">{t('authSidebar.welcome')}</h2>
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-white/85">{t('authSidebar.tagline')}</p>
        </MotionItem>

        <MotionItem className="w-full">
          <button
            type="button"
            onClick={openSupportChat}
            className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition hover:bg-white/10"
            aria-label={t('authSidebar.support')}
          >
            <Headphones className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">{t('authSidebar.support')}</span>
              <span className="mt-1 block text-xs text-white/75">{t('authSidebar.supportHint')}</span>
            </span>
          </button>
        </MotionItem>
      </StaggerChildren>
    </aside>
  )
}
