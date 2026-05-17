import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { type Transaction } from '../data/mock'
import { mesIdToDbKey } from '../lib/mes'

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
  recurrente:  boolean | null
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

/**
 * @param mesId — "may-26" format (prefs store) OR "Mayo" (legacy).
 *                Internally converted to DB key via mesIdToDbKey.
 */
export function useTransactions(mesId: string) {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)

  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // Convert "may-26" → "Mayo" for DB; if already "Mayo" style, pass through
  const dbKey = mesIdToDbKey(mesId)

  useEffect(() => {
    if (!userId || !householdId) { setLoading(false); return }

    setLoading(true)
    setTransactions(null)

    supabase
      .from('movimientos')
      .select('id,descripcion,tipo,cat,subcat,amount,fecha,author,mes,cuenta_id,recurrente')
      .eq('household_id', householdId)
      .eq('mes', dbKey)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return }
        setTransactions(
          (data as SupaMov[] ?? []).map(r => ({
            id:         r.id,
            desc:       r.descripcion,
            cat:        r.cat,
            tipo:       r.tipo,
            amount:     r.amount,
            date:       relativeDate(r.fecha),
            time:       '—',
            author:     mapAuthor(r.author),
            accountId:  r.cuenta_id ?? '',
            mes:        r.mes,
            recurrente: r.recurrente ?? false,
          }))
        )
        setLoading(false)
      })
  }, [userId, householdId, dbKey])

  return { transactions, loading, error }
}
