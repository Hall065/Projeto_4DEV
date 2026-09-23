/**
 * Navigation shell / tier for deciding when the theatrical route wipe
 * (RouteTransitionLoader) should run.
 *
 * - `public` — landing, 404, etc.
 * - `auth` — login / password / request-access
 * - `app` — any authenticated shell with sidebar (Hub + Connect/Grid/SAFE)
 */

export type NavShell = 'public' | 'auth' | 'app'

const AUTH_PREFIXES = [
  '/login',
  '/recuperar-senha',
  '/redefinir-senha',
  '/solicitar-acesso',
] as const

const APP_EXACT = new Set([
  '/configuracoes',
  '/temas',
  '/perfil',
  '/acesso-negado',
  '/dashboard',
])

const APP_PREFIXES = ['/hub', '/grid', '/connect', '/safe'] as const

export function getNavShell(pathname: string): NavShell {
  const path = pathname.split('?')[0] || '/'

  if (path === '/' || path === '') return 'public'

  if (AUTH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return 'auth'
  }

  if (APP_EXACT.has(path) || APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return 'app'
  }

  return 'public'
}

/**
 * Skip full-screen AppLoader wipe when staying inside the authenticated
 * sidebar shells (Hub ↔ Hub, Hub ↔ module, module ↔ module child routes).
 * Still show wipe on public/auth ↔ app (and similar) tier changes.
 */
export function shouldSkipRouteTransitionLoader(fromPath: string, toPath: string): boolean {
  return getNavShell(fromPath) === 'app' && getNavShell(toPath) === 'app'
}
