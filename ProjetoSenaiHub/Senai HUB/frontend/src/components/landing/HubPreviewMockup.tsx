import { ArrowUpRight, ChevronDown, Headphones, LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppBrandMark } from '../brand/AppBrandMark'
import coverConnect from '../../assets/hub/cover-connect.png'
import coverGrid from '../../assets/hub/cover-grid.png'
import coverSafe from '../../assets/hub/cover-safe.png'
import { APP_BRAND_ASSETS, HUB_BRAND_ASSETS, MODULE_BRAND_SLUGS } from '../../utils/appBrandAssets'

const previewApps = MODULE_BRAND_SLUGS.map((slug) => ({
  slug,
  name: APP_BRAND_ASSETS[slug].name,
  cover: slug === 'connect' ? coverConnect : slug === 'grid' ? coverGrid : coverSafe,
}))

export function HubPreviewMockup() {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-2xl border border-hub-navy/[0.08] bg-white/55 shadow-[0_14px_48px_rgba(10,12,16,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5 border-b border-hub-navy/[0.06] bg-white/50 px-3 py-2 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
      </div>

      <div className="flex min-h-[300px] sm:min-h-[320px]">
        <aside className="flex w-[118px] shrink-0 flex-col bg-hub-navy px-3 py-4 sm:w-[132px] sm:px-3.5">
          <img
            src={HUB_BRAND_ASSETS.expanded}
            alt={HUB_BRAND_ASSETS.name}
            className="h-auto w-full max-w-[100px] object-contain"
          />

          <nav className="mt-5 space-y-2">
            <div className="flex items-center gap-1.5 rounded-md bg-hub-red px-2 py-1.5 text-[9px] font-semibold leading-tight text-white sm:text-[10px]">
              <LayoutGrid className="h-3 w-3 shrink-0" />
              {t('landing.preview.appHub')}
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-hub-navy px-2 py-1.5 text-[9px] font-medium leading-tight text-white/90 sm:text-[10px]">
              <Headphones className="h-3 w-3 shrink-0" />
              {t('landing.preview.support')}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]/40 backdrop-blur-sm">
          <div className="hub-chrome flex items-center justify-end gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
            <span className="h-6 w-6 rounded-full bg-hub-navy/10" />
            <span className="hidden text-[10px] font-medium text-white sm:inline">Ana Maria</span>
            <ChevronDown className="h-3 w-3 text-white/70" />
          </div>

          <div className="flex-1 p-3 sm:p-4">
            <h3 className="display text-sm tracking-tight text-hub-navy sm:text-base">
              {t('landing.preview.title')}
            </h3>
            <p className="mt-0.5 text-[10px] text-hub-text-muted sm:text-[11px]">{t('landing.preview.subtitle')}</p>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
              {previewApps.map(({ slug, name, cover }) => (
                <article
                  key={slug}
                  className="group/card flex flex-col overflow-hidden rounded-lg border border-hub-navy/[0.07] bg-white/75 shadow-[0_4px_16px_rgba(10,12,16,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md"
                >
                  <div className="relative aspect-[5/2] w-full overflow-hidden bg-hub-bg">
                    <img
                      src={cover}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04] ${
                        slug === 'connect' ? 'object-top' : slug === 'safe' ? 'object-[center_30%]' : 'object-center'
                      }`}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent"
                      aria-hidden
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-2 sm:p-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <AppBrandMark
                        slug={slug}
                        name={name}
                        size="sm"
                        tone="light"
                        className="!h-5 !w-5 [&_img]:!h-3 [&_img]:!w-3"
                      />
                      <span className="display text-[9px] font-bold tracking-tight text-hub-navy sm:text-[10px]">
                        {name}
                      </span>
                    </div>
                    <span className="mt-auto flex items-center justify-center gap-1 rounded-md bg-hub-navy py-1 text-[8px] font-semibold text-white sm:text-[9px]">
                      {t('landing.preview.accessSystem')}
                      <ArrowUpRight className="h-2.5 w-2.5 opacity-90" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
