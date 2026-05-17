import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore, type SessionPayload } from '../store/auth'

async function resolveHousehold(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single()
  return data?.household_id ?? null
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
  const setSession  = useAuthStore(s => s.setSession)
  const clearSession = useAuthStore(s => s.clearSession)

  useEffect(() => {
    // 1. Fast cached check — avoids flash of /login on reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        buildSession(
          session.user.id,
          session.user.email ?? null,
          session.user.user_metadata,
        ).then(setSession)
      }
    })

    // 2. Reactive — handles login/logout/token refresh
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

    return () => subscription.unsubscribe()
  }, [setSession, clearSession])
}
