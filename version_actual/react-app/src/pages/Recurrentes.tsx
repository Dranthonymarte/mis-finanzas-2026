// ═══════════════════════════════════════════════════
// Recurrentes — /recurrentes
// Gestión de movimientos recurrentes del config
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useConfig } from '../hooks/useConfig'
import { useFormat } from '../hooks/useFormat'

// ── Local shape for recurrent items ─────────────────
interface RecurrenteItem {
  id:               string
  descripcion:      string
  monto:            number
  recurrencia_dias: number    // period in days (30 = monthly)
  recDia?:          number    // day of month (1-28)
  tipo:             string
  cat:              string
}

const TIPOS = ['Gasto', 'Ingreso Fijo', 'Ingreso Variable', 'Ahorro en efectivo']

function tipoColor(tipo: string): string {
  if (tipo.startsWith('Ingreso')) return 'var(--pos)'
  if (tipo.startsWith('Ahorro'))  return 'var(--info)'
  return 'var(--neg)'
}

const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-3)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13,
  color: 'var(--fg)', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export default function Recurrentes() {
  const { fmt }                        = useFormat()
  const { config, updateConfig }       = useConfig()

  const items = (config.recurrentes as RecurrenteItem[])

  // ── Form state ──────────────────────────────────
  const [open,     setOpen]     = useState(false)
  const [desc,     setDesc]     = useState('')
  const [monto,    setMonto]    = useState('')
  const [dias,     setDias]     = useState('30')
  const [diaNum,   setDiaNum]   = useState(1)     // day of month
  const [tipo,     setTipo]     = useState(TIPOS[0])
  const [cat,      setCat]      = useState('')
  const [saving,   setSaving]   = useState(false)

  function resetForm() {
    setDesc(''); setMonto(''); setDias('30'); setDiaNum(1); setTipo(TIPOS[0]); setCat('')
  }

  async function handleAdd() {
    const montoNum = parseFloat(monto)
    if (!desc.trim() || !montoNum || montoNum <= 0) return
    setSaving(true)
    const newItem: RecurrenteItem = {
      id:               Date.now().toString(),
      descripcion:      desc.trim(),
      monto:            montoNum,
      recurrencia_dias: parseInt(dias) || 30,
      recDia:           diaNum,
      tipo,
      cat:              cat.trim() || tipo,
    }
    const updated = [...items, newItem]
    await updateConfig('recurrentes', updated)
    resetForm()
    setOpen(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const updated = items.filter(r => r.id !== id)
    await updateConfig('recurrentes', updated)
  }

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
              Agrega pagos o ingresos que se repiten periódicamente.
            </div>
          </div>
        )}

        {/* ── List ── */}
        {items.length > 0 && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {items.map((r, i) => {
              const color = tipoColor(r.tipo)
              const isLast = i === items.length - 1
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px',
                        borderRadius: 999, background: `${color}18`,
                        color, border: `1px solid ${color}40`,
                        whiteSpace: 'nowrap',
                      }}>
                        {r.tipo.length > 14 ? r.tipo.slice(0, 14) + '…' : r.tipo}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.descripcion}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5 }}>
                      <span>{r.cat}</span>
                      <span>·</span>
                      <span>
                        {r.recurrencia_dias === 30 ? 'Mensual' : `cada ${r.recurrencia_dias} días`}
                        {r.recDia ? ` · día ${r.recDia}` : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                      {fmt(r.monto)}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      aria-label="Eliminar"
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--ink-3)', border: '1px solid var(--line)',
                        color: 'var(--fg-mute)', fontSize: 14, display: 'grid', placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Inline form ── */}
        {open && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
              Nuevo recurrente
            </div>

            {/* Tipo chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIPOS.map(t => {
                const color = tipoColor(t)
                const sel   = t === tipo
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    style={{
                      padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                      background: sel ? `${color}18` : 'var(--ink-3)',
                      color:      sel ? color : 'var(--fg-mute)',
                      border:     sel ? `1.5px solid ${color}50` : '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            {/* Descripcion */}
            <input
              type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Descripción (ej. Netflix, Salario…)"
              style={inputSt} maxLength={100}
            />

            {/* Monto + Días + Día del mes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4 }}>Monto (USD)</div>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0.00"
                  style={inputSt}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4 }}>Cada N días</div>
                <input
                  type="number" inputMode="numeric" min="1" max="365"
                  value={dias} onChange={e => setDias(e.target.value)}
                  style={inputSt}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4 }}>Día del mes</div>
                <input
                  type="number" inputMode="numeric" min="1" max="28"
                  value={diaNum} onChange={e => setDiaNum(parseInt(e.target.value) || 1)}
                  style={inputSt}
                />
              </div>
            </div>

            {/* Categoría */}
            <input
              type="text" value={cat} onChange={e => setCat(e.target.value)}
              placeholder="Categoría (ej. Servicios, Trabajo…)"
              style={inputSt} maxLength={60}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAdd}
                disabled={saving || !desc.trim() || !parseFloat(monto)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  background: saving || !desc.trim() || !parseFloat(monto) ? 'var(--ink-3)' : 'var(--amber)',
                  color:      saving || !desc.trim() || !parseFloat(monto) ? 'var(--fg-mute)' : 'var(--ink-0)',
                  border: 'none', cursor: 'pointer',
                  transition: 'background .15s',
                }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setOpen(false); resetForm() }}
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
            onClick={() => setOpen(true)}
            style={{
              width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'var(--ink-2)', border: '1px dashed var(--line)',
              color: 'var(--amber)', cursor: 'pointer', letterSpacing: '.01em',
            }}
          >
            + Nuevo recurrente
          </button>
        )}

      </div>
    </div>
  )
}
