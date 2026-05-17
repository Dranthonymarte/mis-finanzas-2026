import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

interface Notif {
  id:               string
  titulo:           string
  mensaje:          string
  send_at:          string
  tipo:             string
  canal_telegram:   boolean
  canal_push:       boolean
  recurrente:       boolean
  recurrencia_dias: number | null
  activo:           boolean
}

function fmtSendAt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Notificaciones() {
  const userId     = useAuthStore(s => s.userId)
  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [loading,  setLoading]  = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase
      .from('scheduled_notifications')
      .select('id,titulo,mensaje,send_at,tipo,canal_telegram,canal_push,recurrente,recurrencia_dias,activo')
      .eq('user_id', userId)
      .eq('activo', true)
      .order('send_at', { ascending: true })
      .then(({ data }) => {
        setNotifs((data ?? []) as Notif[])
        setLoading(false)
      })
  }, [userId])

  async function requestPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPermission(perm)
  }

  async function disableNotif(id: string) {
    await supabase.from('scheduled_notifications').update({ activo: false }).eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const canals = (n: Notif) => [
    n.canal_telegram && '📲 Telegram',
    n.canal_push     && '🔔 Push',
  ].filter(Boolean).join(' · ') || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Notificaciones" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Permission status ── */}
        <div style={{
          background: permission === 'granted' ? 'var(--pos-d)' : 'var(--ink-2)',
          border: `1px solid ${permission === 'granted' ? 'var(--pos)' : 'var(--line)'}`,
          borderRadius: 14, padding: '14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>{permission === 'granted' ? '🔔' : '🔕'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>
              {permission === 'granted' ? 'Notificaciones push activas' : permission === 'denied' ? 'Bloqueadas por el navegador' : 'Push desactivado'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>
              {permission === 'denied' ? 'Actívalas en ajustes del navegador' : 'Las alertas llegan por Telegram o push'}
            </div>
          </div>
          {permission === 'default' && (
            <button
              onClick={requestPermission}
              style={{ padding: '7px 13px', background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >Activar</button>
          )}
        </div>

        {/* ── Scheduled notifications ── */}
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>
          Programadas
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Cargando…</div>
        )}

        {!loading && notifs.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Sin notificaciones programadas</div>
        )}

        {notifs.length > 0 && (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {notifs.map((n, i) => (
              <div
                key={n.id}
                style={{
                  padding: '13px 14px',
                  borderBottom: i < notifs.length - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{n.titulo}</div>
                  {n.mensaje && (
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.mensaje}
                    </div>
                  )}
                  <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--amber)', fontFamily: 'var(--f-num)' }}>{fmtSendAt(n.send_at)}</span>
                    {n.recurrente && n.recurrencia_dias && (
                      <span style={{ fontSize: 10, color: 'var(--fg-mute)' }}>· cada {n.recurrencia_dias}d</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--fg-mute)' }}>· {canals(n)}</span>
                  </div>
                </div>
                <button
                  onClick={() => disableNotif(n.id)}
                  style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: 'rgba(214,106,90,.1)', border: 'none', color: 'var(--neg)', fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
