// ═══════════════════════════════════════════════════
// Notificaciones — /notificaciones  (BLOQUE 5)
// Toggles push/telegram/gcal + lista notifs programadas editables
// ═══════════════════════════════════════════════════

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
  canal_gcal:       boolean
  recurrente:       boolean
  recurrencia_dias: number | null
  activo:           boolean
}

interface NotifToggles {
  push_enabled:     boolean
  telegram_enabled: boolean
  gcal_enabled:     boolean
}

// Days of the week for recurring weekly notifications
const DIAS_SEMANA = [
  { key: 1, label: 'L' },
  { key: 2, label: 'M' },
  { key: 3, label: 'X' },
  { key: 4, label: 'J' },
  { key: 5, label: 'V' },
  { key: 6, label: 'S' },
  { key: 0, label: 'D' },
]

function fmtSendAt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const inpSt: React.CSSProperties = {
  background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '8px 11px', fontSize: 13,
  color: 'var(--fg)', outline: 'none', width: '100%', boxSizing: 'border-box',
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

// ── Inline edit form for a notification ──────────────
interface InlineFormProps {
  notif: Notif
  onSave:   (updated: Notif) => void
  onCancel: () => void
}

function defaultHora(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5)
}

function InlineEditForm({ notif, onSave, onCancel }: InlineFormProps) {
  const [titulo,       setTitulo]       = useState(notif.titulo)
  const [hora,         setHora]         = useState(defaultHora(notif.send_at))
  const [diasSemana,   setDiasSemana]   = useState<number[]>([])
  const [canalTg,      setCanalTg]      = useState(notif.canal_telegram)
  const [canalGcal,    setCanalGcal]    = useState(notif.canal_gcal)
  const [canalPush,    setCanalPush]    = useState(notif.canal_push)
  const [saving,       setSaving]       = useState(false)

  function toggleDia(d: number) {
    setDiasSemana(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  async function handleSave() {
    if (!titulo.trim()) return
    setSaving(true)

    // Rebuild send_at preserving date, only changing hour
    const base = new Date(notif.send_at)
    const [hh, mm] = hora.split(':').map(Number)
    base.setHours(hh, mm, 0, 0)

    const payload = {
      titulo:         titulo.trim(),
      send_at:        base.toISOString(),
      canal_telegram: canalTg,
      canal_push:     canalPush,
      canal_gcal:     canalGcal,
    }

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .update(payload)
      .eq('id', notif.id)
      .select('id,titulo,mensaje,send_at,tipo,canal_telegram,canal_push,canal_gcal,recurrente,recurrencia_dias,activo')
      .single()

    setSaving(false)
    if (!error && data) {
      onSave(data as Notif)
    }
  }

  return (
    <div style={{
      padding: '14px 14px 12px',
      borderTop: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 10,
      background: 'var(--ink-1)',
    }}>

      {/* Descripción */}
      <div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 4 }}>Descripción</div>
        <input
          type="text" value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título *"
          style={inpSt}
        />
      </div>

      {/* Hora */}
      <div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 4 }}>Hora</div>
        <input
          type="time" value={hora}
          onChange={e => setHora(e.target.value)}
          style={inpSt}
        />
      </div>

      {/* Días de la semana (solo si recurrente o frecuencia semanal) */}
      {notif.recurrente && (
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 6 }}>Días de la semana</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DIAS_SEMANA.map(d => {
              const sel = diasSemana.includes(d.key)
              return (
                <button
                  key={d.key}
                  onClick={() => toggleDia(d.key)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: sel ? 'rgba(var(--amber-rgb),.18)' : 'var(--ink-3)',
                    color:      sel ? 'var(--amber)' : 'var(--fg-mute)',
                    border:     sel ? '1.5px solid rgba(var(--amber-rgb),.5)' : '1px solid var(--line)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Channel toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}>Canales</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5 }}>📲 Telegram</span>
          <Toggle on={canalTg} onChange={setCanalTg} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5 }}>📅 Google Calendar</span>
          <Toggle on={canalGcal} onChange={setCanalGcal} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5 }}>🔔 Push</span>
          <Toggle on={canalPush} onChange={setCanalPush} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !titulo.trim()}
          style={{
            flex: 1, padding: '9px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: saving || !titulo.trim() ? 'var(--ink-3)' : 'var(--amber)',
            color:      saving || !titulo.trim() ? 'var(--fg-mute)' : 'var(--ink-0)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '9px 14px', borderRadius: 10,
            background: 'var(--ink-3)', color: 'var(--fg-mute)',
            border: '1px solid var(--line)', cursor: 'pointer', fontSize: 13,
          }}
        >✕</button>
      </div>
    </div>
  )
}

