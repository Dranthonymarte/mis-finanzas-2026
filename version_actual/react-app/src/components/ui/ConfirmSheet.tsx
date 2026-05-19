import Sheet from './Sheet'

interface Props {
  open:          boolean
  title:         string
  message?:      string
  confirmLabel?: string
  danger?:       boolean
  onConfirm:     () => void
  onCancel:      () => void
}

export default function ConfirmSheet({ open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }: Props) {
  return (
    <Sheet open={open} onClose={onCancel}>
      <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: message ? 10 : 20 }}>
        {title}
      </div>
      {message && (
        <div style={{ fontSize: 13.5, color: 'var(--fg-mute)', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            color: 'var(--fg-dim)', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: danger ? 'var(--neg)' : 'var(--amber)',
            border: 'none', color: '#fff', cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
