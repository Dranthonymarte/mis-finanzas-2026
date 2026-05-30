// ═══════════════════════════════════════════════════
// lock — candado local de re-entrada (Layer 2).
//
// NO persiste: el estado vive durante la pestaña/PWA. Al cerrar la app el
// estado se pierde → la próxima apertura exige desbloqueo (huella/PIN) si hay
// un PIN configurado. Es la fuente de verdad reactiva del gate global
// (RequireAuth en AuthGuard).
//
// Modelo de dos capas (patrón Revolut/Monzo/N26):
//   · Layer 1 — identidad: email+contraseña / Google / enlace mágico.
//     Crea la sesión de Supabase. Ocurre en el primer uso o tras "Cerrar sesión".
//   · Layer 2 — re-entrada: huella/Face ID primero, PIN de respaldo. Aparece al
//     reabrir la app con la sesión aún viva. NO reemplaza la sesión de Supabase.
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import { PIN_UNLOCKED, hasPin } from '../lib/pin'

interface LockState {
  unlocked: boolean
  /** Marca la sesión actual como desbloqueada (tras huella/PIN o login completo). */
  unlock: () => void
  /** Bloquea manualmente sin cerrar la sesión de Supabase (botón "Bloquear ahora"). */
  lock: () => void
}

// Sin PIN configurado → nunca bloquea (unlocked=true). Con PIN → respeta el flag
// de la sesión: si ya se desbloqueó en esta pestaña, sigue desbloqueado.
// Inicializar con hasPin() evita que activar el PIN a mitad de sesión dispare el
// gate de golpe (en ese momento ya estaba unlocked=true porque no había PIN).
const initialUnlocked = !hasPin() || Boolean(sessionStorage.getItem(PIN_UNLOCKED))

export const useLockStore = create<LockState>((set) => ({
  unlocked: initialUnlocked,
  unlock: () => { sessionStorage.setItem(PIN_UNLOCKED, '1'); set({ unlocked: true }) },
  lock:   () => { sessionStorage.removeItem(PIN_UNLOCKED); set({ unlocked: false }) },
}))
