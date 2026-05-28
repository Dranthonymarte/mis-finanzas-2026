// ═══════════════════════════════════════════════════
// RecurrenteDetail — /recurrentes/:id
// Detalle + edición de un gasto/ingreso recurrente
// Datos: config_usuario.recurrentes (via useConfig)
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import { useConfig } from '../hooks/useConfig'
import { useFormat } from '../hooks/useFormat'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'

interface RecurrenteItem {
  id:               string
  descripcion:      string
  monto:            number
  recurrencia_dias: number
  recDia?:          number
  tipo:             string
  cat:              string
  notif_telegram?:  boolean
}

const TIPOS = ['Gasto', 'Ingreso Fijo', 'Ingreso Variable', 'Ahorro en efectivo']

const FREQ_OPTS = [
  { label: 'Semanal',       dias: 7  },
  { label: 'Quincenal',     dias: 15 },
  { label: 'Mensual',       dias: 30 },
  { label: 'Personalizado', dias: 0  },
]

function tipoColor(tipo: string): string {
  if (tipo.startsWith('Ingreso')) return 'var(--pos)'
  if (tipo.startsWith('Ahorro'))  return 'var(--info)'
  return 'var(--neg)'
}

function freqLabel(dias: number, recDia?: number): string {
  if (dias === 7)  return 'Semanal'
  if (dias === 15) return 'Quincenal'
  if (dias === 30) return recDia ? `Mensual · día ${recDia}` : 'Mensual'
  return `Cada ${dias} días${recDia ? ` · día ${recDia}` : ''}`
}

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-3)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13,
  color: 'var(--fg)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function RecurrenteDetail() {
  const { id }                   = useParams<{ id: string }>()
  const navigate                 = useNavigate()
  const { fmt }                  = useFormat()
  const { config, updateConfig } = useConfig()
  const userId                   = useAuthStore(s => s.userId)

  const items  = (config.recurrentes as RecurrenteItem[]) ?? []
  const item   = items.find(r => r.id === id) ?? null

  // Redirect if loaded and not found
  useEffect(() => {
    if (config.recurrentes !== undefined && !item) {
      navigate('/recurrentes', { replace: true })
    }
  }, [config.recurrentes, item, navigate])

  // Form state — initialised from item
  const [editing,    setEditing]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const [desc,       setDesc]       = useState('')
  const [monto,      setMonto]      = useState('')
  const [freqIdx,    setFreqIdx]    = useState(2)
  const [diasCustom, setDiasCustom] = useState('30')
  const [diaNum,     setDiaNum]     = useState(1)
  const [tipo,       setTipo]       = useState(TIPOS[0])
  const [cat,        setCat]        = useState('')
  const [notifTg,    setNotifTg]    = useState(false)

  function loadForm(r: RecurrenteItem) {
    setDesc(r.descripcion)
    setMonto(String(r.monto))
    const presetIdx = FREQ_OPTS.findIndex(f => f.dias === r.recurrencia_dias && f.dias !== 0)
    if (presetIdx >= 0) { setFreqIdx(presetIdx) } else { setFreqIdx(3); setDiasCustom(String(r.recurrencia_dias)) }
    setDiaNum(r.recDia ?? 1)
    setTipo(r.tipo)
    setCat(r.cat)
    setNotifTg(!!r.notif_telegram)
  }

  function openEdit() {
    if (item) loadForm(item)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setConfirmDel(false)
  }

  const diasFinal   = freqIdx === 3 ? (parseInt(diasCustom) || 30) : FREQ_OPTS[freqIdx].dias
  const isMonthly   = FREQ_OPTS[freqIdx]?.dias === 30 || (freqIdx === 3 && parseInt(diasCustom) >= 28)
  const canSave     = desc.trim().length > 0 && parseFloat(monto) > 0

  async function handleSave() {
    if (!item || !canSave) return
    setSaving(true)
    const updated: RecurrenteItem = {
      id:               item.id,
      descripcion:      desc.trim(),
      monto:            parseFloat(monto),
      recurrencia_dias: diasFinal,
      recDia:           isMonthly ? diaNum : undefined,
      tipo,
      cat:              cat.trim() || tipo,
      notif_telegram:   notifTg,
    }
    const newList = items.map(r => r.id === item.id ? updated : r)
    await updateConfig('recurrentes', newList)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!item) return
    await updateConfig('recurrentes', items.filter(r => r.id !== item.id))
    navigate('/recurrentes', { replace: true })
  }

  async function createNotif(r: RecurrenteItem) {
    if (!userId || !notifTg) return
    const sendAt = new Date()
    sendAt.setDate(r.recDia ?? 1)
    sendAt.setHours(8, 0, 0, 0)
    if (sendAt < new Date()) sendAt.setMonth(sendAt.getMonth() + 1)
    await supabase.from('scheduled_notifications').insert({
      user_id:          userId,
      titulo:           `🔁 ${r.descripcion}`,
      mensaje:          `Recurrente de $${r.monto.toFixed(2)} — ${r.tipo}`,
      send_at:          sendAt.toISOString(),
      tipo:             'recurrente',
      canal_push:       true,
      canal_telegram:   true,
      recurrente:       true,
      recurrencia_dias: r.recurrencia_dias,
      activo:           true,
    })
  }

  // Loading state (config not yet hydrated)
  if (!item) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Cargando…</div>
      </div>
    )
  }

  const color = tipoColor(item.tipo)

  /* ── View mode ── */
  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 40 }}>
        <AppHeader title={item.descripcion} back />

        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Hero card */}
          <div style={{
            background: `radial-gradient(ellipse at 88% 12%, ${color}1e 0%, transparent 60%), var(--ink-2)`,
            border: `1px solid ${color}30`,
            borderRadius: 16, padding: '18px 16px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color, marginBottom: 8 }}>
              {item.tipo}
            </div>
            <div className="num" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.02em', color }}>
              {fmt(item.monto)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{item.cat}</span>
              <span>·</span>
              <span>{freqLabel(item.recurrencia_dias, item.recDia)}</span>
              {item.notif_telegram && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--info)' }}>📲 Telegram</span>
                </>
              )}
            </div>
          </div>

          {/* Info rows */}
          {[
            { label: 'Categoría',    value: item.cat              },
            { label: 'Frecuencia',   value: freqLabel(item.recurrencia_dias, item.recDia) },
            { label: 'Tipo',         value: item.tipo             },
            { label: 'Recordatorio', value: item.notif_telegram ? 'Telegram activo' : 'Sin recordatorio' },
          ].map(row => (
            <div key={row.label} style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--fg-mute)', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}

          {/* Edit button */}
          <button
            onClick={openEdit}
            style={{
              width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'transparent', border: '1.5px solid var(--amber)',
              color: 'var(--amber)', cursor: 'pointer', marginTop: 4,
            }}
          >
            Editar recurrente
          </button>

          {/* Delete */}
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              style={{
                width: '100%', padding: '13px', borderRadius: 14, fontSize: 13.5, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--line)',
                color: 'var(--neg)', cursor: 'pointer',
              }}
            >
              Eliminar recurrente
            </button>
          ) : (
            <div style={{
              background: 'rgba(214,106,90,.08)', border: '1px solid rgba(214,106,90,.3)',
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--neg)', textAlign: 'center', marginBottom: 6 }}>
                ¿Eliminar "{item.descripcion}"?
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
                Se eliminará permanentemente.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setConfirmDel(false)}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                    background: 'var(--ink-2)', border: '1px solid var(--line)',
                    color: 'var(--fg-dim)', cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  onClick={() => void handleDelete()}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                    background: 'var(--neg)', border: 'none', color: '#fff', cursor: 'pointer',
                  }}
                >Eliminar</button>
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  /* ── Edit mode ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 40 }}>
      <AppHeader title="Editar recurrente" back onBack={cancelEdit} />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{
          background: 'var(--ink-2)', border: '1.5px solid rgba(224,168,74,.4)',
          borderRadius: 14, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)' }}>
            ✏️ Editar recurrente
          </div>

          {/* Tipo chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIPOS.map(t => {
              const tc  = tipoColor(t)
              const sel = t === tipo
              return (
                <button key={t} onClick={() => setTipo(t)} style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  background: sel ? `${tc}18` : 'var(--ink-3)',
                  color:      sel ? tc : 'var(--fg-mute)',
                  border:     sel ? `1.5px solid ${tc}50` : '1px solid var(--line)',
                  cursor: 'pointer',
                }}>{t}</button>
              )
            })}
          </div>

          {/* Descripción */}
          <input
            type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Descripción (ej. Netflix, Salario…)"
            style={inputSt} maxLength={100}
          />

          {/* Monto */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4 }}>Monto (USD)</div>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={monto} onChange={e => setMonto(e.target.value)}
              placeholder="0.00" style={inputSt}
            />
          </div>

          {/* Frecuencia */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 6 }}>Frecuencia</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FREQ_OPTS.map((f, idx) => (
                <button key={f.label} onClick={() => setFreqIdx(idx)} style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  background: freqIdx === idx ? 'rgba(224,168,74,.15)' : 'var(--ink-3)',
                  color:      freqIdx === idx ? 'var(--amber)' : 'var(--fg-mute)',
                  border:     freqIdx === idx ? '1.5px solid rgba(224,168,74,.4)' : '1px solid var(--line)',
                  cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
            {freqIdx === 3 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Cada</span>
                <input
                  type="number" inputMode="numeric" min="1" max="365"
                  value={diasCustom} onChange={e => setDiasCustom(e.target.value)}
                  style={{ ...inputSt, width: 70 }}
                />
                <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>días</span>
              </div>
            )}
            {(FREQ_OPTS[freqIdx]?.dias === 30 || freqIdx === 3) && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Día del mes</span>
                <input
                  type="number" inputMode="numeric" min="1" max="28"
                  value={diaNum} onChange={e => setDiaNum(parseInt(e.target.value) || 1)}
                  style={{ ...inputSt, width: 70 }}
                />
              </div>
            )}
          </div>

          {/* Categoría */}
          <input
            type="text" value={cat} onChange={e => setCat(e.target.value)}
            placeholder="Categoría (ej. Servicios, Trabajo…)"
            style={inputSt} maxLength={60}
          />

          {/* Notificación Telegram */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox" checked={notifTg}
              onChange={async e => {
                const checked = e.target.checked
                setNotifTg(checked)
                if (checked && item) {
                  await createNotif({ ...item, notif_telegram: true })
                }
              }}
            />
            <span>📲 Recordatorio por Telegram</span>
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !canSave}
              style={{
                flex: 1, padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                background: saving || !canSave ? 'var(--ink-3)' : 'var(--amber)',
                color:      saving || !canSave ? 'var(--fg-mute)' : 'var(--ink-0)',
                border: 'none', cursor: saving || !canSave ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: '11px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                color: 'var(--fg-dim)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
