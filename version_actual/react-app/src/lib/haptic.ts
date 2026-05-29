// ═══════════════════════════════════════════════════
// haptic — feedback táctil sutil (navigator.vibrate)
// Progressive enhancement: Android/Chrome lo soporta; iOS Safari lo ignora
// silenciosamente. Sin dependencias, feature-detect + try/catch.
// Patrón top-3 (Revolut, Robinhood, Monzo) — vibración corta en acciones clave.
// ═══════════════════════════════════════════════════

type HapticKind = 'light' | 'medium' | 'success' | 'warning' | 'error'

const PATTERNS: Record<HapticKind, number | number[]> = {
  light:   10,
  medium:  18,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error:   [40, 50, 40],
}

/** Dispara feedback táctil si el dispositivo lo soporta. No-op en caso contrario. */
export function haptic(kind: HapticKind = 'light'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try { navigator.vibrate(PATTERNS[kind]) } catch { /* dispositivo sin soporte — ignorar */ }
}
