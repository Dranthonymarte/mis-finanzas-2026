import { useEffect, useState } from 'react'
import { supabase }     from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { handleError }  from '../lib/handleError'

export interface Tasas {
  bcv: number
  eur: number
}

export const TASAS_DEFAULTS: Tasas = { bcv: 36.50, eur: 40.00 }

const HOUSEHOLD_KEY = 'anthony-isabel-2026'

export function useTasas() {
  const householdId = useAuthStore(s => s.householdId)
  const [tasas,   setTasas]   = useState<Tasas>(TASAS_DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    setLoading(true)
    supabase
      .from('tasas_cambio')
      .select('rate_bcv,rate_eur')
      .eq('user_id', householdId)
      .eq('mes', 'global')
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) handleError(err)
        if (data) setTasas({ bcv: data.rate_bcv ?? TASAS_DEFAULTS.bcv, eur: data.rate_eur ?? TASAS_DEFAULTS.eur })
        setLoading(false)
      })
  }, [householdId])

  return { tasas, loading }
}

export async function saveTasas(householdId: string, bcv: number, eur: number) {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  await supabase.from('tasas_cambio').upsert(
    { user_id: householdId, mes: 'global', rate_bcv: bcv, rate_eur: eur, updated_at: now },
    { onConflict: 'user_id,mes' }
  )

  await supabase.from('tasas_historicas').upsert(
    { fecha: today, household_key: HOUSEHOLD_KEY, rate_bcv: bcv, rate_eur: eur },
    { onConflict: 'fecha,household_key' }
  ).then(() => {/* fire-and-forget */})
}

interface HistRow { fecha: string; rate_bcv: number; rate_eur: number | null }

export async function fetchTasasHistory(): Promise<HistRow[]> {
  const { data } = await supabase
    .from('tasas_historicas')
    .select('fecha,rate_bcv,rate_eur')
    .eq('household_key', HOUSEHOLD_KEY)
    .order('fecha', { ascending: false })
    .limit(30)
  return (data ?? []) as HistRow[]
}
