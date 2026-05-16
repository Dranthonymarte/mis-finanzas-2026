import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { LockIcon } from '../../components/icons/Icons'

export default function Security() {
  const [pinEnabled,  setPinEnabled]  = useState(false)
  const [faceEnabled, setFaceEnabled] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Seguridad" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* PIN toggle */}
        <div
          style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
              <LockIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Bloqueo con PIN</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Requiere PIN al abrir la app</div>
            </div>
            <Toggle enabled={pinEnabled} onChange={setPinEnabled} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 14px',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ink-3)', display: 'grid', placeItems: 'center', fontSize: 18 }}>
              🫠
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Face ID / Huella</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Desbloqueo biométrico</div>
            </div>
            <Toggle enabled={faceEnabled} onChange={setFaceEnabled} />
          </div>
        </div>

        {/* Session info */}
        <div
          style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '13px 14px',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 6, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Sesión activa
          </div>
          <div style={{ fontSize: 13 }}>anthonymarte12@gmail.com</div>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4 }}>
            Último acceso: hoy, 9:41 AM · Chrome · Android
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: enabled ? 'var(--amber)' : 'var(--ink-4)',
        border: 'none',
        position: 'relative',
        transition: 'background .2s',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: enabled ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s cubic-bezier(.4,0,.2,1)',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }}
      />
    </button>
  )
}
