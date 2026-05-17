import { useState, type CSSProperties } from 'react'
import AppHeader from '../../components/shell/AppHeader'

const DEFAULT_CATS = [
  { emoji: '🛒', name: 'Alimentación',    color: '#58b26a' },
  { emoji: '🚗', name: 'Transporte',      color: '#6a94c4' },
  { emoji: '🏠', name: 'Hogar',           color: '#e0a84a' },
  { emoji: '🎬', name: 'Entretenimiento', color: '#d66a5a' },
  { emoji: '💊', name: 'Salud',           color: '#5fb3a8' },
  { emoji: '📡', name: 'Servicios',       color: '#9aa0ab' },
  { emoji: '💼', name: 'Trabajo',         color: '#f5c572' },
  { emoji: '📊', name: 'Inversión',       color: '#6a94c4' },
]

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 13.5,
  color: 'var(--fg)', outline: 'none',
}

export default function Categories() {
  const [showForm, setShowForm] = useState(false)
  const [newName,  setNewName]  = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Categorías" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEFAULT_CATS.map((cat) => (
          <div
            key={cat.name}
            style={{
              background: 'var(--ink-2)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--ink-3)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {cat.emoji}
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
          </div>
        ))}

        {showForm ? (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--amber)',
            borderRadius: 14, padding: '13px 14px',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre de categoría"
              autoFocus
              style={inputSt}
            />
            <button
              onClick={() => { setShowForm(false); setNewName('') }}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: 'var(--amber)', color: 'var(--ink-0)', border: 'none', cursor: 'pointer',
              }}
            >
              {newName.trim() ? 'Añadir' : 'Cancelar'}
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
            Nueva categoría
          </button>
        )}
      </div>
    </div>
  )
}
