// ═══════════════════════════════════════════════════
// handleError  (BLOQUE 8)
// Centralized Supabase error handler:
//   401  → redirect to /login (session expired)
//   net  → toast warning (offline / DNS)
//   5xx  → toast error (server error)
//   else → toast error with message
// ═══════════════════════════════════════════════════

import { useToastStore } from '../store/toast'

interface SupaError {
  status?:  number
  message?: string
}

export function handleError(err: SupaError | null | undefined): void {
  if (!err) return

  const { addToast } = useToastStore.getState()
  const status  = err.status  ?? 0
  const message = err.message ?? 'Error desconocido'

  if (status === 401 || status === 403) {
    // Session expired — redirect to login
    addToast('Sesión expirada. Redirigiendo…', 'warn')
    setTimeout(() => { window.location.href = '/login' }, 1500)
    return
  }

  if (!navigator.onLine || message.toLowerCase().includes('fetch')) {
    addToast('Sin conexión. Verifica tu red.', 'warn')
    return
  }

  if (status >= 500) {
    addToast(`Error del servidor (${status}). Inténtalo de nuevo.`, 'error')
    return
  }

  addToast(message, 'error')
}
