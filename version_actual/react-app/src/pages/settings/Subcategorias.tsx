// ═══════════════════════════════════════════════════
// Subcategorias — /settings/subcategorias
// UIX idéntica a Categorías: chips solo para cats con subcats,
// cards con ícono editable, rename on tap, ➕ por categoría.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import AppHeader    from '../../components/shell/AppHeader'
import CatIcon      from '../../components/ui/CatIcon'
import ConfirmSheet from '../../components/ui/ConfirmSheet'
import { useConfig } from '../../hooks/useConfig'

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5,
  color: 'var(--fg)', outline: 'none',
}

function readSubEmojiMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('mf-subcat-emojis') || '{}') } catch { return {} }
}
function writeSubEmojiMap(map: Record<string, string>) {
  try { localStorage.setItem('mf-subcat-emojis', JSON.stringify(map)) } catch { /* noop */ }
}

interface DeleteTarget { cat: string; subcat: string }
interface EditState    { cat: string; sub: string; newName: string; newEmoji: string }

export default function Subcategorias() {
  const { config, updateConfig } = useConfig()
  const subcats = config.subcategorias   // Record<string, string[]>

  // Build ordered chip list: cats that HAVE subcats, ordered by tipo order then alpha
  const tipoOrder = config.tipos.map(t => t.nombre)
  const catsWithSubs = Array.from(new Set([
    ...Object.entries(config.categorias)
      .flatMap(([, cats]) => cats)
      .filter(c => (subcats[c]?.length ?? 0) > 0),
    ...Object.keys(subcats).filter(k => (subcats[k]?.length ?? 0) > 0),
  ])).sort((a, b) => {
    // Sort by which tipo contains each cat
    const tipoOf = (cat: string) => {
      for (const t of tipoOrder) {
        if ((config.categorias[t] ?? []).includes(cat)) return tipoOrder.indexOf(t)
      }
      return tipoOrder.length
    }
    const ta = tipoOf(a), tb = tipoOf(b)
    return ta !== tb ? ta - tb : a.localeCompare(b)
  })

  // All categories available for adding subcats (not filtered)
  const allCatKeys = Array.from(new Set([
    ...Object.values(config.categorias).flat(),
    ...Object.keys(subcats),
  ])).sort()

  const [activeCat,    setActiveCat]    = useState<string>(catsWithSubs[0] ?? allCatKeys[0] ?? '')
  const [editState,    setEditState]    = useState<EditState | null>(null)
  const [addDraft,     setAddDraft]     = useState('')
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [emojiMap,     setEmojiMap]     = useState<Record<string, string>>(readSubEmojiMap)

  // All chips: ALL categories (discover where to add subcats), with count badge on those that have them
  const chipCats = Array.from(new Set([
    ...Object.entries(config.categorias).flatMap(([, cats]) => cats),
    ...Object.keys(subcats),
    activeCat,
  ])).sort((a, b) => {
    const tipoOf = (cat: string) => {
      for (const t of tipoOrder) {
        if ((config.categorias[t] ?? []).includes(cat)) return tipoOrder.indexOf(t)
      }
      return tipoOrder.length
    }
    const ta = tipoOf(a), tb = tipoOf(b)
    return ta !== tb ? ta - tb : a.localeCompare(b)
  }).filter(Boolean)

  const list = subcats[activeCat] ?? []

  // ── Add subcat ────────────────────────────────────
  async function addSubcat() {
    const trimmed = addDraft.trim()
    if (!trimmed) return
    const current = subcats[activeCat] ?? []
    if (current.includes(trimmed)) { setAddDraft(''); return }
    setAddDraft('')
    setShowAddForm(false)
    await updateConfig('subcategorias', { ...subcats, [activeCat]: [...current, trimmed] })
  }

  // ── Rename subcat ─────────────────────────────────
  async function saveEdit() {
    if (!editState) return
    const { cat, sub, newName, newEmoji } = editState
    const trimmed = newName.trim()
    const emojiTrimmed = newEmoji.trim()
    if (emojiTrimmed) {
      const nextMap = { ...emojiMap, [`${cat}::${trimmed || sub}`]: emojiTrimmed }
      writeSubEmojiMap(nextMap)
      setEmojiMap(nextMap)
    }
    if (trimmed && trimmed !== sub) {
      const catList = subcats[cat] ?? []
      if (!catList.includes(trimmed)) {
        const updated = catList.map(s => s === sub ? trimmed : s)
        await updateConfig('subcategorias', { ...subcats, [cat]: updated })
      }
    }
    setEditState(null)
  }

  // ── Delete subcat ─────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return
    const { cat, subcat } = deleteTarget
    const updated = { ...subcats, [cat]: (subcats[cat] ?? []).filter(s => s !== subcat) }
    setDeleteTarget(null)
    await updateConfig('subcategorias', updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Subcategorías" back />

      {/* ── Chips: solo cats con subcats ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 16px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {(chipCats.length > 0 ? chipCats : allCatKeys.slice(0, 6)).map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCat(cat); setEditState(null); setAddDraft(''); setShowAddForm(false) }}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 999,
              fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
              background: activeCat === cat ? 'var(--amber)' : 'var(--ink-2)',
              color:      activeCat === cat ? 'var(--ink-0)' : 'var(--fg-dim)',
              border:     activeCat === cat ? 'none' : '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >
            {cat}
            {(subcats[cat]?.length ?? 0) > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 10 }}>
                {subcats[cat].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {list.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12.5, padding: '12px 0' }}>
            Sin subcategorías en {activeCat}.
          </div>
        )}

        {/* Subcats como cards idénticas a Categorías */}
        {list.map(sub => {
          const emojiKey = `${activeCat}::${sub}`
          const isEditing = editState?.cat === activeCat && editState?.sub === sub
          const storedEmoji = emojiMap[emojiKey]
          return (
            <div
              key={sub}
              style={{
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 14, padding: '13px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <CatIcon cat={activeCat} size={36} />
              {isEditing ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <input
                    type="text" value={editState.newName} autoFocus
                    onChange={e => setEditState({ ...editState, newName: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') setEditState(null)
                    }}
                    placeholder="Nombre"
                    style={{ ...inputSt, flex: 'unset', padding: '6px 10px' }}
                  />
                  <input
                    type="text" value={editState.newEmoji}
                    onChange={e => setEditState({ ...editState, newEmoji: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') setEditState(null)
                    }}
                    onBlur={saveEdit}
                    placeholder="Emoji (ej: 🏷️)"
                    maxLength={4}
                    style={{ ...inputSt, flex: 'unset', padding: '5px 10px', fontSize: 16, textAlign: 'center', width: 80 }}
                  />
                </div>
              ) : (
                <span
                  style={{ flex: 1, fontSize: 14, fontWeight: 500, cursor: 'text' }}
                  onClick={() => setEditState({ cat: activeCat, sub, newName: sub, newEmoji: storedEmoji ?? '' })}
                  title="Toca para renombrar o cambiar emoji"
                >
                  {storedEmoji ? `${storedEmoji} ` : ''}{sub}
                </span>
              )}
              {!isEditing && (
                <>
                  <button
                    onClick={() => setEditState({ cat: activeCat, sub, newName: sub, newEmoji: storedEmoji ?? '' })}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--ink-3)', border: '1px solid var(--line)',
                      color: 'var(--fg-dim)', fontSize: 13, cursor: 'pointer',
                      display: 'grid', placeItems: 'center',
                    }}
                    aria-label={`Renombrar ${sub}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ cat: activeCat, subcat: sub })}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                      color: 'var(--neg)', fontSize: 16, cursor: 'pointer',
                      display: 'grid', placeItems: 'center',
                    }}
                    aria-label={`Eliminar ${sub}`}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}

        {/* Add form */}
        {showAddForm ? (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--amber)',
            borderRadius: 14, padding: '13px 14px',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              type="text" value={addDraft}
              onChange={e => setAddDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubcat() }}
              placeholder={`Nueva subcategoría en ${activeCat}`}
              autoFocus style={inputSt}
            />
            <button
              onClick={addSubcat}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
              }}
            >
              {addDraft.trim() ? 'Añadir' : 'Cancelar'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddDraft('') }}
              style={{
                padding: '8px 10px', borderRadius: 10, fontSize: 12.5,
                background: 'var(--ink-3)', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
              borderRadius: 14, padding: '13px',
              color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Nueva subcategoría en {activeCat}
          </button>
        )}
      </div>

      <div style={{ height: 32 }} />

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
