// ═══════════════════════════════════════════════════
// Pareja — /pareja
// Miembros reales del household desde household_members
// Invite flow: signInWithOtp + household_members pending row
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useToastStore } from '../store/toast'

interface Member {
  user_id:      string | null
  role:         string | null
  invite_status: string
  invite_email: string
  display:      string
  inicial:      string
  color:        string
}

const COLORS = ['#6a94c4', '#b0a3c7', '#3d8b82', '#e0a84a', '#d66a5a']

export default function Pareja() {
  const householdId = useAuthStore(s => s.householdId)
  const userId      = useAuthStore(s => s.userId)
  const userName    = useAuthStore(s => s.userName)
  const addToast    = useToastStore(s => s.addToast)

  const [members,  setMembers]  = useState<Member[]>([])
  const [loading,  setLoading]  = useState(true)
  const [email,    setEmail]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function loadMembers() {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('household_members')
      .select('user_id, role, invite_status, invite_email')
      .eq('household_id', householdId)
    if (error) {
      addToast('Error cargando miembros', 'error')
      setLoading(false)
      return
    }
    const rows = (data ?? []) as {
      user_id: string | null
      role: string | null
      invite_status: string
      invite_email: string
    }[]
    const mapped: Member[] = rows.map((r, i) => {
      const isSelf = r.user_id === userId
      const label  = isSelf
        ? (userName ?? r.invite_email?.split('@')[0] ?? 'Tú')
        : r.invite_email?.split('@')[0] ?? r.user_id?.slice(0, 8) ?? 'Invitado'
      return {
        user_id:      r.user_id,
        role:         r.role,
        invite_status: r.invite_status,
        invite_email: r.invite_email,
        display:      isSelf ? (userName ?? 'Tú') : label,
        inicial:      (isSelf ? (userName ?? '?') : label)[0].toUpperCase(),
        color:        COLORS[i % COLORS.length],
      }
    })
    setMembers(mapped)
    setLoading(false)
  }

  useEffect(() => { void loadMembers() }, [householdId, userId, userName])

  async function handleInvite() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !householdId || !userId) return

    // Básica validación de formato email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      addToast('Ingresa un correo válido', 'warn')
      return
    }

    // Verificar si ya existe en el household
    const existing = members.find(m => m.invite_email?.toLowerCase() === trimmedEmail)
    if (existing) {
      addToast('Este correo ya está en tu hogar', 'warn')
      return
    }

    setSending(true)
    try {
      // 1. Registrar el invite en household_members (user_id = null hasta que se una)
      const { error: dbError } = await supabase
        .from('household_members')
        .insert({
          household_id:  householdId,
          user_id:       null,          // aún no registrado
          role:          'partner',
          invite_status: 'pending',
          invite_email:  trimmedEmail,
          invited_at:    new Date().toISOString(),
        })

      if (dbError) {
        console.error('[Pareja] insert household_members:', dbError)
        addToast('Error al registrar el invite', 'error')
        setSending(false)
        return
      }

      // 2. Enviar magic link / OTP al email invitado
      // signInWithOtp con shouldCreateUser=true crea la cuenta si no existe
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            invited_by_household: householdId,
            invited_by_user: userId,
          },
        },
      })

      if (otpError) {
        console.error('[Pareja] signInWithOtp:', otpError)
        // El row en household_members ya fue insertado — el invite está registrado
        // aunque el OTP falle (resend manual posible). No revertir.
        addToast(`Invite registrado pero el correo falló: ${otpError.message}`, 'warn')
      } else {
        setSent(true)
        addToast(`Invitación enviada a ${trimmedEmail}`, 'info')
        setTimeout(() => {
          setSent(false)
          setEmail('')
          void loadMembers() // Recargar lista para mostrar el pending
        }, 2500)
      }
    } catch (err) {
      console.error('[Pareja] handleInvite error:', err)
      addToast('Error inesperado al invitar', 'error')
    } finally {
      setSending(false)
    }
  }

  const rolLabel = (role: string | null) => {
    if (!role) return 'Miembro'
    const map: Record<string, string> = {
      owner:   'Propietario',
      admin:   'Admin',
      member:  'Miembro',
      partner: 'Pareja',
    }
    return map[role.toLowerCase()] ?? role
  }

  const statusBadge = (status: string) => {
    if (status === 'accepted') return null
    return (
      <Pill tone="amber" size="xs">Pendiente</Pill>
    )
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
              {members.map((m, i) => (
                <div
                  key={m.user_id ?? m.invite_email ?? i}
                  style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 15, background: m.color,
                    display: 'grid', placeItems: 'center',
                    fontSize: 22, fontWeight: 700, color: 'var(--ink-0)',
                    opacity: m.invite_status === 'pending' ? 0.6 : 1,
                  }}>
                    {m.inicial}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.display}</div>
                  <Pill tone="pos" size="xs">{rolLabel(m.role)}</Pill>
                  {statusBadge(m.invite_status)}
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
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Invitar pareja</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginBottom: 10 }}>
            Tu pareja recibirá un enlace para unirse a tu hogar financiero.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleInvite() }}
              placeholder="correo@ejemplo.com"
              disabled={sending || sent}
              style={{
                flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={() => void handleInvite()}
              disabled={sending || sent || !email.trim()}
              style={{
                padding: '9px 14px',
                background: sent ? 'var(--pos)' : sending ? 'var(--fg-mute)' : 'var(--amber)',
                color: 'var(--ink-0)', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: sending || sent ? 'default' : 'pointer',
                transition: 'background .2s', whiteSpace: 'nowrap',
                opacity: !email.trim() && !sending ? 0.5 : 1,
              }}
            >
              {sent ? '✓ Enviado' : sending ? '…' : 'Invitar'}
            </button>
          </div>
        </div>

        {/* ── Info ── */}
        <div style={{ padding: '0 4px', fontSize: 11.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
          El invite queda pendiente hasta que tu pareja abra el enlace y cree su cuenta.
          Los datos del hogar se comparten automáticamente al aceptar.
        </div>

      </div>
    </div>
  )
}
