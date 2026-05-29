// ═══════════════════════════════════════════════════
// cache — snapshot localStorage (stale-while-revalidate)
// Hidrata datos financieros time-sensitive (movimientos, balances)
// al instante desde el último snapshot, evitando el parpadeo en vacío
// mientras Supabase responde. Regla CLAUDE.md: nunca mostrar vacío /
// defaults hardcoded mientras carga la DB.
// ═══════════════════════════════════════════════════

const PREFIX = 'mf:cache:'

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota exceeded o storage deshabilitado — ignorar */
  }
}
