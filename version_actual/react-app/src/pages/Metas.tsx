import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { useConfig, type MetaAhorro } from '../hooks/useConfig'

const inputSt: React.CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '8px 10px', fontSize: 13,
  color: 'var(--fg)', outline: 'none',
}

const EMOJIS = ['🎯','✈️','🏠','🛡️','🚗','💍','💻','📚','🌴','🏋️']

function MetaCard({ meta, onAbono, onDelete }: {
  meta: MetaAhorro
  onAbono: (id: string) => void
  onDelete: (id: string) => void
}) {
  const pct       = Math.min(100, meta.objetivo > 0 ? (meta.actual / meta.objetivo) * 100 : 0)
  const remaining = meta.objetivo - meta.actual
  const tone      = pct >= 80 ? 'pos' : pct >= 40 ? 'amber' : 'mute'

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 26 }}>{meta.emoji || '🎯'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{meta.nombre}</div>
          {meta.fechaLimite && (
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
              Objetivo: {new Date(meta.fechaLimite + 'T12:00:00').toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
        <Pill tone={tone} size="xs">{pct.toFixed(0)}%</Pill>
        <button
          onClick={() => onDelete(meta.id)}
          style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(214,106,90,.1)', border: 'none', color: 'var(--neg)', fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >×</button>
      </div>

      <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct >= 80 ? 'var(--pos)' : 'var(--amber)',
          borderRadius: 999, transition: 'width .3s',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
        <span style={{ color: 'var(--fg-mute)' }}>${meta.actual.toLocaleString('en-US')} ahorrado</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {remaining > 0 && <span style={{ color: 'var(--fg-mute)' }}>Faltan ${remaining.toLocaleString('en-US')}</span>}
          <button
            onClick={() => onAbono(meta.id)}
            style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 600, color: 'var(--amber)', cursor: 'pointer' }}
          >+ Abonar</button>
        </div>
      </div>
    </div>
  )
}

export default function Metas() {
  const { config, updateConfig } = useConfig()
  const metas = config.metasAhorro

  const [showForm,   setShowForm]   = useState(false)
  const [nombre,     setNombre]     = useState('')
  const [objetivo,   setObjetivo]   = useState('')
  const [actual,     setActual]     = useState('0')
  const [fechaLim,   setFechaLim]   = useState('')
  const [emoji,      setEmoji]      = useState('🎯')

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
    setShowForm(false); setNombre(''); setObjetivo(''); setActual('0'); setFechaLim(''); setEmoji('🎯')
  }

  async function deleteMeta(id: string) {
    const next = metas.filter(m => m.id !== id)
    await updateConfig('metas_ahorro', next)
  }

  async function abonar(id: string) {
    const raw = window.prompt('¿Cuánto abonar (USD)?')
    if (!raw) return
    const monto = parseFloat(raw)
    if (!monto || monto <= 0) return
    const next = metas.map(m => m.id === id ? { ...m, actual: m.actual + monto } : m)
    await updateConfig('metas_ahorro', next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Metas de ahorro" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metas.filter(m => !m.completada).map(m => (
          <MetaCard key={m.id} meta={m} onAbono={abonar} onDelete={deleteMeta} />
        ))}

        {showForm ? (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--amber)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Emoji picker row */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  style={{ fontSize: 20, background: emoji === e ? 'var(--amber)' : 'var(--ink-3)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text"    value={nombre}    onChange={e => setNombre(e.target.value)}    placeholder="Nombre de la meta" style={inputSt} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={objetivo}   onChange={e => setObjetivo(e.target.value)}  placeholder="Objetivo $" style={inputSt} />
              <input type="number" value={actual}     onChange={e => setActual(e.target.value)}    placeholder="Actual $"   style={inputSt} />
            </div>
            <input type="date"   value={fechaLim}  onChange={e => setFechaLim(e.target.value)}  style={inputSt} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addMeta}          style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'var(--amber)',  color: 'var(--ink-0)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Crear</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--ink-3)', color: 'var(--fg-mute)', border: '1px solid var(--line)', cursor: 'pointer' }}>✕</button>
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
