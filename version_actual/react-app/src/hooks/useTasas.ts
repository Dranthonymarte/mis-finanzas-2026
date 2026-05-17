import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export interface Tasas {
  bcv: number
  eur: number
  mes: string
}

const DEFAULTS: Tasas = { bcv: 36.50, eur: 40.00, mes: '' }

interface SupaTasa {
  mes:      string
  rate_bcv: number | null
  rate_eur: number | null
}

export function useTasas(mes: string) {
  const userId = useAuthStore(s => s.userId)
  const [tasas,   setTasas]   = useState<Tasas>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    setLoading(true)
    supabase
      .from('tasas_cambio')
      .select('mes,rate_bcv,rate_eur')
      .eq('user_id', userId)
      .eq('mes', mes)
      .maybeSingle()
      .then(({ data }) => {
        const r = data as SupaTasa | null
        if (r) setTasas({ bcv: r.rate_bcv ?? DEFAULTS.bcv, eur: r.rate_eur ?? DEFAULTS.eur, mes: r.mes })
        setLoading(false)
      })
  }, [userId, mes])

  return { tasas, loading }
}
