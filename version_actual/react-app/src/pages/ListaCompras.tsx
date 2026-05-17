// ═══════════════════════════════════════════════════
// ListaCompras — /lista-compras
// Lista de compras del hogar con Supabase
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

interface Item {
  id: string; household_id: string; nombre: string
  cantidad: number; comprado: boolean; created_at: string
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
  const householdId = useAuthStore(s => s.householdId)

  const [items,    setItems]    = useState<Item[]>([])
  const [loading,  setLoading]  = useState(true)
  const [nombre,   setNombre]   = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!householdId) { setLoading(false); return }
    supabase
      .from('listas_compras')
      .select('id,household_id,nombre,cantidad,comprado,created_at')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setItems((data as Item[]) ?? []); setLoading(false) })
  }, [householdId])

  async function toggle(item: Item) {
    const next = !item.comprado
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, comprado: next } : i))
    await supabase.from('listas_compras').update({ comprado: next }).eq('id', item.id)
  }

  async function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('listas_compras').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  }

  async function addItem() {
    const trimmed = nombre.trim()
    if (!trimmed || !householdId) return
    setSaving(true)
    const newItem: Item = {
      id: crypto.randomUUID(), household_id: householdId,
      nombre: trimmed, cantidad: cantidad > 0 ? cantidad : 1,
      comprado: false, created_at: new Date().toISOString(),
    }
    setItems(prev => [...prev, newItem])
    setNombre(''); setCantidad(1)
    await supabase.from('listas_compras').insert(newItem)
    setSaving(false)
  }

  const sorted = [...items.filter(i => !i.comprado), ...items.filter(i => i.comprado)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Lista de compras" back />

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>Cargando…</div>
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
                opacity: item.comprado ? 0.55 : 1,
                transition: 'opacity .2s',
              }}
            >
              {/* Checkbox button */}
              <button
                onClick={() => toggle(item)}
                style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background:   item.comprado ? 'var(--pos)' : 'var(--ink-3)',
                  border:       item.comprado ? 'none' : '1.5px solid var(--line)',
                  color:        'var(--ink-0)', fontSize: 14, fontWeight: 700,
                  display:      'grid', placeItems: 'center', cursor: 'pointer',
                }}
                aria-label={item.comprado ? 'Desmarcar' : 'Marcar como comprado'}
              >
                {item.comprado ? '✓' : ''}
              </button>

              {/* Nombre */}
              <span style={{
                flex: 1, fontSize: 14, fontWeight: 500,
                color:          item.comprado ? 'var(--fg-mute)' : 'var(--fg)',
                textDecoration: item.comprado ? 'line-through' : 'none',
              }}>
                {item.nombre}
              </span>

              {/* Cantidad */}
              <span className="num" style={{
                fontSize: 12.5, color: 'var(--fg-dim)',
                background: 'var(--ink-3)', borderRadius: 6,
                padding: '3px 8px',
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
              type="number"
              min={1}
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
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}
