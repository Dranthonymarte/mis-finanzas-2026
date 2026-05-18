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

interface MovSum {
  cuenta_id: string
  total:     number
}

function inferType(nombre: string | null, moneda: string): string {
  if (moneda === 'VES') return 'CASH'
  if ((nombre ?? '').toLowerCase().includes('ahorro')) return 'AHORRO'
  return 'CORRIENTE'
}

function mapCuenta(r: SupaCuenta, movSums: Map<string, number>): Account {
  const movTotal = movSums.get(r.id) ?? 0
  const balance  = r.balance_override != null
    ? r.balance_override
    : (r.saldo_inicial ?? 0) + movTotal

  return {
    id:              r.id,
    type:            inferType(r.nombre, r.moneda),
    name:            r.nombre,
    currency:        r.moneda,
    balance,
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

    // Run both queries in parallel — cuentas + movimientos SUM per account
    Promise.all([
      supabase
        .from('cuentas')
        .select('id,nombre,color,moneda,saldo_inicial,balance_override,activa,owner')
        .eq('user_id', householdId)
        .eq('activa', true)
        .order('created_at'),

      supabase
        .from('movimientos')
        .select('cuenta_id,amount')
        .eq('household_id', householdId)
        .is('deleted_at', null),
    ]).then(([cuentasRes, movRes]) => {
      if (cuentasRes.error) {
        handleError(cuentasRes.error)
        setError(cuentasRes.error.message)
        setLoading(false)
        return
      }

      // Build cuenta_id → SUM(amount) map from movimientos
      const movSums = new Map<string, number>()
      for (const m of (movRes.data ?? []) as MovSum[]) {
        if (!m.cuenta_id) continue
        movSums.set(m.cuenta_id, (movSums.get(m.cuenta_id) ?? 0) + m.amount)
      }

      const cuentas = (cuentasRes.data as SupaCuenta[] ?? [])
      setAccounts(cuentas.map(r => mapCuenta(r, movSums)))
      setLoading(false)
    })
  }, [householdId])

  return { accounts, loading, error }
}
