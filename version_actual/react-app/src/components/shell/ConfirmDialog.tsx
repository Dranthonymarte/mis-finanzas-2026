// ═══════════════════════════════════════════════════
// ConfirmDialog — alerta de confirmación centrada (iOS / Revolut)
// Lee del confirm store; montado una sola vez en AppShell.
// ═══════════════════════════════════════════════════

import { createPortal } from 'react-dom'
import { useConfirmStore } from '../../store/confirm'

export default function ConfirmDialog() {
  const open  = useConfirmStore(s => s.open)
  const opts  = useConfirmStore(s => s.opts)
  const close = useConfirmStore(s => s._close)

  if (!open) return null

  const {
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel  = 'Cancelar',
    danger       = false,
  } = opts

  // Portaleado a <body> + zIndex 10300: capa más alta de la app. Debe quedar
  // por encima del FAB (10200-10202, también portaleado) y de cualquier Sheet
  // (1001). Con zIndex 2000 el FAB pintaba ENCIMA → la confirmación parecía
  // salir "detrás" del panel (revocar Pareja, eliminar Recurrente, etc.).
  return createPortal(
    <div
      onClick={() => close(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10300,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)',
        display: 'grid', placeItems: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="alertdialog" aria-modal="true"
        style={{
          width: '100%', maxWidth: 320,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: message ? 6 : 16 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.45, marginBottom: 18 }}>
            {message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => close(false)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              color: 'var(--fg)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              background: danger ? 'var(--neg)' : 'var(--amber)', border: 'none',
              color: danger ? '#fff' : 'var(--ink-0)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
