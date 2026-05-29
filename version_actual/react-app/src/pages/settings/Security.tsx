import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { supabase } from '../../lib/supabase'
import { useToastStore } from '../../store/toast'

const PIN_KEY = 'mf-pin'

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

// ── PIN Keypad ────────────────────────────────────────────────
function PinKeypad({
  value, onChange, onSubmit, label, sublabel,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  label: string
  sublabel?: string
}) {
  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--fg-mute)', textAlign: 'center' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center', marginTop: -10 }}>{sublabel}</div>}

      {/* Dots */}
      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i < value.length ? 'var(--amber)' : 'var(--ink-3)',
            border: '1.5px solid var(--line)',
            transition: 'background .15s',
          }} />
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 10 }}>
        {digits.map((d, idx) => (
          <button
            key={idx}
            disabled={d === ''}
            onClick={() => {
              if (d === '⌫') {
                onChange(value.slice(0, -1))
              } else if (d !== '' && value.length < 4) {
                const next = value + d
                onChange(next)
                if (next.length === 4) onSubmit?.()
              }
            }}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: d === '' ? 'transparent' : 'var(--ink-2)',
              border: d === '' ? 'none' : '1px solid var(--line)',
              color: 'var(--fg)', fontSize: d === '⌫' ? 18 : 20, fontWeight: 500,
              cursor: d === '' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .1s',
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PIN Section ───────────────────────────────────────────────
function PinSection() {
  const addToast = useToastStore(s => s.addToast)
  const [step, setStep]         = useState<'idle' | 'verify-change' | 'verify-remove' | 'enter-new' | 'confirm-new'>('idle')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin,     setNewPin]     = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  // Re-read from localStorage each render so hasPin stays fresh after save/delete
  const hasPin = Boolean(localStorage.getItem(PIN_KEY))

  function reset() { setCurrentPin(''); setNewPin(''); setConfirmPin(''); setStep('idle') }

  function handleVerifyForChange() {
    if (currentPin !== localStorage.getItem(PIN_KEY)) {
      addToast('PIN incorrecto.', 'error'); setCurrentPin(''); return
    }
    setCurrentPin(''); setStep('enter-new')
  }

  function handleVerifyForRemove() {
    if (currentPin !== localStorage.getItem(PIN_KEY)) {
      addToast('PIN incorrecto.', 'error'); setCurrentPin(''); return
    }
    localStorage.removeItem(PIN_KEY)
    addToast('PIN eliminado.', 'info')
    reset()
  }

  function handleNewDone() { setStep('confirm-new') }

  function handleConfirmDone() {
    if (confirmPin !== newPin) {
      addToast('Los PINs no coinciden. Inténtalo de nuevo.', 'error')
      setNewPin(''); setConfirmPin(''); setStep('enter-new'); return
    }
    localStorage.setItem(PIN_KEY, newPin)
    addToast('PIN guardado correctamente.', 'info')
    reset()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {step === 'idle' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔢</span> PIN de acceso
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 3 }}>
              {hasPin ? 'PIN activo — 4 dígitos' : 'Sin PIN configurado'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <button
              onClick={() => { setCurrentPin(''); setNewPin(''); setConfirmPin(''); setStep(hasPin ? 'verify-change' : 'enter-new') }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
              }}
            >
              {hasPin ? 'Cambiar' : 'Activar'}
            </button>
            {hasPin && (
              <button
                onClick={() => { setCurrentPin(''); setStep('verify-remove') }}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'var(--ink-3)', color: 'var(--neg)', border: 'none', cursor: 'pointer',
                }}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'verify-change' && (
        <div style={{ paddingTop: 8 }}>
          <PinKeypad value={currentPin} onChange={setCurrentPin} onSubmit={handleVerifyForChange} label="Ingresa tu PIN actual" />
          <button onClick={reset} style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--fg-mute)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}

      {step === 'verify-remove' && (
        <div style={{ paddingTop: 8 }}>
          <PinKeypad value={currentPin} onChange={setCurrentPin} onSubmit={handleVerifyForRemove} label="Confirma tu PIN para eliminar" />
          <button onClick={reset} style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--fg-mute)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}

      {step === 'enter-new' && (
        <div style={{ paddingTop: 8 }}>
          <PinKeypad value={newPin} onChange={setNewPin} onSubmit={handleNewDone} label="Elige un PIN de 4 dígitos" sublabel="No uses fechas de nacimiento obvias" />
          <button onClick={reset} style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--fg-mute)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}

      {step === 'confirm-new' && (
        <div style={{ paddingTop: 8 }}>
          <PinKeypad value={confirmPin} onChange={setConfirmPin} onSubmit={handleConfirmDone} label="Confirma tu nuevo PIN" />
          <button onClick={reset} style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--fg-mute)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}
    </div>
  )
}

