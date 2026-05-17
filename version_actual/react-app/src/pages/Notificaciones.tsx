import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'

const LS_KEY = 'mis_finanzas_notif'

const SCHEDULES = [
  { id: 'morning', time: '08:00', label: 'Recordatorio matutino',  sub: 'Registra tus ingresos del día' },
  { id: 'midday',  time: '12:00', label: 'Check del mediodía',      sub: 'Resumen rápido de gastos' },
  { id: 'evening', time: '18:30', label: 'Cierre de tarde',         sub: 'Gastos pendientes del día' },
  { id: 'night',   time: '21:00', label: 'Resumen nocturno',        sub: 'Balance del día completo' },
]

export default function Notificaciones() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled,    setEnabled]    = useState<Record<string, boolean>>({})

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
    try { setEnabled(JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Record<string, boolean>) }
    catch { /* ignore */ }
  }, [])

  async function requestPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPermission(perm)
  }

  function toggle(id: string) {
    if (permission !== 'granted') return
    const next = { ...enabled, [id]: !enabled[id] }
    setEnabled(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

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
          <span style={{ fontSize: 24 }}>
            {permission === 'granted' ? '🔔' : '🔕'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>
              {permission === 'granted'
                ? 'Notificaciones activas'
                : permission === 'denied'
                  ? 'Bloqueadas por el navegador'
                  : 'Notificaciones desactivadas'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>
              {permission === 'denied'
                ? 'Actívalas en ajustes de tu navegador'
                : 'Recibirás alertas en este dispositivo'}
            </div>
          </div>
          {permission === 'default' && (
            <button
              onClick={requestPermission}
              style={{
                padding: '7px 13px', background: 'var(--amber)', color: 'var(--ink-0)',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Activar
            </button>
          )}
        </div>

        {/* ── Schedules ── */}
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4, marginBottom: 0 }}>
          Horarios
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {SCHEDULES.map((s, i) => (
            <div
              key={s.id}
              style={{
                padding: '13px 14px',
                borderBottom: i < SCHEDULES.length - 1 ? '1px solid var(--line)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--f-num)', minWidth: 46 }}>
                {s.time}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{s.sub}</div>
              </div>
              <button
                onClick={() => toggle(s.id)}
                aria-label={`Toggle ${s.label}`}
                style={{
                  width: 44, height: 26, borderRadius: 13, flexShrink: 0,
                  background: enabled[s.id] ? 'var(--amber)' : 'var(--ink-3)',
                  border: '2px solid', borderColor: enabled[s.id] ? 'var(--amber)' : 'var(--ink-4)',
                  cursor: permission !== 'granted' ? 'not-allowed' : 'pointer',
                  position: 'relative', transition: 'background .2s, border-color .2s',
                  opacity: permission !== 'granted' ? 0.5 : 1,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: enabled[s.id] ? 19 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transition: 'left .2s',
                }} />
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
