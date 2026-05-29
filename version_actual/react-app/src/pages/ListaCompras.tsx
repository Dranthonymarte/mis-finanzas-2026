// ═══════════════════════════════════════════════════
// ListaCompras — /lista-compras
// Multi-list: pantalla de listas + detalle de cada lista.
// Schema: listas_compras { id, user_id, household_id, nombre, items[], activa, archivada }
// Item: { id, nombre, cantidad, precio, checked }
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

interface ListItem {
  id:       string
  nombre:   string
  cantidad: number
  precio:   number
  checked:  boolean
}

interface ListaRow {
  id:           string
  user_id:      string
  household_id: string
  nombre:       string
  items:        ListItem[]
  activa:       boolean
  archivada:    boolean
  updated_at?:  string
}

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: 'var(--fg)', outline: 'none',
}

// ── Lista detail view ──────────────────────────────
function ListaDetail({ lista, onBack, onUpdate, onDelete }: {
  lista: ListaRow
  onBack: () => void
  onUpdate: (updated: ListaRow) => void
  onDelete: (id: string) => void
}) {
  const userId = useAuthStore(s => s.userId)
  const [nombre,        setNombre]        = useState('')
  const [cantidad,      setCantidad]      = useState(1)
  const [saving,        setSaving]        = useState(false)
  const [editingTitle,  setEditingTitle]  = useState(false)
  const [titleInput,    setTitleInput]    = useState(lista.nombre)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [editingItem,   setEditingItem]   = useState<string | null>(null)
  const [editNombre,    setEditNombre]    = useState('')
  const [editCantidad,  setEditCantidad]  = useState(1)

  async function saveTitle() {
    const trimmed = titleInput.trim()
    if (!trimmed || trimmed === lista.nombre) { setEditingTitle(false); return }
    await supabase.from('listas_compras').update({ nombre: trimmed, updated_at: new Date().toISOString() }).eq('id', lista.id)
    onUpdate({ ...lista, nombre: trimmed })
    setEditingTitle(false)
  }

  async function deleteLista() {
    await supabase.from('listas_compras').update({ archivada: true }).eq('id', lista.id)
    onDelete(lista.id)
    onBack()
  }

  async function persistItems(newItems: ListItem[]) {
    onUpdate({ ...lista, items: newItems })
    await supabase
      .from('listas_compras')
      .update({ items: newItems, updated_at: new Date().toISOString() })
      .eq('id', lista.id)
  }

  async function toggle(itemId: string) {
    await persistItems(lista.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i))
  }

  async function remove(itemId: string) {
    await persistItems(lista.items.filter(i => i.id !== itemId))
  }

  async function addItem() {
    const trimmed = nombre.trim()
    if (!trimmed || !userId) return
    setSaving(true)
    const newItem: ListItem = {
      id:       crypto.randomUUID(),
      nombre:   trimmed,
      cantidad: cantidad > 0 ? cantidad : 1,
      precio:   0,
      checked:  false,
    }
    await persistItems([...(lista.items ?? []), newItem])
    setNombre('')
    setCantidad(1)
    setSaving(false)
  }

  async function setPrecio(itemId: string, precio: number) {
    await persistItems(lista.items.map(i => i.id === itemId ? { ...i, precio: precio >= 0 ? precio : 0 } : i))
  }

  function startEditItem(item: ListItem) {
    setEditingItem(item.id)
    setEditNombre(item.nombre)
    setEditCantidad(item.cantidad)
  }

  async function saveEditItem(itemId: string) {
    const trimmed = editNombre.trim()
    if (!trimmed) { setEditingItem(null); return }
    await persistItems(lista.items.map(i =>
      i.id === itemId ? { ...i, nombre: trimmed, cantidad: editCantidad > 0 ? editCantidad : 1 } : i,
    ))
    setEditingItem(null)
  }

  async function clearChecked() {
    await persistItems(lista.items.filter(i => !i.checked))
  }

  const items        = lista.items ?? []
  const sorted       = [...items.filter(i => !i.checked), ...items.filter(i => i.checked)]
  const totalAll     = items.reduce((s, i) => s + i.cantidad * i.precio, 0)
  const totalPending = items.filter(i => !i.checked).reduce((s, i) => s + i.cantidad * i.precio, 0)
  const checkedCount = items.filter(i => i.checked).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader
        title={editingTitle ? 'Renombrar lista' : lista.nombre}
        back
        onBack={onBack}
        right={!editingTitle && !confirmDel ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setTitleInput(lista.nombre); setEditingTitle(true) }}
              aria-label="Renombrar lista"
              style={{
                width: 32, height: 32, borderRadius: 9, border: '1px solid var(--line)',
                background: 'var(--ink-2)', color: 'var(--fg-dim)', fontSize: 15,
                display: 'grid', placeItems: 'center', cursor: 'pointer',
              }}
            >✎</button>
            <button
              onClick={() => setConfirmDel(true)}
              aria-label="Eliminar lista"
              style={{
                width: 32, height: 32, borderRadius: 9,
                border: '1px solid rgba(214,106,90,.3)',
                background: 'rgba(214,106,90,.08)', color: 'var(--neg)', fontSize: 15,
                display: 'grid', placeItems: 'center', cursor: 'pointer',
              }}
            >🗑</button>
          </div>
        ) : undefined}
      />

      {editingTitle && (
        <div style={{
          padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center',
          borderBottom: '1px solid var(--line)', background: 'var(--ink-1)',
        }}>
          <input
            type="text"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
            autoFocus
            style={inputSt}
          />
          <button
            onClick={saveTitle}
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
          >Guardar</button>
          <button
            onClick={() => setEditingTitle(false)}
            style={{
              padding: '8px 10px', borderRadius: 10, fontSize: 13,
              background: 'var(--ink-3)', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer', flexShrink: 0,
            }}
          >✕</button>
        </div>
      )}

      {confirmDel && (
        <div style={{
          margin: '12px 16px', padding: '16px',
          background: 'rgba(214,106,90,.08)', border: '1px solid rgba(214,106,90,.3)',
          borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
            ¿Eliminar "{lista.nombre}"?
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-mute)' }}>
            Esta acción no se puede deshacer. Los ítems de la lista se perderán.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={deleteLista}
              style={{
                flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'var(--neg)', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >Sí, eliminar</button>
            <button
              onClick={() => setConfirmDel(false)}
              style={{
                flex: 1, padding: '9px', borderRadius: 10, fontSize: 13,
                background: 'var(--ink-3)', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer',
              }}
            >Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {sorted.length === 0 && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13,
          }}>
            Lista vacía. Agrega ítems abajo.
          </div>
        )}

        {sorted.map(item => (
          <div
            key={item.id}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '10px 12px',
              opacity: item.checked ? 0.55 : 1, transition: 'opacity .2s',
            }}
          >
            {editingItem === item.id ? (
              /* ── Edit mode ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  type="text"
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveEditItem(item.id); if (e.key === 'Escape') setEditingItem(null) }}
                  style={{ ...inputSt, fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Cant.</span>
                  <input
                    type="number" min={1}
                    value={editCantidad}
                    onChange={e => setEditCantidad(Number(e.target.value))}
                    style={{ width: 64, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 8px', fontSize: 13, color: 'var(--fg)', outline: 'none', textAlign: 'center' }}
                  />
                  <button
                    onClick={() => void saveEditItem(item.id)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--pos)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >Guardar</button>
                  <button
                    onClick={() => setEditingItem(null)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, background: 'var(--ink-3)', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  >✕</button>
                </div>
              </div>
            ) : (
              /* ── Normal mode ── */
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => toggle(item.id)}
                  style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background:   item.checked ? 'var(--pos)' : 'var(--ink-3)',
                    border:       item.checked ? 'none' : '1.5px solid var(--line)',
                    color:        'var(--ink-0)', fontSize: 14, fontWeight: 700,
                    display:      'grid', placeItems: 'center', cursor: 'pointer',
                  }}
                >
                  {item.checked ? '✓' : ''}
                </button>

                <span
                  onClick={() => startEditItem(item)}
                  style={{
                    flex: 1, fontSize: 14, fontWeight: 500,
                    color:          item.checked ? 'var(--fg-mute)' : 'var(--fg)',
                    textDecoration: item.checked ? 'line-through' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {item.nombre}
                </span>

                <span className="num" style={{
                  fontSize: 12, color: 'var(--fg-dim)',
                  background: 'var(--ink-3)', borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                }}>
                  ×{item.cantidad}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-mute)' }}>$</span>
                  <input
                    type="number" min={0} step="0.01"
                    defaultValue={item.precio || ''}
                    placeholder="0"
                    onBlur={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v !== item.precio) setPrecio(item.id, v)
                    }}
                    style={{
                      width: 48, background: 'var(--ink-1)', border: '1px solid var(--line)',
                      borderRadius: 6, padding: '3px 4px', fontSize: 12,
                      color: 'var(--fg)', outline: 'none', textAlign: 'right',
                    }}
                  />
                </div>

                <button
                  onClick={() => startEditItem(item)}
                  style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(106,148,196,.1)', border: '1px solid rgba(106,148,196,.25)',
                    color: 'var(--info)', fontSize: 13, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label="Editar ítem"
                >✎</button>

                <button
                  onClick={() => remove(item.id)}
                  style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                    color: 'var(--neg)', fontSize: 15, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                  aria-label="Eliminar ítem"
                >×</button>
              </div>
            )}
          </div>
        ))}

        {/* Add form — vertical layout para evitar overflow en mobile */}
        <div style={{
          background: 'var(--ink-2)', border: '1px dashed var(--line)',
          borderRadius: 14, padding: '12px 14px', marginTop: 4,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <input
            type="text"
            placeholder="Nuevo ítem…"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem() }}
            style={inputSt}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Cant.</span>
              <input
                type="number" min={1}
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                style={{
                  width: 64, background: 'var(--ink-1)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '8px 8px', fontSize: 13.5,
                  color: 'var(--fg)', outline: 'none', textAlign: 'center',
                }}
              />
            </div>
            <button
              onClick={addItem}
              disabled={saving || !nombre.trim()}
              style={{
                padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: nombre.trim() ? 'var(--amber)' : 'var(--ink-3)',
                color:      nombre.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
                border: 'none', cursor: nombre.trim() ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '12px 14px', marginTop: 4,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: 'var(--fg-mute)' }}>Total estimado</span>
              <span className="num" style={{ fontWeight: 700 }}>${totalAll.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-mute)' }}>Pendiente</span>
              <span className="num" style={{ fontWeight: 600, color: 'var(--amber)' }}>${totalPending.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--fg-mute)', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <span>{checkedCount} / {items.length} comprados</span>
              {checkedCount > 0 && (
                <button
                  onClick={clearChecked}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                    color: 'var(--neg)', cursor: 'pointer',
                  }}
                >
                  Limpiar comprados
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ height: 32 }} />
    </div>
  )
}

