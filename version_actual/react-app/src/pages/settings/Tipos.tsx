// ═══════════════════════════════════════════════════
// Tipos — /settings/tipos
// CRUD tipos de movimiento (config.tipos)
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { useConfig, type TipoConfig } from '../../hooks/useConfig'

const BUILT_IN = new Set(['Gasto', 'Ingreso Fijo', 'Ingreso Variable'])

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5,
  color: 'var(--fg)', outline: 'none',
}

interface TipoRow extends TipoConfig {
  id: string
}

function toRow(t: TipoConfig, idx: number): TipoRow {
  return { ...t, id: (t as TipoRow).id ?? `built-${idx}` }
}

export default function Tipos() {
  const { config, updateConfig } = useConfig()

  const [newNombre,    setNewNombre]    = useState('')
  const [newEsIngreso, setNewEsIngreso] = useState(false)
  const [saving,       setSaving]       = useState(false)

  const rows: TipoRow[] = config.tipos.map(toRow)

  // ── Toggle esIngreso ──────────────────────────────
  async function toggleEsIngreso(row: TipoRow) {
    const next: TipoConfig[] = rows.map(r =>
      r.id === row.id ? { ...r, esIngreso: !r.esIngreso } : r,
    )
    await updateConfig('tipos', next)
  }

  // ── Delete tipo ───────────────────────────────────
  async function removeTipo(row: TipoRow) {
    if (BUILT_IN.has(row.nombre)) return
    const next: TipoConfig[] = rows.filter(r => r.id !== row.id)
    await updateConfig('tipos', next)
  }

  // ── Add tipo ──────────────────────────────────────
  async function addTipo() {
    const trimmed = newNombre.trim()
    if (!trimmed) return
    const already = rows.some(r => r.nombre.toLowerCase() === trimmed.toLowerCase())
    if (already) return
    setSaving(true)
    const nuevo: TipoRow = {
      id:        crypto.randomUUID(),
      nombre:    trimmed,
      esIngreso: newEsIngreso,
    }
    await updateConfig('tipos', [...rows, nuevo])
    setNewNombre('')
    setNewEsIngreso(false)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Tipos de movimiento" back />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* List */}
        {rows.map(row => (
          <div
            key={row.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px 14px',
            }}
          >
            {/* Nombre */}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
              {row.nombre}
            </span>

            {/* Ingreso / Gasto chip */}
            <button
              onClick={() => toggleEsIngreso(row)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: row.esIngreso ? 'rgba(224,168,74,.15)' : 'rgba(214,106,90,.12)',
                color:      row.esIngreso ? 'var(--amber)'          : 'var(--neg)',
                border:     row.esIngreso ? '1px solid rgba(224,168,74,.35)' : '1px solid rgba(214,106,90,.3)',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {row.esIngreso ? 'Ingreso' : 'Gasto'}
            </button>

            {/* Delete — disabled for built-ins */}
            <button
              onClick={() => removeTipo(row)}
              disabled={BUILT_IN.has(row.nombre)}
              title={BUILT_IN.has(row.nombre) ? 'Tipo protegido' : 'Eliminar'}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: BUILT_IN.has(row.nombre) ? 'var(--ink-3)'            : 'rgba(214,106,90,.1)',
                border:     BUILT_IN.has(row.nombre) ? '1px solid var(--line)'   : '1px solid rgba(214,106,90,.25)',
                color:      BUILT_IN.has(row.nombre) ? 'var(--fg-mute)'          : 'var(--neg)',
                fontSize: 16, display: 'grid', placeItems: 'center',
                cursor: BUILT_IN.has(row.nombre) ? 'not-allowed' : 'pointer',
                opacity: BUILT_IN.has(row.nombre) ? 0.4 : 1,
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Add form */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--ink-2)', border: '1px dashed var(--line)',
          borderRadius: 14, padding: '12px 14px', marginTop: 4,
        }}>
          <input
            type="text"
            placeholder="Nuevo tipo…"
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTipo() }}
            style={inputSt}
          />

          {/* esIngreso toggle */}
          <button
            onClick={() => setNewEsIngreso(v => !v)}
            style={{
              padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: newEsIngreso ? 'rgba(224,168,74,.18)' : 'rgba(214,106,90,.12)',
              color:      newEsIngreso ? 'var(--amber)'          : 'var(--neg)',
              border:     newEsIngreso ? '1px solid rgba(224,168,74,.35)' : '1px solid rgba(214,106,90,.3)',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            {newEsIngreso ? 'Ingreso' : 'Gasto'}
          </button>

          <button
            onClick={addTipo}
            disabled={saving || !newNombre.trim()}
            style={{
              padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: newNombre.trim() ? 'var(--amber)' : 'var(--ink-3)',
              color:      newNombre.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
              border: 'none', cursor: newNombre.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            Crear
          </button>
        </div>

      </div>
      <div style={{ height: 32 }} />
    </div>
  )
}
