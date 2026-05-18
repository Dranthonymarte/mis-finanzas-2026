import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// NOTE: storageKey is intentionally NOT customized — using the Supabase
// default (`sb-<ref>-auth-token`) keeps already-persisted sessions valid
// across deploys. Customizing it silently invalidated logged-in sessions
// → getSession() returned null on refresh → redirect-to-login loop.
export const supabase = createClient(url, key, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: false, // email/password only — no magic-link/OAuth URL parsing
  },
})

export const HOUSEHOLD_ID = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
