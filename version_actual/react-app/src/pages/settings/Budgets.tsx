import AppHeader from '../../components/shell/AppHeader'
import { fmt } from '../../data/mock'

const BUDGETS = [
  { cat: 'Alimentación', emoji: '🛒', limit: 300, spent: 141,  color: '#58b26a' },
  { cat: 'Transporte',   emoji: '🚗', limit: 80,  spent: 40,   color: '#6a94c4' },
  { cat: 'Entretenimiento', emoji: '🎬', limit: 50, spent: 25.98, color: '#d66a5a' },
  { cat: 'Salud',        emoji: '💊', limit: 100, spent: 28.4, color: '#5fb3a8' },
]

export default function Budgets() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Presupuestos" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BUDGETS.map((b) => {
          const pct = Math.min(100, (b.spent / b.limit) * 100)
          const over = b.spent > b.limit
          return (
            <div
              key={b.cat}
              style={{
                background: 'var(--ink-2)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{b.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{b.cat}</span>
                <span style={{ fontSize: 12, color: over ? 'var(--neg)' : 'var(--fg-mute)' }}>
                  {fmt(b.spent)} / {fmt(b.limit)}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: over ? 'var(--neg)' : b.color,
                    borderRadius: 3,
                    transition: 'width .4s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 5, textAlign: 'right' }}>
                {over ? 'Excedido' : `${fmt(b.limit - b.spent)} restante`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
