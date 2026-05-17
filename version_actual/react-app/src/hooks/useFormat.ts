/**
 * useFormat — hook que expone fmt/fmtShort respetando
 * moneda activa, ocultarMontos y tasas BCV del prefs store.
 *
 * Usar en cualquier componente que muestre cifras monetarias:
 *   const { fmt, fmtShort } = useFormat()
 */

import { usePrefsStore } from '../store/prefs'
import { useTasas }      from './useTasas'
import { formatMonto, formatMontoShort } from '../lib/format'

export function useFormat() {
  const moneda  = usePrefsStore(s => s.moneda)
  const ocultar = usePrefsStore(s => s.ocultarMontos)
  const { tasas } = useTasas()

  return {
    fmt:      (amount: number) => formatMonto(amount, moneda, tasas, ocultar),
    fmtShort: (amount: number) => formatMontoShort(amount, moneda, tasas, ocultar),
    moneda,
    ocultar,
    tasas,
  }
}
