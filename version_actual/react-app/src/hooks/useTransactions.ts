import { useEffect, useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../lib/supabase'
import { type Transaction } from '../data/mock'

interface SupaMov {
  id: string
  descripcion: string
  tipo: string
  cat: string
  subcat: string | null
  amount: number
  fecha: string        // ISO date 'YYYY-MM-DD'
  author: string | null
  mes: string
  recurrente?: boolean
  rec_dia?: number
}

function relativeDate(iso: string): string {
  // Supabase returns fecha as 'YYYY-MM-DD'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(iso + 'T00:00:00')
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function useTransactions(mes: string) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setTransactions(null)
    supabase
      .from('movimientos')
      .select('id,descripcion,tipo,cat,subcat,amount,fecha,author,mes')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('mes', mes)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return }
        setTransactions(
          (data as SupaMov[] ?? []).map(r => ({
            id:        r.id,
            desc:      r.descripcion,
            cat:       r.cat,
            tipo:      r.tipo,
            amount:    r.amount,
            date:      relativeDate(r.fecha),
            time:      '—',
            author:    (r.author === 'isabel' ? 'isabel' : 'anthony') as 'anthony' | 'isabel',
            accountId: '',
            mes:       r.mes,
          }))
        )
        setLoading(false)
      })
  }, [mes])

  return { transactions, loading, error }
}
