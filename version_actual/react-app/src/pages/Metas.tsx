// ═══════════════════════════════════════════════════
// Metas — /metas  (BLOQUE 5)
// Circular progress · inline abono · useFormat · CRUD
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { useConfig, type MetaAhorro } from '../hooks/useConfig'
import { useFormat } from '../hooks/useFormat'

const inputSt: React.CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '8px 10px', fontSize: 13,
  color: 'var(--fg)', outline: 'none',
}

const EMOJIS = ['🎯','✈️','🏠','🛡️','🚗','💍','💻','📚','🌴','🏋️']

/* ── SVG circular progress ── */
function CircProgress({ pct, color, size = 68 }: { pct: number; color: string; size?: number }) {
  const r     = (size - 8) / 2
  const circ  = 2 * Math.PI * r
  const dash  = (Math.min(100, pct) / 100) * circ
  const cx    = size / 2
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ink-3)" strokeWidth={7} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .4s ease' }}
      />
    </svg>
  )
}

function MetaCard({ meta, onAbono, onDelete }: {
  meta:     MetaAhorro
  onAbono:  (id: string, monto: number) => void
  onDelete: (id: string) => void
}) {
  const { fmt }    = useFormat()
  const [showAbono, setShowAbono] = useState(false)
  const [abonoVal,  setAbonoVal]  = useState('')

  const pct       = Math.min(100, meta.objetivo > 0 ? (meta.actual / meta.objetivo) * 100 : 0)
  const remaining = meta.objetivo - meta.actual
  const tone      = pct >= 80 ? 'pos' : pct >= 40 ? 'amber' : 'mute'
  const circColor = pct >= 80 ? 'var(--pos)' : 'var(--amber)'

  function submitAbono() {
    const monto = parseFloat(abonoVal)
    if (!monto || monto <= 0) return
    onAbono(meta.id, monto)
    setShowAbono(false)
    setAbonoVal('')
  }

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>

      {/* ── Main row: circle + info + pills ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {/* Circular progress */}
        <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
          <CircProgress pct={pct} color={circColor} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{meta.emoji || '🎯'}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: circColor, marginTop: 1 }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.nombre}
          </div>
          <div className="num" style={{ fontSize: 13, marginTop: 2 }}>
            {fmt(meta.actual)}
            <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}> / {fmt(meta.objetivo)}</span>
          </div>
          {meta.fechaLimite && (
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>
              Meta: {new Date(meta.fechaLimite + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Pill tone={tone} size="xs">{pct.toFixed(0)}%</Pill>
          <button
            onClick={() => onDelete(meta.id)}
            style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(214,106,90,.1)', border: 'none', color: 'var(--neg)', fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >×</button>
        </div>
      </div>

      {/* ── Abono row ── */}
      {showAbono ? (
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>$</span>
          <input
            type="number"
            value={abonoVal}
            onChange={e => setAbonoVal(e.target.value)}
            placeholder="Monto"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') submitAbono() }}
            style={{ ...inputSt, padding: '6px 9px', fontSize: 12 }}
          />
          <button
            onClick={submitAbono}
            style={{ padding: '6px 11px', borderRadius: 7, background: 'var(--amber)', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}
          >OK</button>
          <button
            onClick={() => { setShowAbono(false); setAbonoVal('') }}
            style={{ padding: '6px 9px', borderRadius: 7, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--fg-mute)', cursor: 'pointer' }}
          >✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
          {remaining > 0 ? (
            <span style={{ color: 'var(--fg-mute)' }}>Faltan {fmt(remaining)}</span>
          ) : (
            <span style={{ color: 'var(--pos)', fontWeight: 600 }}>¡Meta alcanzada! 🎉</span>
          )}
          <button
            onClick={() => setShowAbono(true)}
            style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 600, color: 'var(--amber)', cursor: 'pointer' }}
          >
            + Abonar
          </button>
        </div>
      )}
    </div>
  )
}

export default function Metas() {
  const { config, updateConfig } = useConfig()
  const metas = config.metasAhorro

  const [showForm,  setShowForm]  = useState(false)
  const [nombre,    setNombre]    = useState('')
  const [objetivo,  setObjetivo]  = useState('')
  const [actual,    setActual]    = useState('0')
  const [fechaLim,  setFechaLim]  = useState('')
  const [emoji,     setEmoji]     = useState('🎯')

  async function addMeta() {
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj) return
    const next: MetaAhorro[] = [...metas, {
      id:          Date.now().toString(),
      nombre:      nombre.trim(),
      objetivo:    obj,
      actual:      parseFloat(actual) || 0,
      fechaLimite: fechaLim,
      emoji,
      creada:      new Date().toISOString().slice(0, 10),
    }]
    await updateConfig('metas_ahorro', next)
    setShowForm(false)
    setNombre(''); setObjetivo(''); setActual('0'); setFechaLim(''); setEmoji('🎯')
  }

  async function deleteMeta(id: string) {
    const next = metas.filter(m => m.id !== id)
    await updateConfig('metas_ahorro', next)
  }

  async function abonar(id: string, monto: number) {
    const next = metas.map(m =>
      m.id === id ? { ...m, actual: m.actual + monto } : m
    )
    await updateConfig('metas_ahorro', next)
  }

  const active    = metas.filter(m => !m.completada)
  const completed = metas.filter(m => m.completada)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Metas de ahorro" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {active.map(m => (
          <MetaCard key={m.id} meta={m} onAbono={abonar} onDelete={deleteMeta} />
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginTop: 8 }}>
              Completadas
            </div>
            {completed.map(m => (
              <MetaCard key={m.id} meta={m} onAbono={abonar} onDelete={deleteMeta} />
            ))}
          </>
        )}

        {/* Add form or button */}
        {showForm ? (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--amber)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  style={{ fontSize: 20, background: emoji === e ? 'var(--amber)' : 'var(--ink-3)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text"   value={nombre}   onChange={e => setNombre(e.target.value)}   placeholder="Nombre de la meta" style={inputSt} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={objetivo}  onChange={e => setObjetivo(e.target.value)}  placeholder="Objetivo $" style={inputSt} />
              <input type="number" value={actual}    onChange={e => setActual(e.target.value)}    placeholder="Actual $"   style={inputSt} />
            </div>
            <input type="date" value={fechaLim} onChange={e => setFechaLim(e.target.value)} style={inputSt} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addMeta} style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Crear
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--ink-3)', color: 'var(--fg-mute)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
              borderRadius: 16, padding: '14px',
              color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Nueva meta
          </button>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
