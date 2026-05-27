import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// NOTE: storageKey is intentionally NOT customized — using the Supabase
// default (`sb-<ref>-auth-token`) keeps already-persisted sessions valid
// across deploys. Customizing it silently invalidated logged-in sessions
// → getSession() returned null on refresh → redirect-to-login loop.
//
// detectSessionInUrl MUST be true (default) for Google OAuth to work.
// After the OAuth redirect, Supabase needs to parse the hash/query params
// from the URL to extract the access_token and call onAuthStateChange
// with SIGNED_IN. Setting it to false silently dropped the OAuth callback.
export const supabase = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,  // required for OAuth (Google) callback processing
  },
})

export const HOUSEHOLD_ID = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
