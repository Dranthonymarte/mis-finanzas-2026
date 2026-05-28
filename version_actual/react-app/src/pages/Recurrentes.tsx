// ═══════════════════════════════════════════════════
// Recurrentes — /recurrentes
// Lista + crear + editar recurrentes con notificación
// ═══════════════════════════════════════════════════

import { useState } from 'react'
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
  { label: 'Semanal',      dias: 7  },
  { label: 'Quincenal',    dias: 15 },
  { label: 'Mensual',      dias: 30 },
  { label: 'Personalizado', dias: 0 },
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

const BLANK = {
  desc: '', monto: '', freqIdx: 2, diasCustom: '30', diaNum: 1,
  tipo: TIPOS[0], cat: '', notifTg: false,
}

export default function Recurrentes() {
  const { fmt }              = useFormat()
  const { config, updateConfig } = useConfig()
  const userId               = useAuthStore(s => s.userId)

  const items = (config.recurrentes as RecurrenteItem[])

  const [open,       setOpen]       = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)

  // Form state
  const [desc,       setDesc]       = useState(BLANK.desc)
  const [monto,      setMonto]      = useState(BLANK.monto)
  const [freqIdx,    setFreqIdx]    = useState(BLANK.freqIdx)   // index in FREQ_OPTS
  const [diasCustom, setDiasCustom] = useState(BLANK.diasCustom)
  const [diaNum,     setDiaNum]     = useState(BLANK.diaNum)
  const [tipo,       setTipo]       = useState(BLANK.tipo)
  const [cat,        setCat]        = useState(BLANK.cat)
  const [notifTg,    setNotifTg]    = useState(BLANK.notifTg)

  const isMonthly = FREQ_OPTS[freqIdx]?.dias === 30 || (freqIdx === 3 && parseInt(diasCustom) >= 28)
  const diasFinal = freqIdx === 3 ? (parseInt(diasCustom) || 30) : FREQ_OPTS[freqIdx].dias

  function loadIntoForm(r: RecurrenteItem) {
    setDesc(r.descripcion)
    setMonto(String(r.monto))
    const presetIdx = FREQ_OPTS.findIndex(f => f.dias === r.recurrencia_dias && f.dias !== 0)
    if (presetIdx >= 0) { setFreqIdx(presetIdx) } else { setFreqIdx(3); setDiasCustom(String(r.recurrencia_dias)) }
    setDiaNum(r.recDia ?? 1)
    setTipo(r.tipo)
    setCat(r.cat)
    setNotifTg(!!r.notif_telegram)
  }

  function resetForm() {
    setDesc(BLANK.desc); setMonto(BLANK.monto); setFreqIdx(BLANK.freqIdx)
    setDiasCustom(BLANK.diasCustom); setDiaNum(BLANK.diaNum)
    setTipo(BLANK.tipo); setCat(BLANK.cat); setNotifTg(BLANK.notifTg)
  }

  function openAdd() { resetForm(); setEditId(null); setOpen(true) }

  function openEdit(r: RecurrenteItem) { loadIntoForm(r); setEditId(r.id); setOpen(true) }

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

  async function handleSave() {
    const montoNum = parseFloat(monto)
    if (!desc.trim() || !montoNum || montoNum <= 0) return
    setSaving(true)

    const newItem: RecurrenteItem = {
      id:               editId ?? Date.now().toString(),
      descripcion:      desc.trim(),
      monto:            montoNum,
      recurrencia_dias: diasFinal,
      recDia:           isMonthly ? diaNum : undefined,
      tipo,
      cat:              cat.trim() || tipo,
      notif_telegram:   notifTg,
    }

    let updated: RecurrenteItem[]
    if (editId) {
      updated = items.map(r => r.id === editId ? newItem : r)
    } else {
      updated = [...items, newItem]
      await createNotif(newItem)
    }

    await updateConfig('recurrentes', updated)
    resetForm(); setOpen(false); setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await updateConfig('recurrentes', items.filter(r => r.id !== id))
  }

  const isEditing = !!editId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 40 }}>
      <AppHeader title="Recurrentes" back />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Empty state ── */}
        {items.length === 0 && !open && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 28,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
          }}>
            <span style={{ fontSize: 36, lineHeight: 1 }}>🔁</span>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Sin recurrentes</div>
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.6 }}>
              Agrega pagos o ingresos que se repiten periódicamente.<br />
              Puedes activar recordatorios por Telegram al crearlos.
            </div>
          </div>
        )}

        {/* ── List ── */}
        {items.length > 0 && !open && (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {items.map((r, i) => {
              const color  = tipoColor(r.tipo)
              const isLast = i === items.length - 1
              return (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(r)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(r)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background .12s',
                  }}
                  onPointerDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                  onPointerUp={e => (e.currentTarget.style.background = '')}
                  onPointerLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px',
                        borderRadius: 999, background: `${color}18`,
                        color, border: `1px solid ${color}40`, whiteSpace: 'nowrap',
                      }}>
                        {r.tipo.length > 14 ? r.tipo.slice(0, 14) + '…' : r.tipo}
                      </span>
                      {r.notif_telegram && (
                        <span style={{ fontSize: 10, color: 'var(--info)', background: 'rgba(41,182,246,.1)', border: '1px solid rgba(41,182,246,.25)', borderRadius: 999, padding: '2px 6px' }}>
                          📲 Telegram
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.descripcion}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5 }}>
                      <span>{r.cat}</span>
                      <span>·</span>
                      <span>{freqLabel(r.recurrencia_dias, r.recDia)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                      {fmt(r.monto)}
                    </div>
                    <div
                      role="button"
                      aria-label="Eliminar"
                      tabIndex={-1}
                      onClick={e => { e.stopPropagation(); void handleDelete(r.id) }}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--ink-3)', border: '1px solid var(--line)',
                        color: 'var(--fg-mute)', fontSize: 14, display: 'grid', placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Form (create / edit) ── */}
        {open && (
          <div style={{
            background: 'var(--ink-2)', border: `1px solid ${isEditing ? 'rgba(224,168,74,.4)' : 'var(--line)'}`,
            borderRadius: 14, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: isEditing ? 'var(--amber)' : 'var(--fg-mute)' }}>
              {isEditing ? '✏️ Editar recurrente' : 'Nuevo recurrente'}
            </div>

            {/* Tipo chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIPOS.map(t => {
                const color = tipoColor(t)
                const sel   = t === tipo
                return (
                  <button key={t} onClick={() => setTipo(t)} style={{
                    padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    background: sel ? `${color}18` : 'var(--ink-3)',
                    color:      sel ? color : 'var(--fg-mute)',
                    border:     sel ? `1.5px solid ${color}50` : '1px solid var(--line)',
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
              <input type="checkbox" checked={notifTg} onChange={e => setNotifTg(e.target.checked)} />
              <span>📲 Recordatorio por Telegram</span>
              {notifTg && !isEditing && <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>(se crea en Notificaciones)</span>}
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving || !desc.trim() || !parseFloat(monto)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  background: saving || !desc.trim() || !parseFloat(monto) ? 'var(--ink-3)' : 'var(--amber)',
                  color:      saving || !desc.trim() || !parseFloat(monto) ? 'var(--fg-mute)' : 'var(--ink-0)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear'}
              </button>
              <button
                onClick={() => { setOpen(false); setEditId(null); resetForm() }}
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
        )}

        {/* ── Add button ── */}
        {!open && (
          <button
            onClick={openAdd}
            style={{
              width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'var(--ink-2)', border: '1px dashed var(--line)',
              color: 'var(--amber)', cursor: 'pointer',
            }}
          >
            + Nuevo recurrente
          </button>
        )}

        {/* ── Google Calendar note ── */}
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '11px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Google Calendar</div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 1 }}>
              Ve a Calendario para sincronizar con Google Calendar.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
