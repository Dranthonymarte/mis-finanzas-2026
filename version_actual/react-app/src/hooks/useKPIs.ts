import { useMemo } from 'react'
import { type Transaction } from '../data/mock'
import { type Config, DEFAULTS } from './useConfig'

export interface KPIs {
  ingresos: number
  gastos:   number
  balance:  number
  ahorro:   number
}

export function useKPIs(transactions: Transaction[] | null, config: Config): KPIs {
  return useMemo(() => {
    if (!transactions) return { ingresos: 0, gastos: 0, balance: 0, ahorro: 0 }

    // Guard: if tipos is somehow empty (DB returned []), fall back to DEFAULTS
    const tipos = config.tipos.length > 0 ? config.tipos : DEFAULTS.tipos

    const tiposIngreso = new Set(
      tipos.filter(t => t.esIngreso).map(t => t.nombre)
    )
    const tiposAhorro = new Set(
      tipos
        .filter(t => !t.esIngreso && (t.nombre ?? '').toLowerCase().includes('ahorro'))
        .map(t => t.nombre)
    )

    let ingresos = 0, gastos = 0, ahorro = 0

    for (const m of transactions) {
      if (!m?.tipo) continue
      const amt = parseFloat(String(m.amount)) || 0
      if (tiposIngreso.has(m.tipo))     ingresos += Math.abs(amt)
      else if (tiposAhorro.has(m.tipo)) ahorro   += Math.abs(amt)
      else                              gastos   += Math.abs(amt)
    }

    return { ingresos, gastos, balance: ingresos - gastos, ahorro }
  }, [transactions, config.tipos])  // eslint-disable-line react-hooks/exhaustive-deps
}