export default function Notificaciones() {
  const userId = useAuthStore(s => s.userId)

  const [notifs,  setNotifs]  = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'default'),
  )

  // ── Channel toggles (from config_usuario) ──
  const [toggles,       setToggles]       = useState<NotifToggles>({ push_enabled: false, telegram_enabled: false, gcal_enabled: false })
  const [savingToggle,  setSavingToggle]  = useState<string | null>(null)

  // ── Inline edit: which notif id is expanded ──
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── New notification form ──
  const [showNewForm, setShowNewForm] = useState(false)
  const [titulo,      setTitulo]      = useState('')
  const [mensaje,     setMensaje]     = useState('')
  const [sendAt,      setSendAt]      = useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
    return d.toISOString().slice(0, 16)
  })
  const [recurrente, setRecurrente] = useState(false)
  const [recDias,    setRecDias]    = useState('7')
  const [saving,     setSaving]     = useState(false)

  // Load notifications + channel toggles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard: clear loader when no user yet (cache-first auth)
    if (!userId) { setLoading(false); return }

    Promise.all([
      supabase
        .from('scheduled_notifications')
        .select('id,titulo,mensaje,send_at,tipo,canal_telegram,canal_push,canal_gcal,recurrente,recurrencia_dias,activo')
        .eq('user_id', userId)
        .eq('activo', true)
        .order('send_at', { ascending: true }),

      supabase
        .from('config_usuario')
        .select('push_enabled,telegram_enabled,gcal_enabled')
        .eq('user_id', userId)
        .single(),
    ]).then(([notifsRes, togglesRes]) => {
      setNotifs((notifsRes.data ?? []) as Notif[])
      if (togglesRes.data) {
        setToggles({
          push_enabled:     togglesRes.data.push_enabled     ?? false,
          telegram_enabled: togglesRes.data.telegram_enabled ?? false,
          gcal_enabled:     togglesRes.data.gcal_enabled     ?? false,
        })
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
    setSavingToggle(field)
    setToggles(prev => ({ ...prev, [field]: value }))
    await supabase
      .from('config_usuario')
      .upsert({ user_id: userId, [field]: value }, { onConflict: 'user_id' })
    setSavingToggle(null)
  }

  async function disableNotif(id: string) {
    await supabase.from('scheduled_notifications').update({ activo: false }).eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function handleRowTap(n: Notif) {
    setExpandedId(prev => (prev === n.id ? null : n.id))
  }

  function handleInlineSave(updated: Notif) {
    setNotifs(prev => prev.map(n => n.id === updated.id ? updated : n))
    setExpandedId(null)
  }

  async function saveNotif() {
    if (!titulo.trim() || !userId) return
    setSaving(true)

    const payload = {
      user_id:          userId,
      titulo:           titulo.trim(),
      mensaje:          mensaje.trim(),
      send_at:          new Date(sendAt).toISOString(),
      tipo:             'recordatorio',
      canal_push:       toggles.push_enabled && permission === 'granted',
      canal_telegram:   toggles.telegram_enabled,
      canal_gcal:       toggles.gcal_enabled,
      recurrente,
      recurrencia_dias: recurrente ? parseInt(recDias) || 7 : null,
      activo:           true,
    }

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert(payload)
      .select('id,titulo,mensaje,send_at,tipo,canal_telegram,canal_push,canal_gcal,recurrente,recurrencia_dias,activo')
      .single()
    if (!error && data) {
      setNotifs(prev => [data as Notif, ...prev])
    }

    setSaving(false)
    setShowNewForm(false)
    setTitulo(''); setMensaje('')
    setRecurrente(false); setRecDias('7')
  }

  const canals = (n: Notif) => [
    n.canal_telegram && 'Telegram',
    n.canal_push     && 'Push',
    n.canal_gcal     && 'GCal',
  ].filter(Boolean).join(' · ') || '—'

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
                onClick={requestPermission}
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

          {/* Telegram */}
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 20 }}>📲</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Notificaciones Telegram</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 1 }}>Alertas por el bot de Telegram</div>
            </div>
            <div style={{ opacity: savingToggle === 'telegram_enabled' ? 0.5 : 1, transition: 'opacity .15s' }}>
              <Toggle on={toggles.telegram_enabled} onChange={v => void saveToggle('telegram_enabled', v)} />
            </div>
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
            {notifs.map((n, i) => {
              const isExpanded = expandedId === n.id
              const isLast     = i === notifs.length - 1
              return (
                <div
                  key={n.id}
                  style={{
                    borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--line)',
                  }}
                >
                  {/* Row */}
                  <button
                    onClick={() => handleRowTap(n)}
                    style={{
                      width: '100%',
                      padding: '13px 14px',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      background: isExpanded ? 'rgba(var(--amber-rgb),.04)' : 'none',
                      border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{n.titulo}</div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Expand chevron */}
                      <span style={{
                        fontSize: 10, color: 'var(--fg-mute)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s', display: 'inline-block',
                      }}>▼</span>
                      <div
                        role="button"
                        aria-label="Eliminar"
                        onClick={e => { e.stopPropagation(); void disableNotif(n.id) }}
                        style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(214,106,90,.1)', display: 'grid', placeItems: 'center', color: 'var(--neg)', fontSize: 14 }}
                      >
                        ×
                      </div>
                    </div>
                  </button>

                  {/* Inline edit form */}
                  {isExpanded && (
                    <InlineEditForm
                      notif={n}
                      onSave={handleInlineSave}
                      onCancel={() => setExpandedId(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── New notification button / form ── */}
        {showNewForm ? (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--amber)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--amber)' }}>Nueva alerta</div>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título *" style={inpSt} />
            <input type="text" value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Mensaje (opcional)" style={inpSt} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Fecha y hora</div>
              <input type="datetime-local" value={sendAt} onChange={e => setSendAt(e.target.value)} style={inpSt} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={recurrente} onChange={e => setRecurrente(e.target.checked)} />
              Recurrente
              {recurrente && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-mute)' }}>
                  cada
                  <input
                    type="number" value={recDias} onChange={e => setRecDias(e.target.value)}
                    style={{ width: 50, ...inpSt, padding: '4px 7px', fontSize: 12 }}
                  />
                  días
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => void saveNotif()} disabled={saving || !titulo.trim()}
                style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Guardando…' : 'Crear alerta'}
              </button>
              <button
                onClick={() => { setShowNewForm(false) }}
                style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--ink-3)', color: 'var(--fg-mute)', border: '1px solid var(--line)', cursor: 'pointer' }}
              >✕</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            style={{
              background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
              borderRadius: 14, padding: '13px',
              color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Nueva alerta
          </button>
        )}

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
