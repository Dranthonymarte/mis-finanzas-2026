// ═══════════════════════════════════════════════════
// Subcategorias — /settings/subcategorias
// Chips UX: one chip per parent category, list below
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import ConfirmSheet from '../../components/ui/ConfirmSheet'
import { useConfig } from '../../hooks/useConfig'

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '8px 12px', fontSize: 13,
  color: 'var(--fg)', outline: 'none',
}

interface DeleteTarget { cat: string; subcat: string }

export default function Subcategorias() {
  const { config, updateConfig } = useConfig()

  const subcats = config.subcategorias   // Record<string, string[]>

  // All category keys (from categorias + any extra subcat keys)
  const allCatKeys = Array.from(new Set([
    ...Object.keys(config.categorias),
    ...Object.keys(subcats),
  ]))

  // Active chip — default to first category
  const [activeCat, setActiveCat] = useState<string>(allCatKeys[0] ?? '')

  // inline rename: key is subcat string, value is current draft
  const [editSub, setEditSub] = useState<{ oldVal: string; newVal: string } | null>(null)

  // add-input draft for current active cat
  const [addDraft, setAddDraft] = useState('')

  // ConfirmSheet state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // ── Remove subcat (after confirm) ─────────────────
  async function confirmDelete() {
    if (!deleteTarget) return
    const { cat, subcat } = deleteTarget
    const updated: Record<string, string[]> = {
      ...subcats,
      [cat]: (subcats[cat] ?? []).filter(s => s !== subcat),
    }
    setDeleteTarget(null)
    await updateConfig('subcategorias', updated)
  }

  // ── Add subcat ────────────────────────────────────
  async function addSubcat() {
    const trimmed = addDraft.trim()
    if (!trimmed) return
    const current = subcats[activeCat] ?? []
    if (current.includes(trimmed)) { setAddDraft(''); return }
    setAddDraft('')
    await updateConfig('subcategorias', { ...subcats, [activeCat]: [...current, trimmed] })
  }

  // ── Rename subcat ─────────────────────────────────
  async function renameSubcat() {
    if (!editSub) return
    const { oldVal, newVal } = editSub
    const trimmed = newVal.trim()
    if (!trimmed || trimmed === oldVal) { setEditSub(null); return }
    const list = subcats[activeCat] ?? []
    if (list.includes(trimmed)) { setEditSub(null); return }
    const updated = list.map(s => s === oldVal ? trimmed : s)
    setEditSub(null)
    await updateConfig('subcategorias', { ...subcats, [activeCat]: updated })
  }

  const list = subcats[activeCat] ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Subcategorías" back />

      {/* ── Chips row ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px 6px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {allCatKeys.map(cat => {
          const isActive = cat === activeCat
          return (
            <button
              key={cat}
              onClick={() => { setActiveCat(cat); setEditSub(null); setAddDraft('') }}
              style={{
                flexShrink: 0, padding: '5px 13px', borderRadius: 999,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: isActive ? 'var(--amber)' : 'var(--ink-2)',
                color:      isActive ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     isActive ? 'none'         : '1px solid var(--line)',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Subcat list for active category ── */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {list.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', textAlign: 'center', padding: '12px 0' }}>
            Sin subcategorías todavía.
          </div>
        )}

        {list.map(sub => {
          const isRenaming = editSub?.oldVal === sub
          return (
            <div
              key={sub}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px',
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 12,
              }}
            >
              {isRenaming ? (
                <input
                  type="text"
                  value={editSub.newVal}
                  autoFocus
                  onChange={e => setEditSub({ ...editSub, newVal: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') renameSubcat()
                    if (e.key === 'Escape') setEditSub(null)
                  }}
                  onBlur={renameSubcat}
                  style={{ ...inputSt, padding: '4px 8px', fontSize: 13 }}
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 13.5, color: 'var(--fg)', cursor: 'text' }}
                  onClick={() => setEditSub({ oldVal: sub, newVal: sub })}
                  title="Toca para renombrar"
                >
                  {sub}
                </span>
              )}
              {!isRenaming && (
                <button
                  onClick={() => setDeleteTarget({ cat: activeCat, subcat: sub })}
                  style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                    color: 'var(--neg)', fontSize: 14, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label={`Eliminar ${sub}`}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        {/* ── Add row ── */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <input
            type="text"
            placeholder="Nueva subcategoría…"
            value={addDraft}
            onChange={e => setAddDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSubcat() }}
            onBlur={addSubcat}
            style={inputSt}
          />
          <button
            onClick={addSubcat}
            disabled={!addDraft.trim()}
            style={{
              padding: '8px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, flexShrink: 0,
              background: addDraft.trim() ? 'var(--amber)' : 'var(--ink-3)',
              color:      addDraft.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
              border: 'none', cursor: addDraft.trim() ? 'pointer' : 'default',
            }}
          >
            +
          </button>
        </div>

      </div>

      <div style={{ height: 32 }} />

      {/* ── ConfirmSheet delete ── */}
      <ConfirmSheet
        open={!!deleteTarget}
        title="¿Eliminar subcategoría?"
        message={deleteTarget ? `"${deleteTarget.subcat}" se eliminará de ${deleteTarget.cat}.` : undefined}
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
