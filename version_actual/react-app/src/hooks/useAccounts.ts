import { useEffect, useState, useCallback } from 'react'
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

function mapCuenta(r: SupaCuenta, allMovs: MovSum[], bcv: number, prevMovs: MovSum[]): Account {
  let balance: number

  if (r.balance_override != null && r.balance_override_date != null) {
    const movAfter = allMovs.filter(
      m => m.cuenta_id === r.id && m.fecha >= r.balance_override_date!,
    )
    const delta = movAfter.reduce((s, m) => s + (parseFloat(String(m.amount)) || 0), 0)
    balance = r.balance_override + delta
  } else {
    const movTotal = allMovs
      .filter(m => m.cuenta_id === r.id)
      .reduce((s, m) => s + (parseFloat(String(m.amount)) || 0), 0)
    balance = r.balance_override ?? ((r.saldo_inicial ?? 0) + movTotal)
  }

  const balanceUSD = r.moneda === 'VES' && bcv > 0 ? balance / bcv : balance

  // Trend: variación porcentual vs mes anterior
  const prevBalance = prevMovs
    .filter(m => m.cuenta_id === r.id)
    .reduce((s, m) => s + (parseFloat(String(m.amount)) || 0), 0) + (r.saldo_inicial ?? 0)
  const trend = prevBalance !== 0
    ? Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100)
    : 0

  return {
    id:              r.id,
    type:            inferType(r.nombre, r.moneda),
    name:            r.nombre,
    currency:        r.moneda,
    balance,
    balanceUSD,
    saldoInicial:    r.saldo_inicial ?? 0,
    balanceOverride: r.balance_override ?? null,
    trend,
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

  const fetchData = useCallback(() => {
    if (!householdId) { setLoading(false); return }
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)

    Promise.all([
      supabase
        .from('cuentas')
        .select('id,nombre,color,moneda,saldo_inicial,balance_override,balance_override_date,activa,owner')
        .eq('household_id', householdId)
        .eq('activa', true)
        .order('created_at'),
      supabase
        .from('movimientos')
        .select('cuenta_id,amount,fecha')
        .eq('household_id', householdId)
        .is('deleted_at', null),
      supabase
        .from('movimientos')
        .select('cuenta_id,amount,fecha')
        .eq('household_id', householdId)
        .lt('fecha', thisMonthStart)
        .gte('fecha', prevMonthStart)
        .is('deleted_at', null),
    ]).then(([cuentasRes, movRes, prevMovRes]) => {
      if (cuentasRes.error) { handleError(cuentasRes.error); setError(cuentasRes.error.message); setLoading(false); return }
      const movData     = (movRes.data     ?? []) as MovSum[]
      const prevMovData = (prevMovRes.data ?? []) as MovSum[]
      const cuentas     = (cuentasRes.data as SupaCuenta[] ?? [])
      setAccounts(cuentas.map(r => mapCuenta(r, movData, tasas.bcv, prevMovData)))
      setLoading(false)
    })
  }, [householdId, tasas.bcv])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard: clear loader when no household yet (cache-first auth)
    if (!householdId) { setLoading(false); return }
    fetchData()

    // Realtime: refresca cuando cambian cuentas o movimientos del household
    const ch1 = supabase
      .channel(`cuentas:${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas', filter: `household_id=eq.${householdId}` }, () => fetchData())
      .subscribe()

    const ch2 = supabase
      .channel(`movimientos-accounts:${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos', filter: `household_id=eq.${householdId}` }, () => fetchData())
      .subscribe()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchData()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [householdId, fetchData])

  return { accounts, loading, error, refetch: fetchData }
}
