import { useMemo } from 'react'
import { type Transaction } from '../data/mock'
import { type Config, DEFAULTS } from './useConfig'
import { calcKPIs, type KPIResult } from '../lib/finance'

export type { KPIResult }
export interface KPIs extends KPIResult { balance: number }

export function useKPIs(transactions: Transaction[] | null, config: Config): KPIs {
  return useMemo(() => {
    if (!transactions) return { ingresos: 0, gastos: 0, ahorro: 0, neto: 0, balance: 0 }
    const tipos = config.tipos.length > 0 ? config.tipos : DEFAULTS.tipos
    const r = calcKPIs(transactions, tipos)
    return { ...r, balance: r.neto }
  }, [transactions, config.tipos])
}
