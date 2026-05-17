/**
 * format.ts — formatMonto global
 *
 * Respeta la moneda activa del prefs store y el flag ocultarMontos.
 * Usar en TODOS los componentes que muestran cifras monetarias.
 */

import { type Moneda } from '../store/prefs'

export interface Tasas {
  bcv: number
  eur: number
}

const MASK = '••••'

export function formatMonto(
  amount:  number,
  moneda:  Moneda,
  tasas:   Tasas,
  ocultar: boolean,
): string {
  if (ocultar) return MASK

  const abs = Math.abs(amount)

  switch (moneda) {
    case 'BS': {
      const bs = abs * tasas.bcv
      return `Bs ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    case 'EUR': {
      const eur = (abs * tasas.bcv) / tasas.eur
      return `€${eur.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    case 'USD':
    default:
      return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/** Short version — no decimals, compact */
export function formatMontoShort(
  amount:  number,
  moneda:  Moneda,
  tasas:   Tasas,
  ocultar: boolean,
): string {
  if (ocultar) return MASK

  const abs = Math.abs(amount)

  switch (moneda) {
    case 'BS': {
      const bs = abs * tasas.bcv
      return `Bs ${bs >= 1000
        ? `${(bs / 1000).toFixed(1)}K`
        : bs.toFixed(0)}`
    }
    case 'EUR': {
      const eur = (abs * tasas.bcv) / tasas.eur
      return `€${eur >= 1000
        ? `${(eur / 1000).toFixed(1)}K`
        : eur.toFixed(0)}`
    }
    case 'USD':
    default:
      return abs >= 1000
        ? `$${(abs / 1000).toFixed(1)}K`
        : `$${abs.toFixed(2)}`
  }
}
