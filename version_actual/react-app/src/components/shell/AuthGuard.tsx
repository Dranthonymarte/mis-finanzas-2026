// ═══════════════════════════════════════════════════
// AuthGuard — layout route guards
// RequireAuth   → redirects unauth users to /login (or /onboarding)
// RequireNoAuth → redirects authenticated users to /
// Used as layout routes in App.tsx (with <Outlet />)
// ═══════════════════════════════════════════════════

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { useLockStore } from '../../store/lock'
import { hasPin } from '../../lib/pin'
import PinLockScreen from './PinLockScreen'

/**
 * Protects the main app routes.
 * Priority: authReady=false  → loading splash (prevents flash-redirect on F5)
 *           onboarding unseen → /onboarding
 *           not authenticated → /login
 *           PIN set + locked  → PinLockScreen (candado local Layer 2)
 *           else              → render children
 */
export function RequireAuth() {
  const authReady         = useAuthStore((s) => s.authReady)
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding)
  const isAuthenticated   = useAuthStore((s) => s.isAuthenticated)
  const unlocked          = useLockStore((s) => s.unlocked)
  const unlock            = useLockStore((s) => s.unlock)
  const location          = useLocation()

  // Block until getSession() resolves — prevents /login flash on reload when user IS logged in
  if (!authReady) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--ink-1)',
        display: 'grid', placeItems: 'center',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid var(--ink-4)',
          borderTopColor: 'var(--amber)',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    )
  }

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  // Layer 2 — candado local: la sesión está viva pero la app se reabrió sin
  // desbloquear. Huella primero (auto), PIN de respaldo. Solo si hay PIN.
  if (hasPin() && !unlocked) {
    return <PinLockScreen onUnlocked={unlock} />
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
