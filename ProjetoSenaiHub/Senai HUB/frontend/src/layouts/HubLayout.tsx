import { useState } from 'react'
import { HubHeader } from '../components/hub/HubHeader'
import { HubSidebar } from '../components/hub/HubSidebar'
import { GlassShell } from '../components/layout/GlassShell'
import { SkipToMainLink } from '../components/layout/SkipToMainLink'
import { SidebarRailToggle } from '../components/layout/SidebarRailToggle'
import { PageTransition } from '../motion'

export function HubLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <GlassShell className="flex min-h-screen">
      <SkipToMainLink />
      <HubSidebar collapsed={collapsed} />
      <SidebarRailToggle collapsed={collapsed} onClick={() => setCollapsed((value) => !value)} />
      <div className="relative z-50 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <HubHeader />
        <main id="main-content" className="scrollbar-app-main relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            <PageTransition />
          </div>
        </main>
      </div>
    </GlassShell>
  )
}
