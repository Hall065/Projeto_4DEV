import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from '../components/ui/PageLoader'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { LandingPage } from '../pages/LandingPage'
import { HubLayout } from '../layouts/HubLayout'
import { ConnectLayout } from '../layouts/ConnectLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { LoginPage } from '../pages/LoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { RequestAccessPage } from '../pages/RequestAccessPage'
import { ApplicationHubPage } from '../pages/ApplicationHubPage'
import { GridLayout } from '../layouts/GridLayout'
import { GridDashboardPage } from '../pages/grid/GridDashboardPage'
import { GridTicketsPage } from '../pages/grid/GridTicketsPage'
import { GridTicketControlPage } from '../pages/grid/GridTicketControlPage'
import { GridTasksPage } from '../pages/grid/GridTasksPage'
import { GridReportsPage } from '../pages/grid/GridReportsPage'
import { GridInventoryPage } from '../pages/grid/GridInventoryPage'
import { GridUsersPage } from '../pages/grid/GridUsersPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ThemesPage } from '../pages/ThemesPage'
import { ProfilePage } from '../pages/ProfilePage'
import { ProtectedRoute } from './ProtectedRoute'
import { ModuleAccessRoute } from './ModuleAccessRoute'
import { PermissionRoute } from './PermissionRoute'
import { ArchiveAccessRoute } from './ArchiveAccessRoute'
import { AdminRoute } from './AdminRoute'
import { HubUsersPage } from '../pages/hub/HubUsersPage'
import { HubArchivePage } from '../pages/hub/HubArchivePage'
import { ConnectOverviewPage } from '../pages/connect/ConnectOverviewPage'
import { PeoplePage } from '../pages/connect/PeoplePage'
import { StudentsPage } from '../pages/connect/StudentsPage'
import { TeachersPage } from '../pages/connect/TeachersPage'
import { ClassesPage } from '../pages/connect/ClassesPage'
import { CoursesPage } from '../pages/connect/CoursesPage'
import { AttendancePage } from '../pages/connect/AttendancePage'
import { CalendarPage } from '../pages/connect/CalendarPage'
import { AttendanceManagePage } from '../pages/connect/AttendanceManagePage'
import { ConnectReportsPage } from '../pages/connect/ConnectReportsPage'
import { ContractsPage } from '../pages/connect/ContractsPage'
import { SalaryPage } from '../pages/connect/SalaryPage'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SafeLayout } from '../components/safe/SafeLayout'
import { SafeDashboardPage } from '../pages/safe/SafeDashboardPage'
import { SafeStudentsPage } from '../pages/safe/SafeStudentsPage'
import { SafeAuthorizationsPage } from '../pages/safe/SafeAuthorizationsPage'
import { SafeApprovalsPage } from '../pages/safe/SafeApprovalsPage'
import { SafePortariaPage } from '../pages/safe/SafePortariaPage'
import { SafeAuthorizationDetailPage } from '../pages/safe/SafeAuthorizationDetailPage'
import { prefetchCampusMap3DAssets } from '../utils/campusMapAssets'
import {
  preloadGridMapPage,
  preloadLocationPage,
  preloadSpreadsheetPage,
} from '../utils/preloadAssets'

/** Suspense stays until page chunk AND campus map/Three assets are warm. */
const LocationPage = lazy(async () => {
  const [mod] = await Promise.all([preloadLocationPage(), prefetchCampusMap3DAssets()])
  return { default: mod.LocationPage }
})
const GridTaskMapPage = lazy(async () => {
  const [mod] = await Promise.all([preloadGridMapPage(), prefetchCampusMap3DAssets()])
  return { default: mod.GridTaskMapPage }
})
const SpreadsheetHubPage = lazy(async () => {
  const mod = await preloadSpreadsheetPage()
  return { default: mod.SpreadsheetHubPage }
})

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/solicitar-acesso" element={<RequestAccessPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<HubLayout />}>
          <Route path="/hub" element={<ApplicationHubPage />} />
          <Route element={<ArchiveAccessRoute />}>
            <Route path="/hub/arquivo" element={<HubArchivePage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/hub/usuarios" element={<HubUsersPage />} />
          </Route>
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/temas" element={<ThemesPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        </Route>

        <Route element={<ModuleAccessRoute module="grid" />}>
        <Route element={<PermissionRoute module="grid" />}>
        <Route element={<GridLayout />}>
          <Route path="/grid" element={<GridDashboardPage />} />
          <Route path="/grid/chamados" element={<GridTicketsPage />} />
          <Route path="/grid/controle" element={<GridTicketControlPage />} />
          <Route path="/grid/tarefas" element={<GridTasksPage />} />
          <Route path="/grid/relatorios" element={<GridReportsPage />} />
          <Route path="/grid/estoque" element={<GridInventoryPage />} />
          <Route path="/grid/mapa" element={<LazyPage><GridTaskMapPage /></LazyPage>} />
          <Route path="/grid/usuarios" element={<GridUsersPage />} />
          <Route path="/grid/planilhas" element={<LazyPage><SpreadsheetHubPage module="grid" /></LazyPage>} />
        </Route>
        </Route>
        </Route>

        <Route element={<ModuleAccessRoute module="connect" />}>
        <Route element={<PermissionRoute module="connect" />}>
        <Route element={<ConnectLayout />}>
          <Route path="/connect" element={<ConnectOverviewPage />} />
          <Route path="/connect/pessoas" element={<PeoplePage />} />
          <Route path="/connect/alunos" element={<StudentsPage />} />
          <Route path="/connect/professores" element={<TeachersPage />} />
          <Route path="/connect/turmas" element={<ClassesPage />} />
          <Route path="/connect/cursos" element={<CoursesPage />} />
          <Route path="/connect/calendario" element={<CalendarPage />} />
          <Route path="/connect/frequencia" element={<AttendancePage />} />
          <Route path="/connect/gerenciar-frequencia" element={<AttendanceManagePage />} />
          <Route path="/connect/relatorio" element={<ConnectReportsPage />} />
          <Route path="/connect/localizacao" element={<LazyPage><LocationPage /></LazyPage>} />
          <Route path="/connect/contratos/alunos" element={<ContractsPage />} />
          <Route path="/connect/salario" element={<SalaryPage />} />
          <Route path="/connect/planilhas" element={<LazyPage><SpreadsheetHubPage module="connect" /></LazyPage>} />
        </Route>
        </Route>
        </Route>

        <Route element={<ModuleAccessRoute module="safe" />}>
        <Route element={<PermissionRoute module="safe" />}>
        <Route element={<SafeLayout />}>
          <Route path="/safe" element={<SafeDashboardPage />} />
          <Route path="/safe/alunos" element={<SafeStudentsPage />} />
          <Route path="/safe/autorizacoes" element={<SafeAuthorizationsPage />} />
          <Route path="/safe/autorizacoes/:id" element={<SafeAuthorizationDetailPage />} />
          <Route path="/safe/aprovacoes" element={<SafeApprovalsPage />} />
          <Route path="/safe/portaria" element={<SafePortariaPage />} />
        </Route>
        </Route>
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Navigate to="/hub" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
