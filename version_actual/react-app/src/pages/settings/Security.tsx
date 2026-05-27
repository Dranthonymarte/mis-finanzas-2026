import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { supabase } from '../../lib/supabase'

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
}

export default function Security() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSave() {
    if (!current || !next || !confirm) return setMsg({ text: 'Completa todos los campos.', ok: false })
    if (next !== confirm)              return setMsg({ text: 'Las contraseñas no coinciden.', ok: false })
    if (next.length < 8)              return setMsg({ text: 'Mínimo 8 caracteres.', ok: false })

    setSaving(true)
    setMsg(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setSaving(false); return setMsg({ text: 'Sin sesión activa.', ok: false }) }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })
    if (signInErr) {
      setSaving(false)
      return setMsg({ text: 'Contraseña actual incorrecta.', ok: false })
    }

    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)

    if (error) return setMsg({ text: error.message, ok: false })

    setMsg({ text: 'Contraseña actualizada.', ok: true })
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

        {msg && (
          <div style={{
            fontSize: 13, color: msg.ok ? 'var(--pos)' : 'var(--neg)',
            padding: '8px 12px',
            background: msg.ok ? 'rgba(88,178,106,.1)' : 'rgba(214,106,90,.1)',
            borderRadius: 10,
          }}>
            {msg.text}
          </div>
        )}

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

        {/* ── Biometría & PIN ── */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Acceso rápido
          </div>

          {/* Biometría row */}
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
                Desbloquear con biometría del dispositivo
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
              background: 'var(--ink-3)', color: 'var(--fg-mute)', letterSpacing: '.05em',
            }}>
              Próximo
            </div>
          </div>

          {/* PIN row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderTop: 'none',
            borderRadius: '0 0 12px 12px', padding: '14px 14px',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🔢</span> PIN de acceso
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 3 }}>
                Código de 4 o 6 dígitos para desbloquear
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 700,
              background: 'var(--ink-3)', color: 'var(--fg-mute)', letterSpacing: '.05em',
            }}>
              Próximo
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 10, lineHeight: 1.5 }}>
            La autenticación biométrica usa WebAuthn / Passkeys del dispositivo. Disponible en la próxima actualización.
          </div>
        </div>

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
