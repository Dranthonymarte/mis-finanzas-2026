// ═══════════════════════════════════════════════════
// Prefs store — moneda, ocultarMontos, mesActivo, tema, palette
// Persisted in localStorage via zustand persist.
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currentMes } from '../lib/mes'

export type Moneda  = 'USD' | 'BS' | 'EUR'
export type TemaId  = 'dark' | 'light' | 'system' | 'oled' | 'sepia'
export type PaletteId = 'amber' | 'emerald' | 'indigo' | 'rose' | 'sky' | 'graphite'

export interface PrefsState {
  moneda:        Moneda
  ocultarMontos: boolean
  mesActivo:     string    // "may-26" format
  tema:          TemaId
  palette:       PaletteId

  setMoneda:           (m: Moneda)    => void
  toggleOcultarMontos: ()             => void
  setMesActivo:        (m: string)    => void
  setTema:             (t: TemaId)    => void
  setPalette:          (p: PaletteId) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      moneda:        'USD',
      ocultarMontos: false,
      mesActivo:     currentMes(),
      tema:          'dark',
      palette:       'amber',

      setMoneda:           (moneda)    => set({ moneda }),
      toggleOcultarMontos: ()          => set((s) => ({ ocultarMontos: !s.ocultarMontos })),
      setMesActivo:        (mesActivo) => set({ mesActivo }),
      setTema:             (tema)      => set({ tema }),
      setPalette:          (palette)   => set({ palette }),
    }),
    { name: 'mis-finanzas-prefs' },
  ),
)
