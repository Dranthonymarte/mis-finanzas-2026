// ═══════════════════════════════════════════════════
// pin — candado local (PIN + biometría). NO reemplaza la sesión de Supabase.
//
// Modelo "PIN base, huella aceleradora" (patrón Revolut/Monzo/N26):
//   · El PIN es la base. La huella/Face ID es un acelerador opcional que
//     EXIGE tener un PIN configurado (es el respaldo si el sensor falla).
//   · Quitar el PIN quita también la biometría.
//
// El PIN se guarda como hash SHA-256, NO en texto plano. Los PIN antiguos
// (texto plano de 4 dígitos) se migran de forma transparente al primer
// desbloqueo correcto.
//
// Modelo de amenaza: es una capa de conveniencia local. Quien tenga acceso a
// localStorage ya posee el token de sesión de Supabase, así que el hash es
// defensa en profundidad (evita que el PIN sea legible a simple vista), no un
// secreto criptográficamente fuerte (un PIN de 4 dígitos es de espacio chico).
// ═══════════════════════════════════════════════════

export const PIN_KEY      = 'mf-pin'
export const WEBAUTHN_KEY = 'mf-webauthn-cred'
export const PIN_UNLOCKED = 'mf-pin-unlocked'  // sessionStorage — se limpia al cerrar pestaña

/** SHA-256 hex del PIN con namespace fijo. */
export async function hashPin(pin: string): Promise<string> {
  const data   = new TextEncoder().encode('mf-pin-v1:' + pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** ¿Hay un PIN configurado? */
export function hasPin(): boolean {
  return Boolean(localStorage.getItem(PIN_KEY))
}

/** ¿Hay una credencial biométrica registrada? */
export function hasBiometric(): boolean {
  return Boolean(localStorage.getItem(WEBAUTHN_KEY))
}

/** ¿El dispositivo/navegador soporta WebAuthn? */
export function biometricSupported(): boolean {
  return typeof PublicKeyCredential !== 'undefined'
}

/** Guarda el PIN (siempre como hash). */
export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(PIN_KEY, await hashPin(pin))
}

/** Verifica el PIN. Migra de texto plano a hash de forma transparente si acierta. */
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return false
  // Legacy: PIN en texto plano (exactamente 4 dígitos) → comparar y migrar a hash.
  if (/^\d{4}$/.test(stored)) {
    if (pin === stored) { await setPin(pin); return true }
    return false
  }
  return (await hashPin(pin)) === stored
}

/** Quita solo la biometría (huella/Face ID). */
export function removeBiometric(): void {
  localStorage.removeItem(WEBAUTHN_KEY)
}

/** Quita el PIN. Como el PIN es la base, también quita la biometría. */
export function removePin(): void {
  localStorage.removeItem(PIN_KEY)
  removeBiometric()
}
