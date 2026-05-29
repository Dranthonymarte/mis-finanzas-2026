// ═══════════════════════════════════════════════════
// toast store  (BLOQUE 8)
// Global toast queue — used by handleError + any component
// ═══════════════════════════════════════════════════

import { create } from 'zustand'

export type ToastTone = 'error' | 'warn' | 'info'

interface Toast {
  id:       string
  message:  string
  tone:     ToastTone
  duration: number   // ms visibles — la barra de progreso se sincroniza con esto
}

interface ToastState {
  toasts:      Toast[]
  addToast:    (message: string, tone?: ToastTone, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast(message, tone = 'error', duration) {
    // Dedup: si ya hay un toast idéntico visible, no apilar otro. Evita el spam
    // cuando varias queries fallan a la vez (p. ej. offline → cache-first revalida
    // ~6 fetches en paralelo y todas tiran "Sin conexión").
    if (get().toasts.some(t => t.message === message && t.tone === tone)) return
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    // Duración proporcional al largo del mensaje (tiempo real de lectura):
    // ~90ms/carácter, mínimo 4.5s, tope 9s. Patrón top-3 (Sonner/Linear) para
    // que los avisos no desaparezcan antes de poder leerlos.
    const ms = duration ?? Math.min(9000, Math.max(4500, message.length * 90))
    set(s => ({ toasts: [...s.toasts, { id, message, tone, duration: ms }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), ms)
  },
  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
