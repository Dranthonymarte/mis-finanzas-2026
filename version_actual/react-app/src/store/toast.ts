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

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast(message, tone = 'error') {
    const id = Date.now().toString()
    set(s => ({ toasts: [...s.toasts, { id, message, tone }] }))
    // Auto-dismiss after 4s
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
