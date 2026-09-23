import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConnectHeader } from '../components/connect/ConnectHeader'
import { ConnectSidebar } from '../components/connect/ConnectSidebar'
import { GlassShell } from '../components/layout/GlassShell'
import { SkipToMainLink } from '../components/layout/SkipToMainLink'
import { SidebarRailToggle } from '../components/layout/SidebarRailToggle'
import { PageTransition } from '../motion'

export function ConnectLayout() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  return (
    <GlassShell className="flex h-screen max-h-[100dvh] min-w-0 overflow-hidden">
      <SkipToMainLink />
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label={t('header.closeMenu')}
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <ConnectSidebar
        collapsed={collapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <SidebarRailToggle
        collapsed={collapsed}
        onClick={() => setCollapsed((v) => !v)}
      />

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:z-50">
        <ConnectHeader
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setMobileNavOpen((open) => !open)
            } else {
              setCollapsed((v) => !v)
            }
          }}
          isMobileNavOpen={mobileNavOpen}
        />
        <main id="main-content" className="scrollbar-app-main relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <PageTransition />
          </div>
        </main>
      </div>
    </GlassShell>
  )
}
