import { useEffect, useState } from 'react'
import { supabase }      from '../lib/supabase'
import { useAuthStore }  from '../store/auth'
import { type Account }  from '../data/mock'
import { handleError }   from '../lib/handleError'
import { useTasas }      from './useTasas'

interface SupaCuenta {
  id:                    string
  nombre:                string
  color:                 string | null
  moneda:                string
  saldo_inicial:         number | null
  balance_override:      number | null
  balance_override_date: string | null
  activa:                boolean
  owner:                 string | null
}

interface MovSum {
  cuenta_id: string
  amount:    number | string
  fecha:     string
}

function inferType(nombre: string | null, moneda: string): string {
  if (moneda === 'VES') return 'CASH'
  if ((nombre ?? '').toLowerCase().includes('ahorro')) return 'AHORRO'
  return 'CORRIENTE'
}

function mapCuenta(r: SupaCuenta, allMovs: MovSum[], bcv: number): Account {
  let balance: number

  if (r.balance_override != null && r.balance_override_date != null) {
    // Sum only movements on or after the override date
    const movAfter = allMovs.filter(
      m => m.cuenta_id === r.id && m.fecha >= r.balance_override_date!,
    )
    const delta = movAfter.reduce((s, m) => s + (parseFloat(String(m.amount)) || 0), 0)
    balance = r.balance_override + delta
  } else {
    // Original logic: saldo_inicial + all movements (or plain override with no date)
    const movTotal = allMovs
      .filter(m => m.cuenta_id === r.id)
      .reduce((s, m) => s + (parseFloat(String(m.amount)) || 0), 0)
    balance = r.balance_override ?? ((r.saldo_inicial ?? 0) + movTotal)
  }

  // Normalize to USD so patrimonio/saldo aggregates are currency-coherent.
  // VES balances are divided by the BCV rate; USD stays as-is.
  const balanceUSD = r.moneda === 'VES' && bcv > 0 ? balance / bcv : balance

  return {
    id:              r.id,
    type:            inferType(r.nombre, r.moneda),
    name:            r.nombre,
    currency:        r.moneda,
    balance,
    balanceUSD,
    saldoInicial:    r.saldo_inicial ?? 0,
    balanceOverride: r.balance_override ?? null,
    trend:           0,
    color:           r.color ?? '#58b26a',
    spark:           [],
  }
}

export function useAccounts() {
  const householdId = useAuthStore(s => s.householdId)
  const { tasas }   = useTasas()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    function fetchData() {
      // Run both queries in parallel — cuentas + movimientos SUM per account
      Promise.all([
        supabase
          .from('cuentas')
          .select('id,nombre,color,moneda,saldo_inicial,balance_override,balance_override_date,activa,owner')
          .eq('household_id', householdId!)
          .eq('activa', true)
          .order('created_at'),

        supabase
          .from('movimientos')
          .select('cuenta_id,amount,fecha')
          .eq('household_id', householdId!)
          .is('deleted_at', null),
      ]).then(([cuentasRes, movRes]) => {
        if (cuentasRes.error) {
          handleError(cuentasRes.error)
          setError(cuentasRes.error.message)
          setLoading(false)
          return
        }

        const movData = (movRes.data ?? []) as MovSum[]
        const cuentas = (cuentasRes.data as SupaCuenta[] ?? [])
        setAccounts(cuentas.map(r => mapCuenta(r, movData, tasas.bcv)))
        setLoading(false)
      })
    }

    fetchData()

    // Refetch when user returns to tab (app switching on mobile)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchData()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [householdId, tasas.bcv])

  return { accounts, loading, error }
}
