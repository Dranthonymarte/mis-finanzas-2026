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

export default function Categories() {
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

        <button
          style={{
            background: 'var(--ink-2)',
            border: '1px dashed var(--ink-4)',
            borderRadius: 14,
            padding: '13px',
            color: 'var(--fg-mute)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>+</span>
          Nueva categoría
        </button>
      </div>
    </div>
  )
}
