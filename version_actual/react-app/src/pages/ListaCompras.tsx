// ═══════════════════════════════════════════════════
// ListaCompras — /lista-compras
// Schema real: tabla list-based con items JSONB.
// Row: { id, user_id, household_id, nombre, items[], activa, archivada }
// Item: { id, nombre, cantidad, precio, checked }
// Todas las mutaciones hacen UPDATE al array items del row activo.
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
}

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5, color: 'var(--fg)', outline: 'none',
}
const numSt: CSSProperties = {
  width: 64, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 8px', fontSize: 13.5,
  color: 'var(--fg)', outline: 'none', textAlign: 'center',
}

export default function ListaCompras() {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)

  const [lista,    setLista]    = useState<ListaRow | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [saving,   setSaving]   = useState(false)

  // ── Load active list (or create one) ────────────
  useEffect(() => {
    if (!householdId || !userId) { setLoading(false); return }

    supabase
      .from('listas_compras')
      .select('id,user_id,household_id,nombre,items,activa,archivada')
      .eq('household_id', householdId)
      .eq('archivada', false)
      .order('updated_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { console.error('[ListaCompras] load:', error.message); setLoading(false); return }

        let rows = (data ?? []) as ListaRow[]
        let active = rows.find(r => r.activa) ?? rows[0] ?? null

        if (!active) {
          // Create a default list for this household
          const newId = crypto.randomUUID()
          const newRow = {
            id:           newId,
            user_id:      userId,
            household_id: householdId,
            nombre:       'Compras',
            items:        [],
            activa:       true,
            archivada:    false,
          }
          const { error: insertErr } = await supabase.from('listas_compras').insert(newRow)
          if (!insertErr) active = newRow as ListaRow
        }

        setLista(active)
        setLoading(false)
      })
  }, [userId, householdId])

  // ── Persist items array to Supabase ──────────────
  async function persistItems(newItems: ListItem[]) {
    if (!lista) return
    setLista(prev => prev ? { ...prev, items: newItems } : prev)
    await supabase
      .from('listas_compras')
      .update({ items: newItems, updated_at: new Date().toISOString() })
      .eq('id', lista.id)
  }

  async function toggle(itemId: string) {
    if (!lista) return
    const newItems = lista.items.map(i =>
      i.id === itemId ? { ...i, checked: !i.checked } : i
    )
    await persistItems(newItems)
  }

  async function remove(itemId: string) {
    if (!lista) return
    await persistItems(lista.items.filter(i => i.id !== itemId))
  }

  async function addItem() {
    const trimmed = nombre.trim()
    if (!trimmed || !lista) return
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

  const items  = lista?.items ?? []
  const sorted = [...items.filter(i => !i.checked), ...items.filter(i => i.checked)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Lista de compras" back />

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>
          Cargando…
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {sorted.length === 0 && (
            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13,
            }}>
              La lista está vacía. Agrega ítems abajo.
            </div>
          )}

          {sorted.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 14, padding: '12px 14px',
                opacity: item.checked ? 0.55 : 1,
                transition: 'opacity .2s',
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggle(item.id)}
                style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background:   item.checked ? 'var(--pos)' : 'var(--ink-3)',
                  border:       item.checked ? 'none' : '1.5px solid var(--line)',
                  color:        'var(--ink-0)', fontSize: 14, fontWeight: 700,
                  display:      'grid', placeItems: 'center', cursor: 'pointer',
                }}
                aria-label={item.checked ? 'Desmarcar' : 'Marcar como comprado'}
              >
                {item.checked ? '✓' : ''}
              </button>

              {/* Nombre */}
              <span style={{
                flex: 1, fontSize: 14, fontWeight: 500,
                color:          item.checked ? 'var(--fg-mute)' : 'var(--fg)',
                textDecoration: item.checked ? 'line-through' : 'none',
              }}>
                {item.nombre}
              </span>

              {/* Cantidad */}
              <span className="num" style={{
                fontSize: 12.5, color: 'var(--fg-dim)',
                background: 'var(--ink-3)', borderRadius: 6, padding: '3px 8px',
              }}>
                ×{item.cantidad}
              </span>

              {/* Delete */}
              <button
                onClick={() => remove(item.id)}
                style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                  color: 'var(--neg)', fontSize: 16, cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                }}
                aria-label="Eliminar ítem"
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
            <span style={{ fontSize: 18, color: 'var(--fg-mute)' }}>+</span>
            <input
              type="text"
              placeholder="Nuevo ítem…"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem() }}
              style={inputSt}
            />
            <input
              type="number" min={1}
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))}
              style={numSt}
            />
            <button
              onClick={addItem}
              disabled={saving || !nombre.trim()}
              style={{
                padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: nombre.trim() ? 'var(--amber)' : 'var(--ink-3)',
                color:      nombre.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
                border: 'none', cursor: nombre.trim() ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >
              Agregar
            </button>
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center', marginTop: 4 }}>
              {items.filter(i => i.checked).length} / {items.length} comprados
            </div>
          )}
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}
