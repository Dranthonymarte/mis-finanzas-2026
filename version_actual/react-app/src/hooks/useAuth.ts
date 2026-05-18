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
    // Safety net: if getSession() hangs (offline, slow network), unblock RequireAuth after 5s
    const readyTimer = setTimeout(() => {
      if (!getStore().authReady) getStore().setAuthReady()
    }, 5000)

    // 1. Fast path — getSession() returns from Supabase's in-memory cache (no network).
    //    If the persisted store already has the matching userId+householdId,
    //    we can set isAuthenticated immediately without a DB round-trip.
    //    setAuthReady() is called in BOTH branches so RequireAuth never flashes /login.
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(readyTimer)
      const setAuthReady = getStore().setAuthReady

      if (!session?.user) {
        // No active session → mark ready so RequireAuth can safely redirect to /login
        setAuthReady()
        return
      }

      const uid   = session.user.id
      const store = getStore()

      if (store.userId === uid && store.householdId) {
        // ✅ Cache-hit: set isAuthenticated instantly, verify household in background
        setSession({
          userId:      uid,
          householdId: store.householdId,
          email:       session.user.email ?? null,
          userName:    store.userName ?? null,
        })
        setAuthReady()
        // Background verify — updates store if household ever changed (rare)
        resolveHousehold(uid).then(hid => {
          if (hid && hid !== store.householdId) {
            setSession({ userId: uid, householdId: hid, email: session.user.email ?? null })
          }
        })
      } else {
        // ❄️ Cold start or different user — need DB round-trip
        buildSession(uid, session.user.email ?? null, session.user.user_metadata)
          .then(payload => { setSession(payload); setAuthReady() })
      }
    })

    // 2. Reactive — handles login, logout, token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const payload = await buildSession(
            session.user.id,
            session.user.email ?? null,
            session.user.user_metadata,
          )
          setSession(payload)
        } else {
          clearSession()
        }
      }
    )

    return () => { clearTimeout(readyTimer); subscription.unsubscribe() }
  }, [setSession, clearSession])
}
