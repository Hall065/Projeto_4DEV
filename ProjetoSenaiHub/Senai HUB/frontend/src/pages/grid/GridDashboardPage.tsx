import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Package,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ConnectEntityViewDrawer } from '../../components/connect/ConnectEntityViewDrawer'
import { ConnectRowActionsMenu } from '../../components/connect/ConnectRowActionsMenu'
import { KpiCard, KpiCardSkeleton } from '../../components/connect/ConnectKpiCard'
import {
  breakdownTotalCount,
  GridDistributionDonut,
  GridQuickReportsSection,
} from '../../components/grid/GridCharts'
import { GridPriorityBadge, GridTicketStatusBadge } from '../../components/grid/GridBadges'
import { HorizontalAutoCarousel } from '../../components/connect/HorizontalAutoCarousel'
import {
  ConnectCard,
  ConnectLoadingSpinner,
  ConnectPageHeader,
  ConnectTableScroll,
  OutlineButton,
  QueryErrorBanner,
} from '../../components/connect/ConnectShared'
import { FadeIn, HoverLift, MotionItem, StaggerChildren } from '../../motion'
import { gridService } from '../../services/gridService'
import { useCachedQuery } from '../../hooks/useCachedQuery'
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus'
import type { GridDashboardData, GridTicket } from '../../types/grid'

const clickableRowClass =
  'cursor-pointer transition hover:border-hub-red/35 hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-red'

