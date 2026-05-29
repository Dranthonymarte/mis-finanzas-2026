// ═══════════════════════════════════════════════════
// Toast — global notifications  (BLOQUE 8)
// Renderizado una sola vez en el root de App (todas las rutas). Lee de useToastStore.
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
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: toneBg(t.tone),
            border: `1px solid ${toneColor(t.tone)}55`,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            backdropFilter: 'blur(8px)',
            animation: 'toastIn 200ms cubic-bezier(.4,0,.2,1) both',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 12px 14px 14px' }}>
            <span style={{
              flex: 1, minWidth: 0,
              color: toneColor(t.tone),
              fontSize: 13.5, fontWeight: 600, lineHeight: 1.4,
              wordBreak: 'break-word',
            }}>
              {t.message}
            </span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Cerrar aviso"
              style={{
                flexShrink: 0, marginTop: -2,
                width: 22, height: 22, borderRadius: 6, border: 'none',
                background: 'transparent', color: toneColor(t.tone),
                fontSize: 17, lineHeight: 1, fontWeight: 700,
                cursor: 'pointer', opacity: .7,
              }}
            >
              ×
            </button>
          </div>
          {/* Barra de progreso — countdown perceptible, sincronizado con la duración real */}
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              transformOrigin: 'left',
              background: toneColor(t.tone),
              opacity: .85,
              animation: `toastBar ${t.duration}ms linear forwards`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        @keyframes toastBar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
