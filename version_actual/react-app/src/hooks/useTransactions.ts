import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { type Transaction } from '../data/mock'
import { mesIdToDbKey } from '../lib/mes'
import { handleError }  from '../lib/handleError'
import { readCache, writeCache } from '../lib/cache'

interface SupaMov {
  id:          string
  descripcion: string
  tipo:        string
  cat:         string
  subcat:      string | null
  amount:      number
  fecha:       string
  author:      string | null
  mes:         string
  cuenta_id:   string | null
}

function relativeDate(iso: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d    = new Date(iso + 'T00:00:00')
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}

function mapAuthor(raw: string | null): 'anthony' | 'isabel' {
  if (!raw) return 'anthony'
  const v = raw.toLowerCase()
  return v === 'i' || v === 'isabel' ? 'isabel' : 'anthony'
}

export function useTransactions(mesId: string) {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)

  const dbKey    = mesIdToDbKey(mesId)
  const cacheKey = `txns:${householdId ?? 'none'}:${dbKey}`

  const [transactions, setTransactions] = useState<Transaction[] | null>(() => readCache<Transaction[]>(cacheKey))
  const [loading,      setLoading]      = useState<boolean>(() => readCache<Transaction[]>(cacheKey) === null)
  const [error,        setError]        = useState<string | null>(null)

  const fetchData = useCallback(() => {
    if (!userId || !householdId) { setLoading(false); return }
    supabase
      .from('movimientos')
      .select('id,descripcion,tipo,cat,subcat,amount,fecha,author,mes,cuenta_id')
      .eq('household_id', householdId)
      .eq('mes', dbKey)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { handleError(err); setError(err.message); setLoading(false); return }
        const mapped: Transaction[] = (data as SupaMov[] ?? []).map(r => ({
          id:        r.id,
          desc:      r.descripcion,
          cat:       r.cat,
          subcat:    r.subcat,
          tipo:      r.tipo,
          amount:    r.amount,
          date:      relativeDate(r.fecha),
          isoDate:   r.fecha,
          time:      '',
          author:    mapAuthor(r.author),
          accountId: r.cuenta_id ?? '',
          mes:       r.mes,
        }))
        setTransactions(mapped)
        writeCache(cacheKey, mapped)
        setLoading(false)
      })
  }, [userId, householdId, dbKey, cacheKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard + hidratación cache-first (stale-while-revalidate, sin parpadeo en vacío)
    if (!userId || !householdId) { setLoading(false); return }
    // Muestra el snapshot cacheado de ESTE mes al instante, luego revalida en background
    const cached = readCache<Transaction[]>(cacheKey)
    setTransactions(cached)
    setLoading(cached === null)
    fetchData()

    // Supabase Realtime — refresca sin loader cuando hay cambio en el household
    const channel = supabase
      .channel(`movimientos:${householdId}:${dbKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movimientos', filter: `household_id=eq.${householdId}` },
        () => { fetchData() },
      )
      .subscribe()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchData()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [userId, householdId, dbKey, cacheKey, fetchData])

  return { transactions, loading, error, refetch: fetchData }
}
