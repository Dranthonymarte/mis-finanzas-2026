// ═══════════════════════════════════════════════════
// useDineroFuera — fuente única CRUD de la tabla `dinero_fuera`
//
// Expone las filas del hogar + el total "Me deben activo" (USD),
// reutilizable por DineroFuera.tsx y, más adelante, por Patrimonio.
//
//   tipo='prestamo' → "Me deben" (alguien me debe)
//   tipo='deuda'    → "Yo debo"
//
// Montos en USD (columna monto_original). Lecturas filtradas por
// household_id; los inserts deben fijar user_id + household_id.
// ═══════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { supabase }     from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { handleError }  from '../lib/handleError'

export interface Abono { fecha: string; monto: number }

export interface DineroFueraRow {
  id:                string
  tipo:              string            // 'prestamo' | 'deuda'
  nombre:            string
  concepto:          string | null
  monto_original:    number
  monto_abonado:     number
  abonos:            Abono[]
  fecha_inicio:      string | null
  fecha_vencimiento: string | null
  fecha_pago:        string | null
  pagado:            boolean
}

const COLS =
  'id,tipo,nombre,concepto,monto_original,monto_abonado,abonos,fecha_inicio,fecha_vencimiento,fecha_pago,pagado'

/** Saldo pendiente de una fila (USD). Nunca negativo. */
export function saldoPendiente(r: DineroFueraRow): number {
  return Math.max(0, (r.monto_original ?? 0) - (r.monto_abonado ?? 0))
}

/**
 * Σ (monto_original − monto_abonado) de las filas tipo='prestamo'
 * y pagado=false. Es el dinero que me deben y aún está activo (USD).
 */
export function computeMeDebenActivo(rows: DineroFueraRow[]): number {
  return rows
    .filter(r => r.tipo === 'prestamo' && !r.pagado)
    .reduce((s, r) => s + saldoPendiente(r), 0)
}

export function useDineroFuera() {
  const householdId = useAuthStore(s => s.householdId)

  const [rows,    setRows]    = useState<DineroFueraRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!householdId) { setRows([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('dinero_fuera')
      .select(COLS)
      .eq('household_id', householdId)
      .order('fecha_inicio', { ascending: false })
    if (error) handleError(error)
    setRows((data ?? []) as DineroFueraRow[])
    setLoading(false)
  }, [householdId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reload() (sets rows/loading) on mount & when householdId changes
  useEffect(() => { reload() }, [reload])

  const meDebenActivo = computeMeDebenActivo(rows)

  return { rows, setRows, loading, reload, meDebenActivo }
}
