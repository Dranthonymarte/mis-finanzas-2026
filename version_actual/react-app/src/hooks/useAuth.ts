import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore, type SessionPayload } from '../store/auth'

// Stable reference for current store values (avoids closure staleness)
const getStore = () => useAuthStore.getState()

/**
 * householdId is RESOLVED from `household_members`, NOT assumed === userId.
 *
 * Verified against live DB (2026-05-18): data tables (movimientos, cuentas,
 * dinero_fuera) are scoped by `household_id`. Anthony (uid fa3f7b3b) owns
 * household fa3f7b3b; Isabel (uid 455c23cd) is an accepted *partner* of the
 * SAME household fa3f7b3b. Assuming householdId===userId made Isabel query
 * her own uid → empty household, and made Anthony miss her rows.
 *
 * SAFETY (this file caused the 9b9c0a8 prod loop — do not regress):
 * - isAuthenticated/authReady are set IMMEDIATELY from cache/getSession
 *   with a provisional householdId = userId. NEVER blocked on the query.
 * - resolveHouseholdId() runs in the BACKGROUND: never throws, never
 *   clears the session, never provisions/creates a household. On any error
 *   or no membership → falls back to userId.
 * - the resolved householdId is persisted → F5 is instant AND correct.
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
  // Provisional householdId = userId until resolveHouseholdId() confirms.
  return { userId, householdId: userId, email: email ?? null, userName }
}

/**
 * Build a session payload that PRESERVES an already-resolved householdId.
 *
 * Fixes "datos desaparecen random": getSession() and TOKEN_REFRESHED (~hourly)
 * both re-emit the session. Using buildSession() there resets householdId to
 * the provisional uid, so for a *partner* (Isabel: uid 455c23cd, household
 * fa3f7b3b) every query in the window before resolveAndSet finishes scopes to
 * the wrong household → empty results → data appears to vanish. When the user
 * is unchanged and the store already holds a resolved household (≠ uid), keep
 * it. A *different* uid (real account switch) falls back to provisional and
 * resolveAndSet corrects it. Auth stays non-blocking — no regression of 9b9c0a8.
 */
function sessionFor(
  userId: string,
  email:  string | null,
  meta?:  Record<string, unknown>,
): SessionPayload {
  const base = buildSession(userId, email, meta)
  const prev = getStore()
  if (prev.userId === userId && prev.householdId && prev.householdId !== userId) {
    return { ...base, householdId: prev.householdId }
  }
  return base
}

/**
 * Resolve the user's active household from `household_members`. Prefers a
 * `partner` membership (the shared family household) over an `owner` one
 * (a user's legacy solo household). Pure read — never throws, never writes.
 */
async function resolveHouseholdId(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')
    if (error || !data || data.length === 0) return userId
    const partner = data.find(r => r.role === 'partner')
    return (partner?.household_id ?? data[0].household_id ?? userId) as string
  } catch {
    return userId
  }
}

export function useAuth() {
  const setSession   = useAuthStore(s => s.setSession)
  const clearSession = useAuthStore(s => s.clearSession)

  useEffect(() => {
    let mounted = true

    // Resolve real household in the BACKGROUND and update the store when
    // it differs. Never blocks auth, never throws (resolveHouseholdId is
    // already guarded). Persisted → next F5 is instant via cached.householdId.
    const resolveAndSet = (uid: string) => {
      resolveHouseholdId(uid).then(hid => {
        if (mounted && hid && getStore().householdId !== hid) {
          getStore().setHouseholdId(hid)
        }
      })
    }

    // ── Cache-first: render the app INSTANTLY from the persisted store ──
    // userId/householdId are persisted in localStorage. If we have them,
    // mark the session ready immediately (<50ms) so the spinner never
    // lingers. getSession() then validates in the background.
    const cached = getStore()
    if (cached.userId) {
      setSession({
        userId:      cached.userId,
        householdId: cached.householdId ?? cached.userId,
        email:       cached.userEmail ?? null,
        userName:    cached.userName ?? null,
      })
      cached.setAuthReady()
      resolveAndSet(cached.userId)
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
        setSession(sessionFor(uid, email ?? null, session.user.user_metadata))
        getStore().setAuthReady()
        resolveAndSet(uid)
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
          setSession(sessionFor(
            session.user.id,
            session.user.email ?? null,
            session.user.user_metadata,
          ))
          getStore().setAuthReady()
          resolveAndSet(session.user.id)
        }
        // null session on a non-SIGNED_OUT event → ignore (transient)
      }
    )

    return () => { mounted = false; clearTimeout(readyTimer); subscription.unsubscribe() }
  }, [setSession, clearSession])
}
