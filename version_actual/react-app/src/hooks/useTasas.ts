import { useEffect, useRef, useState } from 'react'
import { supabase }     from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { usePrefsStore } from '../store/prefs'
import { mesIdToDbKey } from '../lib/mes'
import { handleError }  from '../lib/handleError'

export interface Tasas {
  bcv: number
  eur: number
}

export const TASAS_DEFAULTS: Tasas = { bcv: 36.50, eur: 40.00 }

const HOUSEHOLD_KEY   = 'anthony-isabel-2026'
const BCV_AUTO_TS_KEY = 'mis_finanzas_bcv_auto_ts'
const EUR_AUTO_TS_KEY = 'mis_finanzas_eur_auto_ts'
const ONE_MIN         = 60 * 1000
const TASAS_CACHE_KEY = 'mis_finanzas_tasas_v1'

function loadCachedTasas(): Tasas {
  try {
    const raw = localStorage.getItem(TASAS_CACHE_KEY)
    if (raw) return JSON.parse(raw) as Tasas
  } catch { /* ignore */ }
  return TASAS_DEFAULTS
}

export function useTasas() {
  const householdId = useAuthStore(s => s.householdId)
  const mesActivo   = usePrefsStore(s => s.mesActivo)
  const [tasas,   setTasas]   = useState<Tasas>(loadCachedTasas)
  const [loading, setLoading] = useState(true)
  const tasasRef = useRef<Tasas>(TASAS_DEFAULTS)
  tasasRef.current = tasas

  const cacheAndSet = (t: Tasas) => {
    setTasas(t)
    try { localStorage.setItem(TASAS_CACHE_KEY, JSON.stringify(t)) } catch { /* ignore */ }
  }

  // ── BCV auto-fetch every 1 min ──
  useEffect(() => {
    if (!householdId) return

    const doFetchBCV = () => {
      const now = Date.now()
      const last = parseInt(localStorage.getItem(BCV_AUTO_TS_KEY) ?? '0', 10)
      if (now - last < ONE_MIN) return
      localStorage.setItem(BCV_AUTO_TS_KEY, String(now))

      fetch('https://ve.dolarapi.com/v1/dolares/oficial')
        .then(r => r.ok ? (r.json() as Promise<{ promedio?: number }>) : Promise.reject())
        .then(data => {
          const rate = data.promedio
          if (!rate || rate <= 0) return
          const next = { ...tasasRef.current, bcv: rate }
          cacheAndSet(next)
          void saveTasas(householdId, rate, tasasRef.current.eur, mesActivo)
        })
        .catch(() => {})
    }

    doFetchBCV()
    const id = setInterval(doFetchBCV, ONE_MIN)
    return () => clearInterval(id)
  }, [householdId, mesActivo])

  // ── EUR auto-fetch every 1 min ──
  useEffect(() => {
    if (!householdId) return

    const doFetchEUR = () => {
      const now = Date.now()
      const last = parseInt(localStorage.getItem(EUR_AUTO_TS_KEY) ?? '0', 10)
      if (now - last < ONE_MIN) return
      localStorage.setItem(EUR_AUTO_TS_KEY, String(now))

      fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
        .then(r => r.ok ? (r.json() as Promise<{ rates?: { EUR?: number } }>) : Promise.reject())
        .then(data => {
          const eurPerUsd = data.rates?.EUR
          if (!eurPerUsd || eurPerUsd <= 0) return
          const vesPerEur = tasasRef.current.bcv / eurPerUsd
          const next = { ...tasasRef.current, eur: vesPerEur }
          cacheAndSet(next)
          void saveTasas(householdId, tasasRef.current.bcv, vesPerEur, mesActivo)
        })
        .catch(() => {})
    }

    doFetchEUR()
    const id = setInterval(doFetchEUR, ONE_MIN)
    return () => clearInterval(id)
  }, [householdId, mesActivo])

  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    // Try month-specific row first ("Mayo"), fallback to legacy 'global'
    const mesKey = mesIdToDbKey(mesActivo)
    setLoading(true)

    supabase
      .from('tasas_cambio')
      .select('rate_bcv,rate_eur')
      .eq('user_id', householdId)
      .in('mes', [mesKey, 'global'])
      .order('mes', { ascending: false })   // month-specific sorts after 'global' alphabetically
      .limit(2)
      .then(({ data, error: err }) => {
        if (err) handleError(err)
        if (data && data.length > 0) {
          // Prefer month-specific row if present, otherwise global
          const monthRow = data.find(r => (r as { mes?: string }).mes === mesKey) ?? data[0]
          setTasas({
            bcv: (monthRow as { rate_bcv: number }).rate_bcv ?? TASAS_DEFAULTS.bcv,
            eur: (monthRow as { rate_eur: number | null }).rate_eur ?? TASAS_DEFAULTS.eur,
          })
        }
        setLoading(false)
      })
  }, [householdId, mesActivo])

  return { tasas, loading }
}

/** Save current exchange rate for the given month + update global fallback. */
export async function saveTasas(
  householdId: string,
  bcv: number,
  eur: number,
  mesId?: string,          // "may-26" format — defaults to 'global' if omitted
) {
  const now    = new Date().toISOString()
  const today  = now.slice(0, 10)
  const mesKey = mesId ? mesIdToDbKey(mesId) : 'global'

  // Upsert the month-specific (or global) row
  await supabase.from('tasas_cambio').upsert(
    { user_id: householdId, mes: mesKey, rate_bcv: bcv, rate_eur: eur, updated_at: now },
    { onConflict: 'user_id,mes' },
  )

  // Also keep 'global' row updated for backward compatibility
  if (mesKey !== 'global') {
    await supabase.from('tasas_cambio').upsert(
      { user_id: householdId, mes: 'global', rate_bcv: bcv, rate_eur: eur, updated_at: now },
      { onConflict: 'user_id,mes' },
    )
  }

  // Historical record
  await supabase.from('tasas_historicas').upsert(
    { fecha: today, household_key: HOUSEHOLD_KEY, rate_bcv: bcv, rate_eur: eur },
    { onConflict: 'fecha,household_key' },
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
