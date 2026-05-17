// ═══════════════════════════════════════════════════
// Prefs store — moneda, ocultarMontos, mesActivo
// Persisted in localStorage via zustand persist.
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currentMes } from '../lib/mes'

export type Moneda = 'USD' | 'BS' | 'EUR'

export interface PrefsState {
  moneda:        Moneda
  ocultarMontos: boolean
  mesActivo:     string    // "may-26" format

  setMoneda:          (m: Moneda) => void
  toggleOcultarMontos: () => void
  setMesActivo:       (m: string) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      moneda:        'USD',
      ocultarMontos: false,
      mesActivo:     currentMes(),

      setMoneda:           (moneda)   => set({ moneda }),
      toggleOcultarMontos: ()         => set((s) => ({ ocultarMontos: !s.ocultarMontos })),
      setMesActivo:        (mesActivo) => set({ mesActivo }),
    }),
    { name: 'mis-finanzas-prefs' },
  ),
)
