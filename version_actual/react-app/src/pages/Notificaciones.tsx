// ═══════════════════════════════════════════════════
// Notificaciones — /notificaciones  (BLOQUE 5)
// Toggles push/calendar/budget + lista recurrentes
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useToastStore } from '../store/toast'
import { useConfig } from '../hooks/useConfig'

interface NotifToggles {
  push_enabled:        boolean
  gcal_enabled:        boolean
  budget_push_enabled: boolean
}

// ── Toggle switch ────────────────────────────────────
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 46, height: 26, borderRadius: 13, flexShrink: 0,
        background: on ? 'var(--amber)' : 'var(--ink-3)',
        border: '2px solid', borderColor: on ? 'var(--amber)' : 'var(--ink-4)',
        position: 'relative', transition: 'background .2s, border-color .2s',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left .2s',
      }} />
    </button>
  )
}

export default function Notificaciones() {
  const userId    = useAuthStore(s => s.userId)
  const navigate  = useNavigate()
  const addToast  = useToastStore(s => s.addToast)
  const { config } = useConfig()

  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'default'),
  )
  const [toggles,      setToggles]      = useState<NotifToggles>({ push_enabled: false, gcal_enabled: false, budget_push_enabled: false })
  const [savingToggle, setSavingToggle] = useState<string | null>(null)
  const [gcalConnected, setGcalConnected] = useState<boolean>(false)

  // ── Load toggles from config_usuario (single lightweight query) ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard: clear loader when no user yet (cache-first auth)
    if (!userId) { setLoading(false); return }

    void supabase
      .from('config_usuario')
      .select('push_enabled,gcal_enabled,budget_push_enabled,google_calendar_token')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setToggles({
            push_enabled:        data.push_enabled        ?? false,
            gcal_enabled:        data.gcal_enabled        ?? false,
            budget_push_enabled: data.budget_push_enabled ?? false,
          })
          setGcalConnected(!!data.google_calendar_token)
        }
        setLoading(false)
      })
  }, [userId])

  async function requestPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted') void saveToggle('push_enabled', true)
  }

  async function saveToggle(field: keyof NotifToggles, value: boolean) {
    if (!userId) return
    if (field === 'gcal_enabled' && value && !gcalConnected) {
      addToast('Google Calendar no conectado. Ve a Menú → Google Calendar para conectar tu cuenta.', 'warn')
    }
    setSavingToggle(field)
    setToggles(prev => ({ ...prev, [field]: value }))
    await supabase
      .from('config_usuario')
      .upsert({ user_id: userId, [field]: value }, { onConflict: 'user_id' })
    setSavingToggle(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Notificaciones" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Channel toggles ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>

          {/* Push */}
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Notificaciones Push</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 1 }}>
                {permission === 'denied'
                  ? 'Bloqueadas por el navegador — actívalas en ajustes'
                  : permission === 'default'
                  ? 'Activa el permiso para recibir notificaciones'
                  : 'Alertas directas en este dispositivo'}
              </div>
            </div>
            {permission === 'default' ? (
              <button
                onClick={() => void requestPermission()}
                style={{ padding: '7px 13px', background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Activar
              </button>
            ) : (
              <div style={{ opacity: savingToggle === 'push_enabled' ? 0.5 : 1, transition: 'opacity .15s' }}>
                <Toggle
                  on={toggles.push_enabled && permission === 'granted'}
                  onChange={v => void saveToggle('push_enabled', v)}
                />
              </div>
            )}
          </div>

          {/* Google Calendar */}
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 1 }}>Sincronizar alertas con tu calendario</div>
            </div>
            <div style={{ opacity: savingToggle === 'gcal_enabled' ? 0.5 : 1, transition: 'opacity .15s' }}>
              <Toggle on={toggles.gcal_enabled} onChange={v => void saveToggle('gcal_enabled', v)} />
            </div>
          </div>
        </div>

        {/* ── Alertas automáticas ── */}
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>
          Alertas automáticas
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Presupuesto excedido</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 1 }}>
                {toggles.push_enabled && permission === 'granted'
                  ? 'Recibe un push cuando superes el límite de una categoría'
                  : 'Requiere activar las notificaciones push'}
              </div>
            </div>
            <div style={{ opacity: savingToggle === 'budget_push_enabled' ? 0.5 : 1, transition: 'opacity .15s' }}>
              <Toggle
                on={toggles.budget_push_enabled}
                onChange={v => void saveToggle('budget_push_enabled', v)}
                disabled={!(toggles.push_enabled && permission === 'granted')}
              />
            </div>
          </div>
        </div>

        {/* ── Programadas (recurrentes) ── */}
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>
          Programadas
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Cargando…</div>
        )}

        {!loading && config.recurrentes.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>
            Sin gastos recurrentes configurados
          </div>
        )}

        {config.recurrentes.length > 0 && (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {config.recurrentes.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < config.recurrentes.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <span style={{ fontSize: 18 }}>🔄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.descripcion}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
                    {r.cat && <span>{r.cat} · </span>}
                    {r.recurrencia_dias ? `Cada ${r.recurrencia_dias}d` : r.recDia ? `Día ${r.recDia} del mes` : 'Recurrente'}
                  </div>
                </div>
                <button
                  onClick={() => void navigate('/recurrentes')}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: 'var(--ink-3)', color: 'var(--fg-mute)', border: '1px solid var(--line)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Ver
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Gestionar recurrentes ── */}
        <button
          onClick={() => navigate('/recurrentes')}
          style={{
            background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
            borderRadius: 14, padding: '13px',
            color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', width: '100%',
          }}
        >
          <span style={{ fontSize: 18 }}>🔄</span>
          Gestionar recurrentes
        </button>

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
