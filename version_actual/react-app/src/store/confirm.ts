// ═══════════════════════════════════════════════════
// confirm store — diálogo de confirmación global (patrón top-3)
// Uso imperativo en cualquier handler:
//   if (!(await confirmAction({ title, message, danger: true }))) return
// Renderizado único por <ConfirmDialog /> en el root de App (todas las rutas).
// ═══════════════════════════════════════════════════

import { create } from 'zustand'

export interface ConfirmOptions {
  title:         string
  message?:      string
  confirmLabel?: string
  cancelLabel?:  string
  danger?:       boolean   // botón confirmar en rojo (acción destructiva)
}

interface ConfirmState {
  open:      boolean
  opts:      ConfirmOptions
  _resolve:  ((v: boolean) => void) | null
  ask:       (opts: ConfirmOptions) => Promise<boolean>
  _close:    (v: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  opts: { title: '' },
  _resolve: null,
  ask(opts) {
    return new Promise<boolean>((resolve) => {
      set({ open: true, opts, _resolve: resolve })
    })
  },
  _close(v) {
    get()._resolve?.(v)
    set({ open: false, _resolve: null })
  },
}))

/** Helper imperativo — devuelve true si el usuario confirma. */
export const confirmAction = (opts: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().ask(opts)
