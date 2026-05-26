// ═══════════════════════════════════════════════════
// Pareja — /pareja
// Miembros reales del household desde household_members
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'

interface Member {
  user_id: string
  role:    string | null
  display: string    // name or truncated email fallback
  inicial: string
  color:   string
}

const COLORS = ['#6a94c4', '#b0a3c7', '#3d8b82', '#e0a84a', '#d66a5a']

export default function Pareja() {
  const householdId = useAuthStore(s => s.householdId)
  const userId      = useAuthStore(s => s.userId)
  const userName    = useAuthStore(s => s.userName)

  const [members,    setMembers]    = useState<Member[]>([])
  const [loading,    setLoading]    = useState(true)
  const [email,      setEmail]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [sent,       setSent]       = useState(false)
  const [sentEmail,  setSentEmail]  = useState('')
  const [inviteErr,  setInviteErr]  = useState('')

  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    supabase
      .from('household_members')
      .select('user_id, role')
      .eq('household_id', householdId)
      .then(({ data }) => {
        const rows = (data ?? []) as { user_id: string; role: string | null }[]
        const mapped: Member[] = rows.map((r, i) => {
          const isSelf = r.user_id === userId
          const name   = isSelf ? (userName ?? r.user_id.slice(0, 6)) : r.user_id.slice(0, 8)
          return {
            user_id: r.user_id,
            role:    r.role,
            display: isSelf ? (userName ?? 'Tú') : name,
            inicial: (isSelf ? (userName ?? '?') : name)[0].toUpperCase(),
            color:   COLORS[i % COLORS.length],
          }
        })
        setMembers(mapped)
        setLoading(false)
      })
  }, [householdId, userId, userName])

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInviteErr('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: window.location.origin,
          data: { invited_by: householdId, household_id: householdId },
        },
      })
      if (error) throw error
      setSentEmail(trimmed)
      setSent(true)
      setEmail('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar invitación'
      setInviteErr(msg)
    } finally {
      setSending(false)
    }
  }

  const rolLabel = (role: string | null) => {
    if (!role) return 'Miembro'
    const map: Record<string, string> = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' }
    return map[role.toLowerCase()] ?? role
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Finanzas en pareja" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Members ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Tu hogar
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12, padding: '8px 0' }}>Cargando…</div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12, padding: '8px 0' }}>Sin miembros registrados</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              {members.map(m => (
                <div key={m.user_id} style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 15, background: m.color,
                    display: 'grid', placeItems: 'center',
                    fontSize: 22, fontWeight: 700, color: 'var(--ink-0)',
                  }}>
                    {m.inicial}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.display}</div>
                  <Pill tone="pos" size="xs">{rolLabel(m.role)}</Pill>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
            Household activo · datos compartidos
          </div>
        </div>

        {/* ── Invite ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Invitar pareja</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={{
                flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={() => { void handleInvite() }}
              disabled={sending || !email.trim()}
              style={{
                padding: '9px 14px',
                background: sent ? 'var(--pos)' : (sending ? 'var(--ink-3)' : 'var(--amber)'),
                color: sent || sending ? 'var(--fg-mute)' : 'var(--ink-0)',
                border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
                whiteSpace: 'nowrap',
              }}
            >
              {sending ? 'Enviando…' : sent ? '✓ Enviado' : 'Invitar'}
            </button>
          </div>
          {sent && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--pos)', fontWeight: 500 }}>
              ✓ Invitación enviada a {sentEmail}
            </div>
          )}
          {inviteErr && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--neg)' }}>
              {inviteErr}
            </div>
          )}
          {!sent && !inviteErr && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-mute)' }}>
              El enlace de invitación se enviará al correo indicado.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
