import { useState } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import CatIcon from '../../components/ui/CatIcon'
import { useConfig } from '../../hooks/useConfig'

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5,
  color: 'var(--fg)', outline: 'none',
}

/** Read/write emoji overrides from localStorage */
function readEmojiMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('mf-cat-emojis') || '{}') } catch { return {} }
}
function writeEmojiMap(map: Record<string, string>) {
  try { localStorage.setItem('mf-cat-emojis', JSON.stringify(map)) } catch { /* noop */ }
}

export default function Categories() {
  const { config, updateConfig } = useConfig()
  const [activeTipo, setActiveTipo] = useState(config.tipos[0]?.nombre ?? 'Gasto')
  const [showForm,  setShowForm]   = useState(false)
  const [newName,   setNewName]    = useState('')
  const [saving,    setSaving]     = useState(false)
  const [editCat,   setEditCat]    = useState<string | null>(null)
  const [editVal,   setEditVal]    = useState('')
  const [editEmoji, setEditEmoji]  = useState('')
  const [emojiMap,  setEmojiMap]   = useState<Record<string, string>>(readEmojiMap)

  const tipos = config.tipos.map(t => t.nombre)
  const cats  = config.categorias[activeTipo] ?? []

  async function addCategory() {
    const trimmed = newName.trim()
    if (!trimmed || cats.includes(trimmed)) return
    setSaving(true)
    const next = { ...config.categorias, [activeTipo]: [...cats, trimmed] }
    await updateConfig('categorias', next)
    setSaving(false)
    setShowForm(false)
    setNewName('')
  }

  async function removeCategory(cat: string) {
    const next = { ...config.categorias, [activeTipo]: cats.filter(c => c !== cat) }
    await updateConfig('categorias', next)
  }

  async function renameCategory() {
    if (!editCat) return
    const trimmed = editVal.trim()
    // Save emoji override even if name didn't change
    const emojiTrimmed = editEmoji.trim()
    if (emojiTrimmed) {
      const nextMap = { ...emojiMap, [trimmed || editCat]: emojiTrimmed }
      writeEmojiMap(nextMap)
      setEmojiMap(nextMap)
    }
    if (!trimmed || trimmed === editCat || cats.includes(trimmed)) { setEditCat(null); return }
    // Rename inside categorias[tipo]
    const nextCats = {
      ...config.categorias,
      [activeTipo]: cats.map(c => c === editCat ? trimmed : c),
    }
    await updateConfig('categorias', nextCats)
    // Keep subcategorias coherent: migrate the key oldName → newName
    const subs = config.subcategorias
    if (subs[editCat]) {
      const nextSubs = { ...subs, [trimmed]: subs[editCat] }
      delete nextSubs[editCat]
      await updateConfig('subcategorias', nextSubs)
    }
    setEditCat(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Categorías" back />

      {/* Tipo tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 16px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {tipos.map(t => (
          <button
            key={t}
            onClick={() => { setActiveTipo(t); setShowForm(false) }}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 999,
              fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
              background: activeTipo === t ? 'var(--amber)' : 'var(--ink-2)',
              color:      activeTipo === t ? 'var(--ink-0)' : 'var(--fg-dim)',
              border:     activeTipo === t ? 'none' : '1px solid var(--line)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cats.map(cat => (
          <div
            key={cat}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <CatIcon cat={cat} size={36} />
            {editCat === cat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <input
                  type="text" value={editVal} autoFocus
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameCategory(); if (e.key === 'Escape') setEditCat(null) }}
                  placeholder="Nombre"
                  style={{ ...inputSt, flex: 'unset', padding: '6px 10px' }}
                />
                <input
                  type="text" value={editEmoji}
                  onChange={e => setEditEmoji(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameCategory(); if (e.key === 'Escape') setEditCat(null) }}
                  onBlur={renameCategory}
                  placeholder="Emoji (ej: 🍕)"
                  maxLength={4}
                  style={{ ...inputSt, flex: 'unset', padding: '5px 10px', fontSize: 16, textAlign: 'center', width: 80 }}
                />
              </div>
            ) : (
              <span
                style={{ flex: 1, fontSize: 14, fontWeight: 500, cursor: 'text' }}
                onClick={() => { setEditCat(cat); setEditVal(cat); setEditEmoji(emojiMap[cat] ?? '') }}
                title="Toca para renombrar o cambiar emoji"
              >
                {cat}
              </span>
            )}
            {editCat !== cat && (
              <>
                <button
                  onClick={() => { setEditCat(cat); setEditVal(cat); setEditEmoji(emojiMap[cat] ?? '') }}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--ink-3)', border: '1px solid var(--line)',
                    color: 'var(--fg-dim)', fontSize: 13, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label={`Renombrar ${cat}`}
                >
                  ✎
                </button>
                <button
                  onClick={() => removeCategory(cat)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                    color: 'var(--neg)', fontSize: 16, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label={`Eliminar ${cat}`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}

        {showForm ? (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--amber)',
            borderRadius: 14, padding: '13px 14px',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              type="text" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
              placeholder="Nombre de categoría"
              autoFocus style={inputSt}
            />
            <button
              onClick={addCategory}
              disabled={saving}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
              }}
            >
              {newName.trim() ? 'Añadir' : 'Cancelar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName('') }}
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
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
              borderRadius: 14, padding: '13px',
              color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Nueva categoría en {activeTipo}
          </button>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
