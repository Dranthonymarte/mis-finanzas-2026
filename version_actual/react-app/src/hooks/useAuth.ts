import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

async function resolveSession(userId: string, setter: (uid: string, hid: string) => void) {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single()
  if (data?.household_id) setter(userId, data.household_id)
}

export function useAuth() {
  const setSession  = useAuthStore(s => s.setSession)
  const clearSession = useAuthStore(s => s.clearSession)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) resolveSession(user.id, setSession)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) resolveSession(session.user.id, setSession)
      else clearSession()
    })

    return () => subscription.unsubscribe()
  }, [setSession, clearSession])
}
