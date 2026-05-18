import { useEffect, useState } from 'react'
import { supabase }      from '../lib/supabase'
import { useAuthStore }  from '../store/auth'
import { type Account }  from '../data/mock'
import { handleError }   from '../lib/handleError'

interface SupaCuenta {
  id:                   string
  nombre:               string
  color:                string | null
  moneda:               string
  saldo_inicial:        number | null
  balance_override:     number | null
  activa:               boolean
  owner:                string | null
}

function inferType(nombre: string | null, moneda: string): string {
  if (moneda === 'VES') return 'CASH'
  if ((nombre ?? '').toLowerCase().includes('ahorro')) return 'AHORRO'
  return 'CORRIENTE'
}

function mapCuenta(r: SupaCuenta): Account {
  return {
    id:              r.id,
    type:            inferType(r.nombre, r.moneda),
    name:            r.nombre,
    currency:        r.moneda,
    balance:         r.balance_override ?? r.saldo_inicial ?? 0,
    saldoInicial:    r.saldo_inicial ?? 0,
    balanceOverride: r.balance_override ?? null,
    trend:           0,
    color:           r.color ?? '#58b26a',
    spark:           [],
  }
}

export function useAccounts() {
  const householdId = useAuthStore(s => s.householdId)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    supabase
      .from('cuentas')
      .select('id,nombre,color,moneda,saldo_inicial,balance_override,activa,owner')
      .eq('user_id', householdId)
      .eq('activa', true)
      .order('created_at')
      .then(({ data, error: err }) => {
        if (err) { handleError(err); setError(err.message); setLoading(false); return }
        setAccounts((data as SupaCuenta[] ?? []).map(mapCuenta))
        setLoading(false)
      })
  }, [householdId])

  return { accounts, loading, error }
}
