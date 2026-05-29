// ═══════════════════════════════════════════════════
// toast store  (BLOQUE 8)
// Global toast queue — used by handleError + any component
// ═══════════════════════════════════════════════════

import { create } from 'zustand'

export type ToastTone = 'error' | 'warn' | 'info'

interface Toast {
  id:      string
  message: string
  tone:    ToastTone
}

interface ToastState {
  toasts:     Toast[]
  addToast:   (message: string, tone?: ToastTone) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast(message, tone = 'error') {
    // Dedup: si ya hay un toast idéntico visible, no apilar otro. Evita el spam
    // cuando varias queries fallan a la vez (p. ej. offline → cache-first revalida
    // ~6 fetches en paralelo y todas tiran "Sin conexión").
    if (get().toasts.some(t => t.message === message && t.tone === tone)) return
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    set(s => ({ toasts: [...s.toasts, { id, message, tone }] }))
    // Auto-dismiss after 4s
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
