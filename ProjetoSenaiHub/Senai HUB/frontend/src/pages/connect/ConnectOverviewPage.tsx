import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  CalendarCheck,
  FileText,
  GraduationCap,
  School,
  Users,
} from 'lucide-react'
import { QuickReportsSection } from '../../components/connect/ConnectCharts'
import { KpiCard, KpiCardSkeleton } from '../../components/connect/ConnectKpiCard'
import {
  ConnectCard,
  ConnectLoadingSpinner,
  ConnectPageHeader,
  ConnectTableScroll,
  EMPTY,
  formatDateTime,
  QueryErrorBanner,
  StatusBadge,
} from '../../components/connect/ConnectShared'
import { FadeIn, MotionItem, StaggerChildren } from '../../motion'
import { connectService } from '../../services/connectService'
import { useCachedQuery } from '../../hooks/useCachedQuery'
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus'
import type { DashboardData } from '../../types/connect'

export function ConnectOverviewPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'cadastros' | 'alertas'>('cadastros')
  const { data, loading, error, reload } = useCachedQuery<DashboardData>(
    'connect-dashboard',
    () => connectService.getDashboard(),
    { ttlMs: 60_000 },
  )

  useRefetchOnFocus(() => reload(true))

  const attendance = data?.attendance_breakdown ?? { present: 0, justified: 0, unjustified: 0, rate: 0 }
  const teachers = data?.classes_by_teacher ?? []
  const courses = data?.students_by_course ?? []
  const kpis = data?.kpis
  const spark = data?.kpi_sparklines

  return (
    <div className="w-full min-w-0">
      <FadeIn>
        <ConnectPageHeader
          title={t('connect.overview.title')}
          subtitle={t('connect.overview.subtitle')}
        />
      </FadeIn>

      {error && (
        <QueryErrorBanner message={error ?? t('connect.overview.loadError')} onRetry={() => reload(true)} />
      )}

      <StaggerChildren className="mb-6 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" delay={0.06}>
        {loading || !kpis ? (
          Array.from({ length: 6 }).map((_, i) => (
            <MotionItem key={i}>
              <KpiCardSkeleton />
            </MotionItem>
          ))
        ) : (
          <>
            <MotionItem>
              <KpiCard
                icon={GraduationCap}
                label={t('connect.overview.kpis.totalStudents')}
                value={kpis.total_students.toLocaleString('pt-BR')}
                variant="blue"
                sparkline={spark?.students ?? []}
                to="/connect/alunos"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={Users}
                label={t('connect.overview.kpis.totalTeachers')}
                value={kpis.total_teachers}
                variant="coral"
                sparkline={spark?.teachers ?? []}
                to="/connect/professores"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={School}
                label={t('connect.overview.kpis.activeClasses')}
                value={kpis.active_classes}
                variant="green"
                sparkline={spark?.classes ?? []}
                to="/connect/turmas"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={BookOpen}
                label={t('connect.overview.kpis.activeCourses')}
                value={kpis.active_courses}
                variant="violet"
                sparkline={spark?.courses ?? []}
                to="/connect/cursos"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={CalendarCheck}
                label={t('connect.overview.kpis.attendanceRate')}
                value={`${kpis.attendance_rate}%`}
                variant="senai"
                sparkline={spark?.attendance ?? []}
                to="/connect/frequencia"
              />
            </MotionItem>
            <MotionItem>
              <KpiCard
                icon={FileText}
                label={t('connect.overview.kpis.activeContracts')}
                value={kpis.active_contracts}
                variant="amber"
                sparkline={spark?.contracts ?? []}
                to="/connect/contratos/alunos"
              />
            </MotionItem>
          </>
        )}
      </StaggerChildren>

      <StaggerChildren
        className="mb-6 grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch"
        delay={0.12}
      >
        <MotionItem className="min-w-0 lg:col-span-2">
          <QuickReportsSection loading={loading} attendance={attendance} teachers={teachers} courses={courses} />
        </MotionItem>

        <MotionItem className="min-w-0 lg:col-span-1 lg:h-full">
          <ConnectCard className="flex min-h-0 min-w-0 flex-col p-4 sm:p-6 lg:h-full">
            <h2 className="mb-4 shrink-0 text-lg font-semibold text-hub-navy sm:text-xl">{t('connect.overview.recentActivity')}</h2>
            {loading ? (
              <ul className="scrollbar-glass-inset min-h-[240px] flex-1 space-y-4 overflow-y-auto pr-1 lg:min-h-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="animate-pulse border-b border-hub-border/50 pb-3">
                    <div className="mb-2 h-4 w-3/4 rounded bg-hub-bg" />
                    <div className="h-3 w-full rounded bg-hub-bg" />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="scrollbar-glass-inset min-h-[240px] flex-1 space-y-4 overflow-y-auto pr-1 lg:min-h-0">
                {data?.recent_activities.map((activity) => (
                  <li key={activity.id} className="border-b border-hub-border/50 pb-3 last:border-0">
                    <p className="text-sm font-medium text-hub-text">{activity.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-hub-text-muted">{activity.description}</p>
                    <p className="mt-1 text-xs text-hub-text-muted">
                      {formatDateTime(activity.occurred_at)} · {activity.performed_by}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ConnectCard>
        </MotionItem>
      </StaggerChildren>

      <FadeIn whenVisible delay={0.08}>
        <ConnectCard className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-hub-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-hub-navy sm:text-lg">{t('connect.overview.registrationsAlerts')}</h2>
              {!loading && data && (
              <span className="rounded-full bg-hub-red px-2 py-0.5 text-xs font-semibold text-white">
                {data.alerts.length + data.cadastros.length}
              </span>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => setTab('cadastros')}
                className={
                  tab === 'cadastros'
                    ? 'border-b-2 border-hub-red pb-1 font-semibold text-hub-red'
                    : 'pb-1 text-hub-text-muted'
                }
              >
                {t('connect.overview.tabs.registrations')}
              </button>
              <button
                type="button"
                onClick={() => setTab('alertas')}
                className={
                  tab === 'alertas'
                    ? 'border-b-2 border-hub-red pb-1 font-semibold text-hub-red'
                    : 'pb-1 text-hub-text-muted'
                }
              >
                {t('connect.overview.tabs.alerts')}
              </button>
            </div>
          </div>
          {loading ? (
            <ConnectLoadingSpinner label={t('connect.overview.loading')} className="min-h-[280px]" />
          ) : data ? (
          <ConnectTableScroll>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="glass-thead text-hub-text-muted">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-6">{t('connect.table.type')}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-6">{t('connect.table.name')}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-6">{t('connect.table.details')}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-6">{t('connect.table.dateTime')}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-6">{t('connect.table.user')}</th>
                </tr>
              </thead>
              <tbody>
                {tab === 'cadastros'
                  ? data.cadastros.map((student) => (
                      <tr key={student.id} className="border-t border-hub-border/40">
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">{t('connect.overview.rowType.student')}</td>
                        <td className="px-4 py-3 font-medium sm:px-6">{student.full_name}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-hub-text-muted sm:max-w-none sm:px-6">
                          {student.class?.name ?? student.class?.course?.name ?? EMPTY}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">{formatDateTime(student.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">{t('connect.common.system')}</td>
                      </tr>
                    ))
                  : data.alerts.map((alert) => (
                      <tr key={alert.id} className="border-t border-hub-border/40">
                        <td className="whitespace-nowrap px-4 py-3 capitalize sm:px-6">{alert.type}</td>
                        <td className="px-4 py-3 font-medium sm:px-6">{alert.title}</td>
                        <td className="max-w-[240px] px-4 py-3 text-hub-text-muted sm:px-6">{alert.message}</td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">{formatDateTime(alert.created_at)}</td>
                        <td className="px-4 py-3 sm:px-6">
                          <StatusBadge status="active" />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </ConnectTableScroll>
          ) : null}
        </ConnectCard>
      </FadeIn>
    </div>
  )
}
