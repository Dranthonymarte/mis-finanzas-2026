// ═══════════════════════════════════════════════════
// Pareja — /pareja
// Miembros reales del household desde household_members
// Invite flow: signInWithOtp + household_members pending row
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { supabase }      from '../lib/supabase'
import { useAuthStore }  from '../store/auth'
import { useToastStore } from '../store/toast'
import { confirmAction } from '../store/confirm'

// ── Límite de miembros del hogar (owner + invitados activos) ──────
// ESCALABLE: súbelo a 3 o 5 para permitir más personas. Cuenta solo
// miembros activos (accepted/pending); revocar libera cupo. Default 2
// = owner + 1 pareja (es decir, 1 invitado, como se pidió).
const MAX_MIEMBROS = 2

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

  const [members,       setMembers]       = useState<Member[]>([])
  const [loading,       setLoading]       = useState(true)
  const [email,         setEmail]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [sent,          setSent]          = useState(false)
  const [revoking,      setRevoking]      = useState<string | null>(null)  // user_id/email being revoked
  const [reinviting,    setReinviting]    = useState<string | null>(null)  // email being re-invited
  const [reinviteEmail, setReinviteEmail] = useState<Record<string, string>>({}) // overrides per member key
  const [leaving,       setLeaving]       = useState(false)                // invitado saliendo del hogar
  const [historial,     setHistorial]     = useState<{ household_id: string; invited_at: string | null }[]>([]) // hogares ajenos donde ya no estás

  // ── Rol del usuario en su hogar activo ────────────────────────────
  // Por convención, household.id == uid del propietario (RLS hm_insert_own:
  // household_id = auth.uid()). Por eso householdId === userId ⟺ eres dueño.
  // Un invitado tiene householdId = uid del dueño (≠ el suyo). Señal instantánea
  // desde el auth store: sin flash, sin round-trip a DB.
  const amIOwner = !householdId || householdId === userId

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

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- loadMembers (sets state) re-runs on identity change; excluded from deps (recreated each render → would loop)
  useEffect(() => {
    void loadMembers()
    if (!householdId) return
    // Realtime: la lista se actualiza al instante cuando alguien es invitado,
    // revocado o reincorporado — sin recargar la página (mismo patrón que useAccounts).
    const ch = supabase
      .channel(`household_members:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` },
        () => { void loadMembers() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [householdId, userId, userName])

  // Historial del invitado: hogares AJENOS donde fue parte y ya no (revoked).
  // RLS members_self_view permite leer las filas propias (user_id = auth.uid()).
  // No podemos resolver el nombre del dueño de un hogar al que ya no pertenecemos
  // (RLS lo impide) → se muestra como "Hogar anterior · fecha".
  useEffect(() => {
    if (!userId) return
    let cancel = false
    void (async () => {
      const { data } = await supabase
        .from('household_members')
        .select('household_id, invited_at')
        .eq('user_id', userId)
        .eq('invite_status', 'revoked')
      if (cancel || !data) return
      const rows = data as { household_id: string; invited_at: string | null }[]
      setHistorial(rows.filter(h => h.household_id !== householdId)) // excluir hogar actual
    })()
    return () => { cancel = true }
  }, [userId, householdId])

  async function handleRevoke(member: Member) {
    const memberKey = member.user_id ?? member.invite_email
    if (!householdId || !memberKey) return

    const confirmed = await confirmAction({
      title:        'Revocar acceso',
      message:      `¿Quitar el acceso de "${member.display}" al hogar? Podrás re-invitarlo después.`,
      confirmLabel: 'Revocar',
      danger:       true,
    })
    if (!confirmed) return

    setRevoking(memberKey)
    try {
      const query = supabase
        .from('household_members')
        .update({ invite_status: 'revoked' })
        .eq('household_id', householdId)

      // match by user_id if available, otherwise by invite_email
      const { error } = member.user_id
        ? await query.eq('user_id', member.user_id)
        : await query.eq('invite_email', member.invite_email)

      if (error) {
        console.error('[Pareja] revoke:', error)
        addToast('Error al revocar el acceso', 'error')
      } else {
        addToast(`Acceso de ${member.display} revocado`, 'info')
        void loadMembers()
      }
    } catch (err) {
      console.error('[Pareja] handleRevoke error:', err)
      addToast('Error inesperado al revocar', 'error')
    } finally {
      setRevoking(null)
    }
  }

  // Salida voluntaria del invitado (NO es auto-revocar: el invitado "se sale").
  // Permitido por la policy members_self_accept (USING user_id=auth.uid() AND
  // status IS DISTINCT FROM 'revoked'; WITH CHECK user_id=auth.uid()).
  async function handleLeave() {
    if (!householdId || !userId) return
    const ownerMember = members.find(m => m.role === 'owner')
    const ownerName   = ownerMember?.display ?? 'esta persona'

    const confirmed = await confirmAction({
      title:        'Dejar de ser parte del hogar',
      message:      `Saldrás del hogar de ${ownerName}. Dejarás de ver y registrar las cuentas, movimientos y datos compartidos del hogar. Tu propia cuenta y tus datos personales se conservan. Para volver a entrar, ${ownerName} tendrá que invitarte de nuevo.`,
      confirmLabel: 'Dejar de ser parte',
      cancelLabel:  'Quedarme',
      danger:       true,
    })
    if (!confirmed) return

    setLeaving(true)
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ invite_status: 'revoked' })
        .eq('household_id', householdId)
        .eq('user_id', userId)

      if (error) {
        console.error('[Pareja] leave:', error)
        addToast('No se pudo completar la salida del hogar', 'error')
      } else {
        addToast('Dejaste de ser parte del hogar', 'info')
        void loadMembers()
      }
    } catch (err) {
      console.error('[Pareja] handleLeave error:', err)
      addToast('Error inesperado al salir del hogar', 'error')
    } finally {
      setLeaving(false)
    }
  }

  async function handleReinvite(member: Member) {
    const memberKey = member.user_id ?? member.invite_email
    if (!householdId || !userId || !memberKey) return

    // Use override email if user typed one, else fall back to member's email
    const targetEmail = (reinviteEmail[memberKey] ?? member.invite_email ?? '').trim().toLowerCase()
    if (!targetEmail) {
      addToast('Ingresa un correo para re-invitar', 'warn')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      addToast('Ingresa un correo válido', 'warn')
      return
    }

    setReinviting(memberKey)
    try {
      // Update existing row: new email + reset status to pending
      const query = supabase
        .from('household_members')
        .update({
          invite_status: 'pending',
          invite_email:  targetEmail,
          invited_at:    new Date().toISOString(),
        })
        .eq('household_id', householdId)

      const { error: dbError } = member.user_id
        ? await query.eq('user_id', member.user_id)
        : await query.eq('invite_email', member.invite_email)

      if (dbError) {
        console.error('[Pareja] reinvite update:', dbError)
        addToast('Error al actualizar el invite', 'error')
        return
      }

      // Re-send OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            invited_by_household: householdId,
            invited_by_user:      userId,
          },
        },
      })

      if (otpError) {
        console.error('[Pareja] reinvite OTP:', otpError)
        addToast(`Invite actualizado pero el correo falló: ${otpError.message}`, 'warn')
      } else {
        addToast(`Re-invitación enviada a ${targetEmail}`, 'info')
        // Clear override email for this member
        setReinviteEmail(prev => { const next = { ...prev }; delete next[memberKey]; return next })
        void loadMembers()
      }
    } catch (err) {
      console.error('[Pareja] handleReinvite error:', err)
      addToast('Error inesperado al re-invitar', 'error')
    } finally {
      setReinviting(null)
    }
  }

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

    // Límite de miembros del hogar (escalable vía MAX_MIEMBROS). Revocar un
    // acceso libera cupo. Guard de seguridad además del UI deshabilitado.
    const activos = members.filter(m => m.invite_status !== 'revoked').length
    if (activos >= MAX_MIEMBROS) {
      addToast(`Tu hogar ya tiene el máximo de miembros (${MAX_MIEMBROS}). Revoca un acceso para invitar a alguien más.`, 'warn')
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
    if (status === 'revoked')  return <Pill tone="neg"   size="xs">Revocado</Pill>
    return                            <Pill tone="amber" size="xs">Pendiente</Pill>
  }

  // Miembros activos (aceptados/pendientes) vs revocados. Los revocados ya no
  // pertenecen al hogar → van a una sección discreta "Anteriores" (patrón
  // Notion/Linear: el historial no ensucia la lista de miembros activos).
  const activeMembers  = members.filter(m => m.invite_status !== 'revoked')
  const revokedMembers = members.filter(m => m.invite_status === 'revoked')
  // Límite de miembros activos (escalable vía MAX_MIEMBROS). Revocar libera cupo.
  const limiteAlcanzado = activeMembers.length >= MAX_MIEMBROS

  // Fila de miembro — fuente única usada por ambas listas (activos y anteriores).
  const renderMemberRow = (m: Member, i: number) => {
    const memberKey     = m.user_id ?? m.invite_email ?? String(i)
    const isOwner       = m.role === 'owner'
    const isSelf        = userId != null && m.user_id === userId
    // Acciones del DUEÑO sobre los invitados de su hogar:
    const canRevoke     = amIOwner && !isOwner && m.invite_status === 'accepted'
    const canReinvite   = amIOwner && !isOwner && (m.invite_status === 'revoked' || m.invite_status === 'pending')
    // Acción del INVITADO sobre sí mismo (salir voluntariamente del hogar):
    const canLeave      = !amIOwner && isSelf && m.invite_status === 'accepted'
    const isRevokingThis   = revoking   === memberKey
    const isReinvitingThis = reinviting === memberKey
    const emailOverride    = reinviteEmail[memberKey] ?? ''
    const reinviteLabel    = m.invite_status === 'revoked' ? 'Volver a invitar' : 'Re-invitar'

    return (
      <div
        key={memberKey}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'var(--ink-1)', borderRadius: 12, padding: '12px 14px',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: m.color, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          fontSize: 18, fontWeight: 700, color: 'var(--ink-0)',
          opacity: m.invite_status === 'pending' || m.invite_status === 'revoked' ? 0.55 : 1,
        }}>
          {m.inicial}
        </div>

        {/* Info + actions */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.display}</span>
            <Pill tone="pos" size="xs">{rolLabel(m.role)}</Pill>
            {statusBadge(m.invite_status)}
          </div>

          {m.invite_email && (
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.invite_email}
            </div>
          )}

          {/* Revocar — el DUEÑO quita el acceso a un invitado aceptado */}
          {canRevoke && (
            <button
              onClick={() => void handleRevoke(m)}
              disabled={isRevokingThis}
              style={{
                alignSelf: 'flex-start', marginTop: 2,
                padding: '5px 10px', borderRadius: 8, border: '1px solid var(--neg)',
                background: 'transparent', color: 'var(--neg)',
                fontSize: 11.5, fontWeight: 600, cursor: isRevokingThis ? 'default' : 'pointer',
                opacity: isRevokingThis ? 0.6 : 1, transition: 'opacity .15s',
              }}
            >
              {isRevokingThis ? 'Revocando…' : 'Revocar acceso'}
            </button>
          )}

          {/* Dejar de ser parte — el INVITADO se sale del hogar por su cuenta */}
          {canLeave && (
            <button
              onClick={() => void handleLeave()}
              disabled={leaving}
              style={{
                alignSelf: 'flex-start', marginTop: 2,
                padding: '5px 10px', borderRadius: 8, border: '1px solid var(--neg)',
                background: 'transparent', color: 'var(--neg)',
                fontSize: 11.5, fontWeight: 600, cursor: leaving ? 'default' : 'pointer',
                opacity: leaving ? 0.6 : 1, transition: 'opacity .15s',
              }}
            >
              {leaving ? 'Saliendo…' : 'Dejar de ser parte'}
            </button>
          )}

          {/* Re-invitar — partner revocado o pendiente (solo dueño) */}
          {canReinvite && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
              <input
                type="email"
                value={emailOverride}
                onChange={e => setReinviteEmail(prev => ({ ...prev, [memberKey]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') void handleReinvite(m) }}
                placeholder={m.invite_email ?? 'correo@ejemplo.com'}
                disabled={isReinvitingThis}
                style={{
                  background: 'var(--ink-0)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 12,
                  color: 'var(--fg)', outline: 'none', width: '100%',
                }}
              />
              <button
                onClick={() => void handleReinvite(m)}
                disabled={isReinvitingThis}
                style={{
                  alignSelf: 'flex-start',
                  padding: '5px 10px', borderRadius: 8, border: 'none',
                  background: 'var(--amber)', color: 'var(--ink-0)',
                  fontSize: 11.5, fontWeight: 600, cursor: isReinvitingThis ? 'default' : 'pointer',
                  opacity: isReinvitingThis ? 0.6 : 1, transition: 'opacity .15s',
                }}
              >
                {isReinvitingThis ? 'Enviando…' : reinviteLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Finanzas en pareja" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Members ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {amIOwner ? 'Tu hogar' : 'Tu rol en este hogar'}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12, padding: '8px 0' }}>Cargando…</div>
          ) : activeMembers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12, padding: '8px 0' }}>Sin miembros activos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {activeMembers.map(renderMemberRow)}
            </div>
          )}

          {amIOwner ? (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
              Household activo · datos compartidos
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
              Eres parte del hogar de alguien más como invitado/a. Compartes las cuentas,
              movimientos y datos financieros del hogar. Si dejas de ser parte conservas tu
              propia cuenta, pero dejarás de ver esta información hasta que te vuelvan a invitar.
            </div>
          )}
        </div>

        {/* ── Anteriores — DUEÑO: personas que dejaron su hogar (revocadas) ── */}
        {amIOwner && revokedMembers.length > 0 && (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Personas que dejaron tu hogar
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {revokedMembers.map(renderMemberRow)}
            </div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
              Ya no tienen acceso al hogar · puedes volver a invitarlas
            </div>
          </div>
        )}

        {/* ── Anteriores — INVITADO: hogares donde fue parte y ya no ── */}
        {!amIOwner && historial.length > 0 && (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Hogares donde fuiste parte
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historial.map(h => (
                <div
                  key={h.household_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--ink-1)', borderRadius: 12, padding: '12px 14px',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--ink-2)', flexShrink: 0,
                    display: 'grid', placeItems: 'center', fontSize: 18, opacity: 0.55,
                  }}>
                    🏠
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Hogar anterior</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>
                      {h.invited_at
                        ? `Fuiste invitado/a el ${new Date(h.invited_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Ya no tienes acceso'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
              Ya no tienes acceso a estos hogares · te tendrían que invitar de nuevo
            </div>
          </div>
        )}

        {/* ── Invite (solo el dueño del hogar puede invitar) ── */}
        {amIOwner && (
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Invitar pareja</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginBottom: 10 }}>
            {limiteAlcanzado
              ? `Tu hogar está completo (máx. ${MAX_MIEMBROS} miembros). Revoca un acceso para invitar a alguien más.`
              : 'Tu pareja recibirá un enlace para unirse a tu hogar financiero.'}
          </div>
          <div style={{ display: 'flex', gap: 8, opacity: limiteAlcanzado ? 0.5 : 1 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleInvite() }}
              placeholder="correo@ejemplo.com"
              disabled={sending || sent || limiteAlcanzado}
              style={{
                flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={() => void handleInvite()}
              disabled={sending || sent || limiteAlcanzado || !email.trim()}
              style={{
                padding: '9px 14px',
                background: sent ? 'var(--pos)' : sending ? 'var(--fg-mute)' : 'var(--amber)',
                color: 'var(--ink-0)', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: sending || sent || limiteAlcanzado ? 'default' : 'pointer',
                transition: 'background .2s', whiteSpace: 'nowrap',
                opacity: (!email.trim() && !sending) || limiteAlcanzado ? 0.5 : 1,
              }}
            >
              {sent ? '✓ Enviado' : sending ? '…' : 'Invitar'}
            </button>
          </div>
        </div>
        )}

        {/* ── Info ── */}
        <div style={{ padding: '0 4px', fontSize: 11.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
          {amIOwner
            ? 'El invite queda pendiente hasta que tu pareja abra el enlace y cree su cuenta. Los datos del hogar se comparten automáticamente al aceptar.'
            : 'Mientras seas parte de este hogar, lo que registres se comparte con sus miembros. Si dejas de ser parte, esos datos permanecen en el hogar pero tú dejas de verlos.'}
        </div>

      </div>
    </div>
  )
}
