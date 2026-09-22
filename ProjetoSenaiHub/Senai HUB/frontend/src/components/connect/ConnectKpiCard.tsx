import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConnectKpiSparkline } from './ConnectKpiSparkline'

export type KpiCardVariant = 'blue' | 'coral' | 'green' | 'violet' | 'senai' | 'amber'

type VariantStyle = {
  /** Preenchimento suave com fade (tile colorido, saturação contida) */
  fill: string
  valueText: string
  labelText: string
  iconBg: string
  iconText: string
  iconHover: string
  /** Cor do sparkline (hex) — claro sobre fills coloridos */
  sparkline: string
}

/**
 * Meio-termo: tiles preenchidos com gradiente suave (não glass flat, não arco-íris saturado).
 * Texto/ícone/sparkline em off-white para contraste sobre os fills.
 */
const VARIANT_STYLES: Record<KpiCardVariant, VariantStyle> = {
  blue: {
    fill: 'bg-gradient-to-br from-[#5c86ad] via-[#6d93b5] to-[#849ab8]',
    valueText: 'text-white',
    labelText: 'text-white/80',
    iconBg: 'bg-white/18',
    iconText: 'text-white',
    iconHover: 'hover:bg-white/28 hover:ring-white/35',
    sparkline: '#f8fafc',
  },
  coral: {
    fill: 'bg-gradient-to-br from-[#c07a72] via-[#c98c80] to-[#d4a494]',
    valueText: 'text-white',
    labelText: 'text-white/80',
    iconBg: 'bg-white/18',
    iconText: 'text-white',
    iconHover: 'hover:bg-white/28 hover:ring-white/35',
    sparkline: '#f8fafc',
  },
  green: {
    fill: 'bg-gradient-to-br from-[#5a9478] via-[#6ba388] to-[#86b49a]',
    valueText: 'text-white',
    labelText: 'text-white/80',
    iconBg: 'bg-white/18',
    iconText: 'text-white',
    iconHover: 'hover:bg-white/28 hover:ring-white/35',
    sparkline: '#f8fafc',
  },
  /** Mauve suave — primo quieto do magenta antigo */
  violet: {
    fill: 'bg-gradient-to-br from-[#7d7a9a] via-[#8b88a8] to-[#9e9ab5]',
    valueText: 'text-white',
    labelText: 'text-white/80',
    iconBg: 'bg-white/18',
    iconText: 'text-white',
    iconHover: 'hover:bg-white/28 hover:ring-white/35',
    sparkline: '#f8fafc',
  },
  /** Navy institucional (#021A3A) com leve fade; vermelho só no chip */
  senai: {
    fill: 'bg-gradient-to-br from-[#021A3A] via-[#0a2748] to-[#132d52]',
    valueText: 'text-white',
    labelText: 'text-white/75',
    iconBg: 'bg-hub-red/90',
    iconText: 'text-white',
    iconHover: 'hover:bg-hub-red hover:ring-hub-red/40',
    sparkline: '#f1f5f9',
  },
  amber: {
    fill: 'bg-gradient-to-br from-[#b8904a] via-[#c4a05c] to-[#d0b078]',
    valueText: 'text-white',
    labelText: 'text-white/80',
    iconBg: 'bg-white/18',
    iconText: 'text-white',
    iconHover: 'hover:bg-white/28 hover:ring-white/35',
    sparkline: '#f8fafc',
  },
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  variant = 'blue',
  sparkline = [],
  to,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  variant?: KpiCardVariant
  /** Evolução semanal alinhada ao KPI exibido no card (últimas 8 semanas) */
  sparkline?: number[]
  /** Rota ao clicar no ícone */
  to?: string
}) {
  const { t } = useTranslation()
  const styles = VARIANT_STYLES[variant]

  const iconEl = (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/25 transition ${styles.iconBg}`}
    >
      <Icon className={`h-5 w-5 ${styles.iconText}`} strokeWidth={1.75} />
    </span>
  )

  return (
    <article
      className={`relative flex min-h-[148px] flex-col overflow-hidden rounded-xl p-4 shadow-[0_8px_28px_rgba(2,26,58,0.14)] sm:min-h-[152px] sm:p-5 ${styles.fill}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.06] via-transparent to-white/[0.08]" aria-hidden />

      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-2xl font-bold tracking-tight sm:text-[1.75rem] ${styles.valueText}`}>{value}</p>
          <p className={`mt-0.5 line-clamp-2 text-xs font-medium leading-snug sm:text-sm ${styles.labelText}`}>
            {label}
          </p>
        </div>
        {to ? (
          <Link
            to={to}
            aria-label={t('common.goToPage', { label })}
            className={`rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${styles.iconHover}`}
          >
            {iconEl}
          </Link>
        ) : (
          iconEl
        )}
      </div>
      <div className="relative z-[1] mt-auto pt-3">
        <ConnectKpiSparkline data={sparkline} color={styles.sparkline} className="h-[52px] opacity-95" />
      </div>
    </article>
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="relative min-h-[148px] animate-pulse overflow-hidden rounded-xl bg-gradient-to-br from-[#6b8499] via-[#7a90a4] to-[#8da0b2] p-4 shadow-[0_8px_28px_rgba(2,26,58,0.12)] sm:min-h-[152px] sm:p-5">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-20 rounded bg-white/25" />
          <div className="h-3 w-32 rounded bg-white/15" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-white/20" />
      </div>
      <div className="mt-auto flex h-[52px] items-end gap-1 pt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t bg-white/20" style={{ height: `${30 + (i % 4) * 12}%` }} />
        ))}
      </div>
    </div>
  )
}
