import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { AppBrandMark } from '../brand/AppBrandMark'

export const PLATFORM_APP_CARD_CTA_CLASS =
  'flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-hub-navy text-sm font-semibold tracking-wide text-white shadow-[0_8px_24px_rgba(10,12,16,0.18)] transition-[background,box-shadow,transform] duration-300 hover:bg-hub-red hover:shadow-[0_10px_28px_rgba(227,6,19,0.35)]'

type PlatformAppCardProps = {
  slug: string
  name: string
  description: string
  cover: string
  /** Button or Link with PLATFORM_APP_CARD_CTA_CLASS */
  cta: ReactNode
  className?: string
}

/**
 * Shared craft for Connect / Grid / SAFE module cards (Hub apps + landing #solucoes).
 * Light surface → mark-light via AppBrandMark tone="light".
 */
export function PlatformAppCard({
  slug,
  name,
  description,
  cover,
  cta,
  className = '',
}: PlatformAppCardProps) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-hub-navy/[0.08] bg-white/70 shadow-[0_10px_40px_rgba(10,12,16,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-hub-navy/15 hover:shadow-[0_18px_56px_rgba(10,12,16,0.12),0_0_0_1px_rgba(227,6,19,0.06)] ${className}`}
    >
      {/* Fixed 16/10 frame — absolute cover so wide assets (~2.8:1) cannot letterbox or skew card height */}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-hub-bg">
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/55 via-transparent to-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-hub-navy/10 to-transparent"
          aria-hidden
        />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        <div className="flex items-center gap-3">
          <AppBrandMark slug={slug} name={name} size="md" tone="light" />
          <h2 className="display text-[1.35rem] leading-none tracking-tight text-hub-navy sm:text-xl">
            {name}
          </h2>
        </div>

        <p className="mt-3.5 flex-1 text-sm leading-relaxed text-[var(--ink-soft)] sm:mt-4 sm:text-[15px]">
          {description}
        </p>

        <div className="mt-6 sm:mt-7">{cta}</div>
      </div>
    </article>
  )
}

export function PlatformAppCardCtaIcon({ className = 'h-4 w-4 opacity-90' }: { className?: string }) {
  return <ArrowUpRight className={className} aria-hidden />
}