// ── Lista card (view all) ──────────────────────────
function ListaCard({ lista, onClick }: { lista: ListaRow; onClick: () => void }) {
  const total   = (lista.items ?? []).length
  const pending = (lista.items ?? []).filter(i => !i.checked).length
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'rgba(224,168,74,.12)', border: '1px solid rgba(224,168,74,.25)',
        display: 'grid', placeItems: 'center', fontSize: 20,
      }}>🛒</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lista.nombre}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>
          {total === 0 ? 'Lista vacía' : `${pending} pendiente${pending !== 1 ? 's' : ''} de ${total}`}
        </div>
      </div>
      <div style={{ fontSize: 18, color: 'var(--fg-mute)' }}>›</div>
    </button>
  )
}

// ── Main component ─────────────────────────────────
export default function ListaCompras() {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)

  const [listas,      setListas]      = useState<ListaRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<ListaRow | null>(null)
  const [creating,    setCreating]    = useState(false)
  const [newName,     setNewName]     = useState('')
  const [savingNew,   setSavingNew]   = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard: clear loader when no household/user yet (cache-first auth)
    if (!householdId || !userId) { setLoading(false); return }
    supabase
      .from('listas_compras')
      .select('id,user_id,household_id,nombre,items,activa,archivada,updated_at')
      .eq('household_id', householdId)
      .eq('archivada', false)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('[ListaCompras]', error.message); setLoading(false); return }
        setListas((data ?? []) as ListaRow[])
        setLoading(false)
      })
  }, [userId, householdId])

  async function createLista() {
    const trimmed = newName.trim() || 'Nueva lista'
    if (!userId || !householdId) return
    setSavingNew(true)
    const newRow: ListaRow = {
      id:           crypto.randomUUID(),
      user_id:      userId,
      household_id: householdId,
      nombre:       trimmed,
      items:        [],
      activa:       true,
      archivada:    false,
    }
    const { error } = await supabase.from('listas_compras').insert(newRow)
    if (!error) {
      setListas(prev => [newRow, ...prev])
      setSelected(newRow)
    }
    setNewName('')
    setCreating(false)
    setSavingNew(false)
  }

  function handleUpdate(updated: ListaRow) {
    setListas(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelected(updated)
  }

  function handleDelete(id: string) {
    setListas(prev => prev.filter(l => l.id !== id))
    setSelected(null)
  }

  if (selected) {
    return (
      <ListaDetail
        lista={selected}
        onBack={() => setSelected(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Listas de compras" back />

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>Cargando…</div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {listas.length === 0 && !creating && (
            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13,
            }}>
              No tienes listas todavía. Crea una abajo.
            </div>
          )}

          {listas.map(lista => (
            <ListaCard key={lista.id} lista={lista} onClick={() => setSelected(lista)} />
          ))}

          {/* New list form */}
          {creating ? (
            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--amber)',
              borderRadius: 14, padding: '13px 14px',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input
                type="text" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createLista() }}
                placeholder="Nombre de la lista…"
                autoFocus style={inputSt}
              />
              <button
                onClick={createLista}
                disabled={savingNew}
                style={{
                  padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                  background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
                }}
              >
                {newName.trim() ? 'Crear' : 'Cancelar'}
              </button>
              <button
                onClick={() => { setCreating(false); setNewName('') }}
                style={{
                  padding: '8px 10px', borderRadius: 10, fontSize: 12.5,
                  background: 'var(--ink-3)', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer',
                }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
                borderRadius: 14, padding: '14px',
                color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{ fontSize: 18 }}>+</span> Nueva lista
            </button>
          )}
        </div>
      )}
      <div style={{ height: 32 }} />
    </div>
  )
}