// ── Biometría Section ─────────────────────────────────────────
function BiometriaSection() {
  const addToast = useToastStore(s => s.addToast)
  const supported = typeof PublicKeyCredential !== 'undefined'
  const credId    = localStorage.getItem('mf-webauthn-cred')
  const [enrolling, setEnrolling] = useState(false)

  async function handleEnroll() {
    if (!supported) return
    setEnrolling(true)
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Mis Finanzas 2026', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode('mf-user-local'),
            name: 'usuario',
            displayName: 'Usuario',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7  }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null

      if (cred) {
        localStorage.setItem('mf-webauthn-cred', cred.id)
        addToast('Biometría activada correctamente.', 'info')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al activar biometría.'
      if (!msg.includes('cancel') && !msg.includes('Cancel') && !msg.includes('abort') && !msg.includes('NotAllowed')) {
        addToast(msg, 'error')
      }
    } finally {
      setEnrolling(false)
    }
  }

  function handleRemoveBio() {
    localStorage.removeItem('mf-webauthn-cred')
    addToast('Biometría desactivada.', 'info')
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--ink-2)', border: '1px solid var(--line)',
      borderRadius: '12px 12px 0 0', padding: '14px 14px',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🫆</span> Huella / Face ID
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 3 }}>
          {!supported
            ? 'No disponible en este dispositivo'
            : credId
              ? 'Biometría activa'
              : 'Desbloquear con biometría del dispositivo'}
        </div>
      </div>
      {supported ? (
        credId ? (
          <button
            onClick={handleRemoveBio}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
              background: 'var(--ink-3)', color: 'var(--neg)', border: 'none', cursor: 'pointer',
            }}
          >
            Desactivar
          </button>
        ) : (
          <button
            onClick={() => void handleEnroll()}
            disabled={enrolling}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--amber)', color: 'var(--ink-0)', border: 'none',
              cursor: enrolling ? 'default' : 'pointer', opacity: enrolling ? .7 : 1,
            }}
          >
            {enrolling ? 'Activando…' : 'Activar'}
          </button>
        )
      ) : (
        <div style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
          background: 'var(--ink-3)', color: 'var(--fg-mute)', letterSpacing: '.05em',
        }}>
          No disponible
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Security() {
  const addToast = useToastStore(s => s.addToast)
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (!current || !next || !confirm) return addToast('Completa todos los campos.', 'error')
    if (next !== confirm)              return addToast('Las contraseñas no coinciden.', 'error')
    if (next.length < 8)              return addToast('Mínimo 8 caracteres.', 'error')

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setSaving(false); return addToast('Sin sesión activa.', 'error') }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })
    if (signInErr) {
      setSaving(false)
      return addToast('Contraseña actual incorrecta.', 'error')
    }

    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)

    if (error) return addToast(error.message, 'error')

    addToast('Contraseña actualizada.', 'info')
    setCurrent(''); setNext(''); setConfirm('')
  }

  const fields: { label: string; val: string; set: (v: string) => void }[] = [
    { label: 'Contraseña actual',    val: current, set: setCurrent },
    { label: 'Nueva contraseña',     val: next,    set: setNext    },
    { label: 'Confirmar nueva',      val: confirm, set: setConfirm },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Seguridad" back />

      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Contraseña ── */}
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Cambiar contraseña
        </div>

        {fields.map(({ label, val, set }) => (
          <div key={label}>
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginBottom: 6 }}>{label}</div>
            <input
              type="password" value={val}
              onChange={e => set(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSave() }}
              style={inputSt}
            />
          </div>
        ))}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: 'var(--amber)', color: 'var(--ink-0)', border: 'none',
            cursor: saving ? 'default' : 'pointer', opacity: saving ? .7 : 1,
          }}
        >
          {saving ? 'Guardando…' : 'Actualizar contraseña'}
        </button>

        {/* ── Acceso rápido ── */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Acceso rápido
          </div>

          <BiometriaSection />

          {/* PIN row attached below biometría */}
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderTop: 'none',
            borderRadius: '0 0 12px 12px', padding: '14px 14px',
          }}>
            <PinSection />
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 10, lineHeight: 1.5 }}>
            La biometría usa WebAuthn / Passkeys del dispositivo. El PIN es una capa local adicional — no reemplaza tu sesión.
          </div>
        </div>

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
