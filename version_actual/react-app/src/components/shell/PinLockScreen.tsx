// ═══════════════════════════════════════════════════
// PinLockScreen — candado local de re-entrada (Layer 2)
//
// Huella/Face ID primero (auto-disparo al montar); el PIN queda como respaldo
// en la MISMA pantalla. NUNCA pide PIN después de una huella correcta.
// Patrón Revolut/Monzo/N26. Se monta desde RequireAuth (gate global) cuando hay
// sesión viva + PIN configurado + la pestaña aún no se ha desbloqueado.
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { Logo } from '../brand/Logo'
import PinPad from '../ui/PinPad'
import { haptic } from '../../lib/haptic'
import { WEBAUTHN_KEY, PIN_UNLOCKED, verifyPin, biometricSupported } from '../../lib/pin'

// credential.id es base64url → ArrayBuffer
function base64ToBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=')
  const binary = atob(padded)
  const buf    = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

export default function PinLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin,        setPin]        = useState('')
  const [pinError,   setPinError]   = useState<string | null>(null)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError,   setBioError]   = useState<string | null>(null)

  const credId     = localStorage.getItem(WEBAUTHN_KEY)
  const bioSupport = biometricSupported() && Boolean(credId)

  const markUnlocked = useCallback(() => {
    sessionStorage.setItem(PIN_UNLOCKED, '1')
    onUnlocked()
  }, [onUnlocked])

  // Auto-disparo de la biometría al montar (huella primero — patrón Revolut)
  useEffect(() => {
    if (bioSupport) void handleBiometria()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePinSubmit(v: string) {
    if (await verifyPin(v)) {
      markUnlocked()
    } else {
      haptic('error')
      setPinError('PIN incorrecto. Inténtalo de nuevo.')
      setPin('')
    }
  }

  async function handleBiometria() {
    if (!bioSupport || !credId) return
    setBioLoading(true)
    setBioError(null)
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: base64ToBuffer(credId) }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      if (assertion) markUnlocked()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('cancel') && !msg.includes('Cancel') && !msg.includes('abort') && !msg.includes('NotAllowed')) {
        setBioError('Biometría fallida. Usa tu PIN.')
      }
    } finally {
      setBioLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% -4%, #1f1509 0%, #0a0b0d 52%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo iconSize={28} textSize={15} />
        </div>

        <PinPad
          value={pin}
          onChange={v => { setPin(v); setPinError(null) }}
          onSubmit={v => void handlePinSubmit(v)}
          label="Ingresa tu PIN"
          error={pinError}
          variant="dark"
        />

        {bioSupport && (
          <button
            onClick={() => void handleBiometria()}
            disabled={bioLoading}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 14, padding: '12px 24px', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: bioLoading ? .6 : 1,
            }}
          >
            <span style={{ fontSize: 20 }}>🫆</span>
            {bioLoading ? 'Verificando…' : 'Desbloquear con biometría'}
          </button>
        )}

        {bioError && (
          <div style={{ fontSize: 12, color: '#d66a5a', textAlign: 'center' }}>{bioError}</div>
        )}

      </div>
    </div>
  )
}
