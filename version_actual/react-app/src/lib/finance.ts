// finance.ts — funciones de cálculo financiero unificadas
import { type Transaction } from '../data/mock'
import { type Tipo } from '../hooks/useConfig'

export interface KPIResult {
  ingresos: number
  gastos:   number
  ahorro:   number
  neto:     number   // ingresos - gastos (excluye ahorro)
}

export function calcKPIs(txns: Transaction[], tipos: Tipo[]): KPIResult {
  if (!txns.length) return { ingresos: 0, gastos: 0, ahorro: 0, neto: 0 }
  const ingSet = new Set(tipos.filter(t => t.esIngreso).map(t => t.nombre))
  const savSet = new Set(tipos.filter(t => !t.esIngreso && (t.nombre ?? '').toLowerCase().includes('ahorro')).map(t => t.nombre))
  let ingresos = 0, gastos = 0, ahorro = 0
  for (const m of txns) {
    if (!m?.tipo) continue
    const amt = Math.abs(parseFloat(String(m.amount)) || 0)
    if (ingSet.has(m.tipo))      ingresos += amt
    else if (savSet.has(m.tipo)) ahorro   += amt
    else                         gastos   += amt
  }
  return { ingresos, gastos, ahorro, neto: ingresos - gastos }
}
