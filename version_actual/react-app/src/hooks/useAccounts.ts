import { useEffect, useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../lib/supabase'
import { type Account } from '../data/mock'

interface SupaCuenta {
  id: string
  nombre: string
  color: string | null
  saldo_inicial: number | null
  moneda: 'USD' | 'BS' | 'EUR'
  activa: boolean
}

function mapCuenta(r: SupaCuenta): Account {
  const isBs = r.moneda === 'BS'
  return {
    id:       r.id,
    type:     isBs ? 'CASH' : r.nombre.toLowerCase().includes('ahorro') ? 'AHORRO' : 'CORRIENTE',
    name:     r.nombre,
    currency: r.moneda === 'BS' ? 'VES' : r.moneda,
    balance:  r.saldo_inicial ?? 0,
    trend:    0,
    color:    r.color ?? '#58b26a',
    spark:    [],
  }
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('cuentas')
      .select('id,nombre,color,saldo_inicial,moneda,activa')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('activa', true)
      .order('nombre')
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return }
        setAccounts((data as SupaCuenta[] ?? []).map(mapCuenta))
        setLoading(false)
      })
  }, [])

  return { accounts, loading, error }
}
