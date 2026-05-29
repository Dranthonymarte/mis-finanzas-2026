// ═══════════════════════════════════════════════════
// EmptyState — estado vacío con CTA  (patrón Linear / Notion / Stripe)
// Reemplaza los "Sin datos" planos: emoji + título + subtexto + acción opcional.
// Reutilizable en cualquier lista vacía (txns, cuentas, recurrentes, metas…).
// ═══════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom'

interface EmptyStateProps {
  icon:    string
  title:   string
  sub?:    string
  cta?:    { label: string; to: string }       // CTA que navega a una ruta
  action?: { label: string; onClick: () => void } // CTA imperativo (abrir form inline, etc.)
}

export default function EmptyState({ icon, title, sub, cta, action }: EmptyStateProps) {
  const navigate = useNavigate()
  const btnLabel   = cta?.label ?? action?.label
  const btnOnClick = cta ? () => navigate(cta.to) : action?.onClick
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 7, padding: '40px 24px',
    }}>
      <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
      {sub && (
        <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', lineHeight: 1.5, maxWidth: 280 }}>
          {sub}
        </div>
      )}
      {btnLabel && btnOnClick && (
        <button
          onClick={btnOnClick}
          style={{
            marginTop: 8, padding: '10px 18px', borderRadius: 12, border: 'none',
            background: 'var(--amber)', color: 'var(--ink-0)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {btnLabel}
        </button>
      )}
    </div>
  )
}
