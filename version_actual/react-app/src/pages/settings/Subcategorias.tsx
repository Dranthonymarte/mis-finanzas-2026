// ═══════════════════════════════════════════════════
// Subcategorias — /settings/subcategorias
// CRUD subcategorías (config.subcategorias)
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { useConfig } from '../../hooks/useConfig'

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '8px 12px', fontSize: 13,
  color: 'var(--fg)', outline: 'none',
}

export default function Subcategorias() {
  const { config, updateConfig } = useConfig()

  // categoria name → open/closed
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({})
  // categoria name → current input value
  const [draftMap,  setDraftMap]  = useState<Record<string, string>>({})

  const subcats = config.subcategorias   // Record<string, string[]>
  const cats    = Object.keys(subcats)

  function toggleExpand(cat: string) {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  function setDraft(cat: string, val: string) {
    setDraftMap(prev => ({ ...prev, [cat]: val }))
  }

  // ── Remove subcat ─────────────────────────────────
  async function removeSubcat(cat: string, subcat: string) {
    const updated: Record<string, string[]> = {
      ...subcats,
      [cat]: subcats[cat].filter(s => s !== subcat),
    }
    await updateConfig('subcategorias', updated)
  }

  // ── Add subcat ────────────────────────────────────
  async function addSubcat(cat: string) {
    const trimmed = (draftMap[cat] ?? '').trim()
    if (!trimmed) return
    const current = subcats[cat] ?? []
    if (current.includes(trimmed)) { setDraft(cat, ''); return }
    const updated: Record<string, string[]> = {
      ...subcats,
      [cat]: [...current, trimmed],
    }
    setDraft(cat, '')
    await updateConfig('subcategorias', updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Subcategorías" back />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {cats.map(cat => {
          const isOpen   = !!expanded[cat]
          const list     = subcats[cat] ?? []
          const draft    = draftMap[cat] ?? ''

          return (
            <div
              key={cat}
              style={{
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 14, overflow: 'hidden',
              }}
            >
              {/* Category header */}
              <button
                onClick={() => toggleExpand(cat)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 14px', background: 'none', border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                  {cat}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11.5, color: 'var(--fg-mute)',
                    background: 'var(--ink-3)', borderRadius: 6, padding: '2px 7px',
                  }}>
                    {list.length}
                  </span>
                  <span style={{
                    fontSize: 14, color: 'var(--fg-dim)',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    display: 'inline-block', transition: 'transform .2s',
                  }}>
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{
                  borderTop: '1px solid var(--line)',
                  padding: '8px 14px 12px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>

                  {list.length === 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', padding: '6px 0' }}>
                      Sin subcategorías todavía.
                    </div>
                  )}

                  {list.map(sub => (
                    <div
                      key={sub}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px',
                        background: 'var(--ink-3)', borderRadius: 10,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--fg)' }}>
                        {sub}
                      </span>
                      <button
                        onClick={() => removeSubcat(cat, sub)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                          color: 'var(--neg)', fontSize: 14, cursor: 'pointer',
                          display: 'grid', placeItems: 'center',
                        }}
                        aria-label={`Eliminar ${sub}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Inline add form */}
                  <div style={{
                    display: 'flex', gap: 6, alignItems: 'center',
                    marginTop: 6,
                  }}>
                    <input
                      type="text"
                      placeholder="Nueva subcategoría…"
                      value={draft}
                      onChange={e => setDraft(cat, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubcat(cat) }}
                      style={inputSt}
                    />
                    <button
                      onClick={() => addSubcat(cat)}
                      disabled={!draft.trim()}
                      style={{
                        padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                        background: draft.trim() ? 'var(--amber)' : 'var(--ink-3)',
                        color:      draft.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
                        border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
                        flexShrink: 0,
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

      </div>
      <div style={{ height: 32 }} />
    </div>
  )
}
