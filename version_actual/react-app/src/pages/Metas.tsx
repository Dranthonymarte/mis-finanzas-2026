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
  width: '100%', boxSizing: 'border-box',
  background: 'var(--ink-1)', border: '1px solid var(--line)',
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

function MetaCard({ meta, onAbono, onEdit, onDelete }: {
  meta:     MetaAhorro
  onAbono:  (id: string, monto: number) => void
  onEdit:   (id: string, patch: Partial<MetaAhorro>) => void
  onDelete: (id: string) => void
}) {
  const { fmt }    = useFormat()
  const [showAbono, setShowAbono] = useState(false)
  const [abonoVal,  setAbonoVal]  = useState('')
  const [editMode,  setEditMode]  = useState(false)
  const [showSim,   setShowSim]   = useState(false)
  const [simVal,    setSimVal]    = useState('')

  // Edit field states — initialised on open
  const [eNombre,   setENombre]   = useState(meta.nombre)
  const [eObjetivo, setEObjetivo] = useState(String(meta.objetivo))
  const [eFecha,    setEFecha]    = useState(meta.fechaLimite ?? '')
  const [eEmoji,    setEEmoji]    = useState(meta.emoji || '🎯')

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

  function openEdit() {
    setENombre(meta.nombre)
    setEObjetivo(String(meta.objetivo))
    setEFecha(meta.fechaLimite ?? '')
    setEEmoji(meta.emoji || '🎯')
    setEditMode(true)
  }

  function submitEdit() {
    const obj = parseFloat(eObjetivo)
    if (!eNombre.trim() || !obj) return
    onEdit(meta.id, { nombre: eNombre.trim(), objetivo: obj, fechaLimite: eFecha, emoji: eEmoji })
    setEditMode(false)
  }

  /* ── Edit mode ── */
  if (editMode) {
    return (
      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--amber)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEEmoji(e)}
              style={{ fontSize: 18, background: eEmoji === e ? 'var(--amber)' : 'var(--ink-3)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
        <input type="text"   value={eNombre}   onChange={e => setENombre(e.target.value)}   placeholder="Nombre" style={inputSt} />
        <input type="number" value={eObjetivo}  onChange={e => setEObjetivo(e.target.value)} placeholder="Objetivo $" style={inputSt} />
        <input type="date"   value={eFecha}     onChange={e => setEFecha(e.target.value)}                           style={inputSt} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submitEdit}
            style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            Guardar
          </button>
          <button onClick={() => setEditMode(false)}
            style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--ink-3)', color: 'var(--fg-mute)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>

      {/* ── Main row: circle + info + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Circular progress */}
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <CircProgress pct={pct} color={circColor} size={64} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{meta.emoji || '🎯'}</span>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: circColor, marginTop: 1 }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Info — minWidth:0 for text truncation in flex */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.nombre}
          </div>
          <div className="num" style={{ fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fmt(meta.actual)}
            <span style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}> / {fmt(meta.objetivo)}</span>
          </div>
          {meta.fechaLimite && (
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2 }}>
              Límite: {new Date(meta.fechaLimite + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Action buttons — fixed width, no overflow */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <Pill tone={tone} size="xs">{pct.toFixed(0)}%</Pill>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={openEdit}
              title="Editar"
              style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-dim)', fontSize: 11, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >✎</button>
            <button
              onClick={() => onDelete(meta.id)}
              title="Eliminar"
              style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(214,106,90,.1)', border: 'none', color: 'var(--neg)', fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >×</button>
          </div>
        </div>
      </div>

      {/* ── Abono row ── */}
      {showAbono ? (
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--fg-mute)', flexShrink: 0 }}>$</span>
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
            style={{ flexShrink: 0, padding: '6px 11px', borderRadius: 7, background: 'var(--amber)', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}
          >OK</button>
          <button
            onClick={() => { setShowAbono(false); setAbonoVal('') }}
            style={{ flexShrink: 0, padding: '6px 9px', borderRadius: 7, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--fg-mute)', cursor: 'pointer' }}
          >✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, gap: 8 }}>
          <span style={{ color: remaining > 0 ? 'var(--fg-mute)' : 'var(--pos)', fontWeight: remaining <= 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {remaining > 0 ? `Faltan ${fmt(remaining)}` : '¡Meta alcanzada! 🎉'}
          </span>
          <button
            onClick={() => setShowAbono(true)}
            style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 600, color: 'var(--amber)', cursor: 'pointer' }}
          >
            + Abonar
          </button>
        </div>
      )}

      {/* ── Simulador ── */}
      {remaining > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          {showSim ? (
            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-mute)', flexShrink: 0 }}>Ahorro/mes $</span>
                <input
                  type="number"
                  value={simVal}
                  onChange={e => setSimVal(e.target.value)}
                  placeholder="ej: 200"
                  style={{ ...inputSt, padding: '5px 8px', fontSize: 12, flex: 1 }}
                />
                <button
                  onClick={() => setShowSim(false)}
                  style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-mute)', fontSize: 11, cursor: 'pointer' }}
                >✕</button>
              </div>
              {(() => {
                const mens = parseFloat(simVal) || 0
                if (mens <= 0) return null
                const months = Math.ceil(remaining / mens)
                const eta    = new Date()
                eta.setMonth(eta.getMonth() + months)
                return (
                  <div style={{ fontSize: 11.5, color: 'var(--fg-dim)', background: 'var(--ink-3)', borderRadius: 8, padding: '7px 10px' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                      {months} {months === 1 ? 'mes' : 'meses'}
                    </span>
                    {' '}para alcanzarla — {eta.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
                  </div>
                )
              })()}
            </div>
          ) : (
            <button
              onClick={() => setShowSim(true)}
              style={{ fontSize: 11, color: 'var(--fg-mute)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
            >
              📊 Simulador
            </button>
          )}
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

  async function editMeta(id: string, patch: Partial<MetaAhorro>) {
    const next = metas.map(m => m.id === id ? { ...m, ...patch } : m)
    await updateConfig('metas_ahorro', next)
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
          <MetaCard key={m.id} meta={m} onAbono={abonar} onEdit={editMeta} onDelete={deleteMeta} />
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginTop: 8 }}>
              Completadas
            </div>
            {completed.map(m => (
              <MetaCard key={m.id} meta={m} onAbono={abonar} onEdit={editMeta} onDelete={deleteMeta} />
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
