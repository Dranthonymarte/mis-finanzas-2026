import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore, type SessionPayload } from '../store/auth'
import { DEFAULTS } from './useConfig'

// Stable reference for current store values (avoids closure staleness)
const getStore = () => useAuthStore.getState()

/** Creates household + membership + config for a brand-new user. */
async function provisionHousehold(userId: string): Promise<string> {
  const newId = crypto.randomUUID()

  // 1. Household row (ignore error — table might have extra NOT NULL columns)
  await supabase.from('households').insert({ id: newId }).then(({ error }) => {
    if (error) console.warn('[provision] households:', error.message)
  })

  // 2. Membership
  await supabase.from('household_members')
    .insert({ user_id: userId, household_id: newId, role: 'owner' })
    .then(({ error }) => {
      if (error) console.warn('[provision] household_members:', error.message)
    })

  // 3. Config bootstrap with DEFAULTS
  await supabase.from('config_usuario').insert({
    user_id:       userId,
    tipos:         DEFAULTS.tipos,
    categorias:    DEFAULTS.categorias,
    subcategorias: DEFAULTS.subcategorias,
    presupuestos:  DEFAULTS.presupuestos,
    recurrentes:   DEFAULTS.recurrentes,
    closed_months: DEFAULTS.closedMonths,
    metas_ahorro:  DEFAULTS.metasAhorro,
    fire_config:   DEFAULTS.fireConfig,
  }).then(({ error }) => {
    if (error) console.warn('[provision] config_usuario:', error.message)
  })

  return newId
}

/** Returns existing householdId, or provisions a new one for first-time users. */
async function resolveHousehold(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single()
  if (data?.household_id) return data.household_id

  // No household found — new user. Provision one.
  console.info('[useAuth] New user detected — provisioning household…')
  return provisionHousehold(userId).catch(err => {
    console.error('[useAuth] provision failed:', err)
    return null
  })
}

async function buildSession(
  userId:   string,
  email:    string | null,
  meta?:    Record<string, unknown>,
): Promise<SessionPayload> {
  const householdId = await resolveHousehold(userId)
  const userName = (
    (meta?.full_name   as string | undefined) ??
    (meta?.name        as string | undefined) ??
    (meta?.display_name as string | undefined) ??
    email?.split('@')[0] ??
    null
  )
  return { userId, householdId, email: email ?? null, userName }
}

export function useAuth() {
  const setSession   = useAuthStore(s => s.setSession)
  const clearSession = useAuthStore(s => s.clearSession)

  useEffect(() => {
    let mounted = true

    // Catastrophic-only fallback: getSession() is a LOCAL read (no network) and
    // resolves in milliseconds. This 8s timer only fires if the SDK never resolves
    // (corrupted storage) so RequireAuth is never stuck on the spinner forever.
    const readyTimer = setTimeout(() => {
      if (mounted && !getStore().authReady) getStore().setAuthReady()
    }, 8000)

    // ── Initial session — set isAuthenticated + authReady IMMEDIATELY ──
    // Critical: authReady must NOT wait on the household DB round-trip, otherwise
    // a slow query lets RequireAuth flash-redirect to /login while the user IS
    // logged in (which then bounces back → perceived "autologin"). We mark the
    // session authenticated from the token alone and resolve the household in
    // the background using the persisted cache as the immediate value.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        clearTimeout(readyTimer)
        const store = getStore()

        if (!session?.user) {
          clearSession()
          store.setAuthReady()
          return
        }

        const uid   = session.user.id
        const email = session.user.email ?? null
        // Use cached household if it belongs to this same user; else null for now
        const cachedHid = store.userId === uid ? store.householdId : null

        setSession({
          userId:      uid,
          householdId: cachedHid,
          email,
          userName:    store.userName ?? null,
        })
        store.setAuthReady()           // ← ready NOW, no DB wait, no race

        // Resolve / verify household in the background (won't block routing)
        resolveHousehold(uid).then(hid => {
          if (mounted && hid && hid !== cachedHid) {
            setSession({ userId: uid, householdId: hid, email })
          }
        }).catch(() => { /* keep cached household */ })
      })
      .catch(() => {
        // getSession() must never hang the spinner, even on storage errors
        if (!mounted) return
        clearTimeout(readyTimer)
        getStore().setAuthReady()
      })

    // ── Reactive — login, logout, token refresh ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION is handled by getSession() above — skip to avoid a
        // duplicate buildSession round-trip on every page load.
        if (event === 'INITIAL_SESSION') return

        // ONLY an explicit sign-out clears the session. Transient null
        // sessions on TOKEN_REFRESHED/USER_UPDATED must NOT bounce the user
        // to /login (that caused the redirect ping-pong / loop).
        if (event === 'SIGNED_OUT') {
          clearSession()
          getStore().setAuthReady()
          return
        }

        if (session?.user) {
          const payload = await buildSession(
            session.user.id,
            session.user.email ?? null,
            session.user.user_metadata,
          ).catch(() => null)
          if (mounted && payload) { setSession(payload); getStore().setAuthReady() }
        }
        // null session on a non-SIGNED_OUT event → ignore (transient)
      }
    )

    return () => { mounted = false; clearTimeout(readyTimer); subscription.unsubscribe() }
  }, [setSession, clearSession])
}
