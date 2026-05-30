import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import Sheet from '../../components/shell/Sheet'
import PinPad from '../../components/ui/PinPad'
import { supabase } from '../../lib/supabase'
import { useToastStore } from '../../store/toast'
import { haptic } from '../../lib/haptic'
import {
  hasPin, setPin, verifyPin, removePin,
  hasBiometric, biometricSupported, removeBiometric, WEBAUTHN_KEY,
} from '../../lib/pin'

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

const primaryBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
}
const dangerBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
  background: 'var(--ink-3)', color: 'var(--neg)', border: 'none', cursor: 'pointer',
}

// ── Biometría Section ─────────────────────────────────────────
// PIN base: activar huella exige PIN configurado (respaldo si el sensor falla).
function BiometriaSection({ onChanged }: { onChanged: () => void }) {
  const addToast  = useToastStore(s => s.addToast)
  const supported = biometricSupported()
  const pinSet    = hasPin()
  const enrolled  = hasBiometric()
  const [enrolling, setEnrolling] = useState(false)

  async function handleEnroll() {
    if (!supported || !pinSet) return
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
        localStorage.setItem(WEBAUTHN_KEY, cred.id)
        haptic('success')
        addToast('Biometría activada correctamente.', 'info')
        onChanged()
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
    removeBiometric()
    addToast('Biometría desactivada.', 'info')
    onChanged()
  }

  const sub = !supported
    ? 'No disponible en este dispositivo'
    : enrolled
      ? 'Biometría activa'
      : !pinSet
        ? 'Configura un PIN primero'
        : 'Desbloquear con biometría del dispositivo'

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
        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 3 }}>{sub}</div>
      </div>

      {!supported ? (
        <div style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
          background: 'var(--ink-3)', color: 'var(--fg-mute)', letterSpacing: '.05em',
        }}>
          No disponible
        </div>
      ) : enrolled ? (
        <button onClick={handleRemoveBio} style={{ ...dangerBtn, padding: '6px 12px', fontSize: 11.5 }}>
          Desactivar
        </button>
      ) : (
        <button
          onClick={() => void handleEnroll()}
          disabled={enrolling || !pinSet}
          style={{
            ...primaryBtn,
            cursor: (enrolling || !pinSet) ? 'default' : 'pointer',
            opacity: (enrolling || !pinSet) ? .5 : 1,
          }}
        >
          {enrolling ? 'Activando…' : 'Activar'}
        </button>
      )}
    </div>
  )
}

// ── PIN Section ───────────────────────────────────────────────
function PinSection({ onChanged }: { onChanged: () => void }) {
  const addToast = useToastStore(s => s.addToast)
  const pinSet   = hasPin()

  const [open, setOpen]   = useState(false)
  const [mode, setMode]   = useState<'set' | 'change' | 'remove'>('set')
  const [step, setStep]   = useState<'verify' | 'enter-new' | 'confirm-new'>('verify')
  const [entry,  setEntry]  = useState('')
  const [newPin, setNewPin] = useState('')
  const [error,  setError]  = useState<string | null>(null)

  function start(m: 'set' | 'change' | 'remove') {
    setMode(m)
    setEntry(''); setNewPin(''); setError(null)
    setStep(m === 'set' ? 'enter-new' : 'verify')
    setOpen(true)
  }

  function closeSheet() {
    setOpen(false)
    setEntry(''); setNewPin(''); setError(null)
  }

  async function onVerify(v: string) {
    if (!(await verifyPin(v))) {
      haptic('error'); setError('PIN incorrecto.'); setEntry(''); return
    }
    if (mode === 'remove') {
      removePin()           // quita PIN + biometría (PIN es la base)
      haptic('success')
      addToast('PIN eliminado.', 'info')
      onChanged()
      closeSheet()
    } else {
      setEntry(''); setError(null); setStep('enter-new')
    }
  }

  function onEnterNew(v: string) {
    setNewPin(v); setEntry(''); setError(null); setStep('confirm-new')
  }

  async function onConfirmNew(v: string) {
    if (v !== newPin) {
      haptic('error')
      setError('Los PINs no coinciden. Inténtalo de nuevo.')
      setEntry(''); setNewPin(''); setStep('enter-new'); return
    }
    await setPin(v)
    haptic('success')
    addToast('PIN guardado correctamente.', 'info')
    onChanged()
    closeSheet()
  }

  const sheetTitle = mode === 'remove' ? 'Eliminar PIN' : mode === 'change' ? 'Cambiar PIN' : 'Activar PIN'

  let padLabel = ''
  let padSub: string | undefined
  if (step === 'verify') {
    padLabel = mode === 'remove' ? 'Confirma tu PIN para eliminar' : 'Ingresa tu PIN actual'
  } else if (step === 'enter-new') {
    padLabel = 'Elige un PIN de 4 dígitos'
    padSub   = 'No uses fechas de nacimiento obvias'
  } else {
    padLabel = 'Confirma tu nuevo PIN'
  }

  function handleSubmit(v: string) {
    if (step === 'verify')         void onVerify(v)
    else if (step === 'enter-new') onEnterNew(v)
    else                           void onConfirmNew(v)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔢</span> PIN de acceso
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 3 }}>
          {pinSet ? 'PIN activo — 4 dígitos' : 'Sin PIN configurado'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <button onClick={() => start(pinSet ? 'change' : 'set')} style={primaryBtn}>
          {pinSet ? 'Cambiar' : 'Activar'}
        </button>
        {pinSet && (
          <button onClick={() => start('remove')} style={dangerBtn}>Eliminar</button>
        )}
      </div>

      <Sheet open={open} onClose={closeSheet} title={sheetTitle}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '42vh', padding: '8px 0 4px',
        }}>
          <PinPad
            value={entry}
            onChange={v => { setEntry(v); setError(null) }}
            onSubmit={handleSubmit}
            label={padLabel}
            sublabel={padSub}
            error={error}
          />
        </div>
      </Sheet>
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
  // Bump forces both sub-secciones a re-leer localStorage (PIN ⇄ biometría coherentes)
  const [, setRefresh] = useState(0)
  const bump = () => setRefresh(n => n + 1)

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

        {/* ── Inicio de sesión ── */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Inicio de sesión
          </div>

          <BiometriaSection onChanged={bump} />

          {/* PIN row attached below biometría */}
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderTop: 'none',
            borderRadius: '0 0 12px 12px', padding: '14px 14px',
          }}>
            <PinSection onChanged={bump} />
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 10, lineHeight: 1.5 }}>
            La huella usa WebAuthn / Passkeys del dispositivo y requiere un PIN como respaldo.
            El PIN es una capa local — no reemplaza tu sesión.
          </div>
        </div>

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