export function GridDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [viewSnapshot, setViewSnapshot] = useState<GridTicket | null>(null)
  const { data, loading, error, reload } = useCachedQuery<GridDashboardData>(
    'grid-dashboard',
    () => gridService.getDashboard(),
    { ttlMs: 60_000 },
  )

  useRefetchOnFocus(() => reload(true))

  const kpis = data?.kpis
  const spark = data?.kpi_sparklines

  return (
    <div className="w-full min-w-0">
      <FadeIn>
        <ConnectPageHeader
          title={t('grid.dashboard.title')}
          subtitle={t('grid.dashboard.subtitle')}
        />
      </FadeIn>

      {error && (
        <QueryErrorBanner message={error ?? t('grid.dashboard.loadError')} onRetry={() => reload(true)} />
      )}

      <StaggerChildren className="mb-6 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" delay={0.06}>
        {loading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <MotionItem key={i}>
              <KpiCardSkeleton />
            </MotionItem>
          ))
        ) : (
          <>
            <MotionItem>
              <KpiCard
                icon={ClipboardList}
                label={t('grid.dashboard.kpis.openTickets')}
                value={kpis.open_tickets}
                variant="blue"
                sparkline={spark?.open_tickets ?? []}
                to="/grid/chamados"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={Wrench}
                label={t('grid.dashboard.kpis.inProgress')}
                value={kpis.in_progress}
                variant="coral"
                sparkline={spark?.in_progress ?? []}
                to="/grid/tarefas"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={CheckCircle2}
                label={t('grid.dashboard.kpis.completedMonth')}
                value={kpis.completed_month}
                variant="green"
                sparkline={spark?.completed_month ?? []}
                to="/grid/chamados"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={Package}
                label={t('grid.dashboard.kpis.lowStock')}
                value={kpis.low_stock}
                variant="amber"
                sparkline={spark?.low_stock ?? []}
                to="/grid/estoque"
              />
            </MotionItem>
          </>
        )}
      </StaggerChildren>

      <FadeIn delay={0.1}>
        <ConnectCard className="mb-6 min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-hub-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-lg font-semibold text-hub-navy">{t('grid.dashboard.recentTickets.title')}</h2>
            <Link to="/grid/chamados">
              <OutlineButton>{t('grid.dashboard.recentTickets.viewAll')}</OutlineButton>
            </Link>
          </div>
          {loading ? (
            <ConnectLoadingSpinner label={t('grid.dashboard.recentTickets.loading')} className="min-h-[140px]" />
          ) : (data?.recent_tickets.length ?? 0) === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-hub-text-muted sm:px-6">
              {t('grid.dashboard.recentTickets.empty')}
            </p>
          ) : (
            <HorizontalAutoCarousel className="px-4 py-4 sm:px-6">
              <ul className="flex gap-3 pb-1">
                {[...(data?.recent_tickets ?? []), ...(data?.recent_tickets ?? [])].map((ticket, index) => (
                  <li key={`${ticket.id}-${index}`} className="w-[min(100%,280px)] shrink-0 sm:w-[300px]">
                    <HoverLift className="h-full">
                      <article
                        role="button"
                        tabIndex={0}
                        className={`flex h-full min-w-0 items-center gap-2 rounded-xl border border-hub-border/50 bg-gradient-to-r from-white to-hub-bg/30 p-3 shadow-sm ${clickableRowClass}`}
                        onClick={() => navigate(`/grid/chamados?id=${ticket.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/grid/chamados?id=${ticket.id}`)
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-hub-red">{ticket.code}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-hub-navy">{ticket.title}</p>
                          <p className="mt-1 truncate text-xs text-hub-text-muted">
                            {ticket.room || '—'} / {ticket.block || '—'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <GridPriorityBadge priority={ticket.priority} />
                            <GridTicketStatusBadge status={ticket.status} />
                          </div>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <ConnectRowActionsMenu
                            ariaLabel={t('connect.common.actionsOf', { name: ticket.code })}
                            actions={[
                              { key: 'view', label: t('connect.common.view'), icon: Eye, onClick: () => setViewSnapshot(ticket) },
                            ]}
                          />
                        </div>
                      </article>
                    </HoverLift>
                  </li>
                ))}
              </ul>
            </HorizontalAutoCarousel>
          )}
        </ConnectCard>
      </FadeIn>

      <StaggerChildren className="mb-6 grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-2" delay={0.12}>
        <MotionItem>
          <ConnectCard className="min-w-0 overflow-hidden">
            <h2 className="border-b border-hub-border/60 px-4 py-4 text-lg font-semibold text-hub-navy sm:px-6 sm:text-xl">
              {t('grid.dashboard.lowStock.title')}
            </h2>
            {loading ? (
              <ConnectLoadingSpinner label={t('grid.dashboard.lowStock.loading')} className="min-h-[200px]" />
            ) : (data?.low_stock_items.length ?? 0) === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-hub-text-muted sm:px-6">
                {t('grid.dashboard.kpis.lowStock')}
              </p>
            ) : (
              <ConnectTableScroll>
                <table className="w-full min-w-[400px] text-sm">
                  <thead className="glass-thead text-hub-text-muted">
                    <tr>
                      <th className="px-4 py-3 text-left sm:px-6">{t('grid.dashboard.lowStock.item')}</th>
                      <th className="px-4 py-3 text-left sm:px-6">{t('grid.dashboard.lowStock.current')}</th>
                      <th className="px-4 py-3 text-left sm:px-6">{t('grid.dashboard.lowStock.minimum')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.low_stock_items.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t border-hub-border/40 ${clickableRowClass}`}
                        onClick={() => navigate(`/grid/estoque?id=${item.id}`)}
                      >
                        <td className="px-4 py-3 sm:px-6">{item.category}</td>
                        <td className="px-4 py-3 font-semibold text-red-600 sm:px-6">{item.current}</td>
                        <td className="px-4 py-3 sm:px-6">{item.minimum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ConnectTableScroll>
            )}
            <div className="border-t border-hub-border/40 px-4 py-3 sm:px-6">
              <Link to="/grid/estoque" className="text-sm font-medium text-hub-red hover:underline">
                {t('grid.dashboard.lowStock.viewInventory')}
              </Link>
            </div>
          </ConnectCard>
        </MotionItem>

        <MotionItem>
          <div className="flex min-w-0 flex-col gap-6">
            <ConnectCard className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-hub-navy sm:text-xl">{t('grid.dashboard.urgent.title')}</h2>
                <Link to="/grid/chamados" className="text-xs font-medium text-hub-red hover:underline">
                  {t('grid.dashboard.urgent.viewTickets')}
                </Link>
              </div>
              {loading ? (
                <ConnectLoadingSpinner className="min-h-[160px]" />
              ) : (data?.urgent_items.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-hub-text-muted">{t('grid.dashboard.urgent.empty')}</p>
              ) : (
                <ul className="scrollbar-glass-inset max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {data?.urgent_items.map((item) => (
                    <li key={item.id}>
                      <HoverLift>
                        <button
                          type="button"
                          className={`flex w-full items-start gap-3 rounded-xl border border-hub-border/50 bg-gradient-to-r from-white to-hub-bg/30 p-3 text-left shadow-sm ${clickableRowClass}`}
                          onClick={() => navigate(`/grid/chamados?id=${item.id}`)}
                        >
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-hub-text">{item.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <GridPriorityBadge priority={item.priority} />
                              <span className="text-xs text-hub-text-muted">{item.when}</span>
                            </div>
                          </div>
                        </button>
                      </HoverLift>
                    </li>
                  ))}
                </ul>
              )}
            </ConnectCard>

            <ConnectCard className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-hub-navy sm:text-xl">{t('grid.dashboard.activities.title')}</h2>
                <Link to="/grid/tarefas" className="text-xs font-medium text-hub-red hover:underline">
                  {t('grid.dashboard.activities.viewTasks')}
                </Link>
              </div>
              {loading ? (
                <ConnectLoadingSpinner className="min-h-[160px]" />
              ) : (
                <ul className="scrollbar-glass-inset max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {(data?.activities ?? []).length === 0 ? (
                    <li className="py-6 text-center text-sm text-hub-text-muted">{t('grid.dashboard.activities.title')}</li>
                  ) : (
                    data?.activities.map((a) => (
                      <li key={a.id}>
                        <HoverLift>
                          <button
                            type="button"
                            className={`w-full rounded-xl border border-hub-border/50 bg-gradient-to-r from-white to-hub-bg/30 p-3 text-left shadow-sm ${clickableRowClass}`}
                            onClick={() => navigate(`/grid/tarefas?id=${a.id}`)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-hub-text-muted">{a.code}</p>
                                <p className="text-sm font-medium text-hub-text">{a.title}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                {a.status_label}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-hub-text-muted">
                              {a.room} / {a.block}
                              {a.assignee ? ` · ${a.assignee}` : ` · ${t('grid.common.noTechnician')}`}
                            </p>
                          </button>
                        </HoverLift>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </ConnectCard>
          </div>
        </MotionItem>
      </StaggerChildren>

      <FadeIn whenVisible delay={0.06}>
        <ConnectCard className="mb-6 min-w-0 p-4 sm:p-6 lg:p-8">
          <h2 className="mb-6 text-lg font-semibold text-hub-navy sm:mb-8 sm:text-xl">{t('grid.dashboard.charts.quickReports')}</h2>
          <GridQuickReportsSection
            loading={loading}
            maintenanceBreakdown={data?.maintenance_breakdown ?? []}
            priorityBreakdown={data?.priority_breakdown ?? []}
            ticketsByMonth={data?.tickets_by_month ?? []}
            ticketsByTechnician={data?.tickets_by_technician ?? []}
            topInventory={data?.top_inventory ?? []}
            tasksByColumn={data?.tasks_by_column}
          />
        </ConnectCard>
      </FadeIn>

      <FadeIn whenVisible delay={0.08}>
        <ConnectCard className="mb-6 p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-hub-navy sm:text-xl">{t('grid.dashboard.charts.priority')}</h2>
          <GridDistributionDonut
            loading={loading}
            items={data?.priority_breakdown ?? []}
            centerValue={breakdownTotalCount(data?.priority_breakdown ?? []) || '—'}
            centerLabel={t('grid.dashboard.charts.tickets')}
          />
        </ConnectCard>
      </FadeIn>

      <ConnectEntityViewDrawer
        kind="grid-ticket"
        entityId={null}
        open={viewSnapshot !== null}
        onClose={() => setViewSnapshot(null)}
        snapshot={viewSnapshot ?? undefined}
      />
    </div>
  )
}
