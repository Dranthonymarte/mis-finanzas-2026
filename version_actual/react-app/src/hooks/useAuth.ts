import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore, type SessionPayload } from '../store/auth'

// Stable reference for current store values (avoids closure staleness)
const getStore = () => useAuthStore.getState()

/**
 * householdId === userId, ALWAYS.
 *
 * Every table in this app is keyed by `user_id` (movimientos, cuentas,
 * config_usuario, listas_compras, dinero_fuera, fondo_emergencia ...).
 * The previous `household_members` lookup used `.single()`, which THROWS
 * when the user has duplicate membership rows → the code then thought it
 * was a "new user" and `provisionHousehold()` created a fresh household
 * with a random UUID. That made `householdId` drift away from the real
 * data key (fa3f7b3b…) → cuentas/movimientos/patrimonio came back empty
 * ("datos desconfigurados") and `buildSession` hung ("queda cargando").
 *
 * Using `userId` directly removes the fragile query, the data corruption
 * and the network round-trip — auth resolves instantly.
 */
function buildSession(
  userId: string,
  email:  string | null,
  meta?:  Record<string, unknown>,
): SessionPayload {
  const userName = (
    (meta?.full_name    as string | undefined) ??
    (meta?.name         as string | undefined) ??
    (meta?.display_name as string | undefined) ??
    email?.split('@')[0] ??
    null
  )
  return { userId, householdId: userId, email: email ?? null, userName }
}

export function useAuth() {
  const setSession   = useAuthStore(s => s.setSession)
  const clearSession = useAuthStore(s => s.clearSession)

  useEffect(() => {
    let mounted = true

    // ── Cache-first: render the app INSTANTLY from the persisted store ──
    // userId/householdId are persisted in localStorage. If we have them,
    // mark the session ready immediately (<50ms) so the spinner never
    // lingers. getSession() then validates in the background.
    const cached = getStore()
    if (cached.userId) {
      setSession({
        userId:      cached.userId,
        householdId: cached.userId,        // householdId === userId
        email:       cached.userEmail ?? null,
        userName:    cached.userName ?? null,
      })
      cached.setAuthReady()
    }

    // Catastrophic-only fallback (3.5s). getSession() is a LOCAL read and
    // resolves in ms; this only fires if the SDK never resolves so the
    // spinner is never stuck longer than ~3s.
    const readyTimer = setTimeout(() => {
      if (mounted && !getStore().authReady) getStore().setAuthReady()
    }, 3500)

    // ── Validate the real session in the background ──
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        clearTimeout(readyTimer)

        if (!session?.user) {
          // No real session → log out (only if we aren't mid sign-in)
          clearSession()
          getStore().setAuthReady()
          return
        }

        const { id: uid, email } = session.user
        setSession(buildSession(uid, email ?? null, session.user.user_metadata))
        getStore().setAuthReady()
      })
      .catch(() => {
        // Never hang the spinner, even on storage errors
        if (!mounted) return
        clearTimeout(readyTimer)
        getStore().setAuthReady()
      })

    // ── Reactive — login, logout, token refresh ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION is handled by getSession() above.
        if (event === 'INITIAL_SESSION') return

        // ONLY an explicit sign-out clears the session. A transient null
        // on TOKEN_REFRESHED/USER_UPDATED must NOT bounce to /login.
        if (event === 'SIGNED_OUT') {
          clearSession()
          getStore().setAuthReady()
          return
        }

        if (session?.user) {
          setSession(buildSession(
            session.user.id,
            session.user.email ?? null,
            session.user.user_metadata,
          ))
          getStore().setAuthReady()
        }
        // null session on a non-SIGNED_OUT event → ignore (transient)
      }
    )

    return () => { mounted = false; clearTimeout(readyTimer); subscription.unsubscribe() }
  }, [setSession, clearSession])
}
