// ═══════════════════════════════════════════════════
// AuthGuard — layout route guards
// RequireAuth   → redirects unauth users to /login (or /onboarding)
// RequireNoAuth → redirects authenticated users to /
// Used as layout routes in App.tsx (with <Outlet />)
// ═══════════════════════════════════════════════════

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

/**
 * Protects the main app routes.
 * Priority: onboarding not seen → /onboarding
 *           not authenticated  → /login
 *           else               → render children
 */
export function RequireAuth() {
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding)
  const isAuthenticated   = useAuthStore((s) => s.isAuthenticated)
  const location          = useLocation()

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

/**
 * Prevents authenticated users from accessing auth pages.
 * If already logged in → redirect to /.
 */
export function RequireNoAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
