import { useState, useEffect } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'

export default function Profile() {
  const storeEmail    = useAuthStore(s => s.userEmail)
  const storeName     = useAuthStore(s => s.userName)
  const userId        = useAuthStore(s => s.userId)
  const householdId   = useAuthStore(s => s.householdId)
  const setSession    = useAuthStore(s => s.setSession)

  const [name,   setName]   = useState(storeName)
  const [email,  setEmail]  = useState(storeEmail)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? storeEmail)
      setName(user.user_metadata?.full_name ?? storeName)
    })
  }, [storeEmail, storeName])

  async function handleSave() {
    setSaving(true); setError(null)
    const { error: err } = await supabase.auth.updateUser({
      data: { full_name: name },
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    // Reflect name change immediately in the Zustand store (avatar + header)
    if (userId) {
      setSession({ userId, householdId, email: storeEmail, userName: name })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
    borderRadius: 12, padding: '12px 14px', fontSize: 14,
    color: 'var(--fg)', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Perfil" back />

      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: 'linear-gradient(135deg, var(--teal), var(--amber))',
          display: 'grid', placeItems: 'center',
          fontSize: 32, fontWeight: 700, color: 'var(--ink-0)',
        }}>
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Nombre completo
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            style={inputSt}
          />
        </div>

        <div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Correo electrónico
          </div>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...inputSt, opacity: 0.55, cursor: 'not-allowed' }}
          />
          <div style={{ fontSize: 10.5, color: 'var(--pos)', marginTop: 4 }}>✓ Verificado</div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--neg)', background: 'rgba(214,106,90,.1)', borderRadius: 10, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 8, width: '100%', padding: '15px', borderRadius: 14,
            background: saved ? 'var(--pos)' : 'var(--amber)',
            border: 'none', fontSize: 15, fontWeight: 700,
            color: 'var(--ink-0)', cursor: saving ? 'wait' : 'pointer',
            transition: 'background .2s',
          }}
        >
          {saved ? '✓  Guardado' : saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
