// ═══════════════════════════════════════════════════
// Toast — global notifications  (BLOQUE 8)
// Rendered at AppShell root. Reads from useToastStore.
// ═══════════════════════════════════════════════════

import { useToastStore, type ToastTone } from '../../store/toast'

function toneColor(tone: ToastTone): string {
  if (tone === 'error') return 'var(--neg)'
  if (tone === 'warn')  return 'var(--amber)'
  return 'var(--info)'
}

function toneBg(tone: ToastTone): string {
  if (tone === 'error') return 'rgba(214,106,90,.15)'
  if (tone === 'warn')  return 'rgba(224,168,74,.12)'
  return 'rgba(106,148,196,.12)'
}

export default function Toast() {
  const { toasts, removeToast } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'max(16px, env(safe-area-inset-top))',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 999,
      display: 'flex', flexDirection: 'column', gap: 8,
      width: 'min(92vw, 380px)',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            background: toneBg(t.tone),
            border: `1px solid ${toneColor(t.tone)}55`,
            borderRadius: 12,
            padding: '12px 14px',
            color: toneColor(t.tone),
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            animation: 'toastIn 200ms cubic-bezier(.4,0,.2,1) both',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </div>
  )
}
