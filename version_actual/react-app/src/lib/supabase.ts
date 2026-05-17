import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

export const HOUSEHOLD_ID = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
