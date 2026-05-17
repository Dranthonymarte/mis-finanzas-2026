import { useMemo } from 'react'
import { type Transaction } from '../data/mock'
import { type Config } from './useConfig'

export interface KPIs {
  ingresos: number
  gastos:   number
  balance:  number
  ahorro:   number
}

export function useKPIs(transactions: Transaction[] | null, config: Config): KPIs {
  return useMemo(() => {
    if (!transactions) return { ingresos: 0, gastos: 0, balance: 0, ahorro: 0 }

    const tiposIngreso = new Set(
      config.tipos.filter(t => t.esIngreso).map(t => t.nombre)
    )
    const tiposAhorro = new Set(
      config.tipos
        .filter(t => !t.esIngreso && t.nombre.toLowerCase().includes('ahorro'))
        .map(t => t.nombre)
    )

    let ingresos = 0, gastos = 0, ahorro = 0

    for (const m of transactions) {
      const amt = Math.abs(m.amount)
      if (tiposIngreso.has(m.tipo))     ingresos += amt
      else if (tiposAhorro.has(m.tipo)) ahorro   += amt
      else                              gastos   += amt
    }

    return { ingresos, gastos, balance: ingresos - gastos, ahorro }
  }, [transactions, config.tipos])
}
