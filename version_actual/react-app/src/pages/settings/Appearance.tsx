import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { CheckIcon } from '../../components/icons/Icons'

type ThemeMode = 'dark' | 'light' | 'system'

const THEMES: { id: ThemeMode; label: string; bg: string; dot: string }[] = [
  { id: 'dark',   label: 'Oscuro',    bg: '#0a0b0d', dot: '#e0a84a' },
  { id: 'light',  label: 'Claro',     bg: '#f5f3ee', dot: '#b87d1f' },
  { id: 'system', label: 'Sistema',   bg: 'linear-gradient(135deg,#0a0b0d 50%,#f5f3ee 50%)', dot: '#9aa0ab' },
]

export default function Appearance() {
  const [theme, setTheme] = useState<ThemeMode>('dark')

  function applyTheme(t: ThemeMode) {
    setTheme(t)
    document.documentElement.setAttribute(
      'data-theme',
      t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t,
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Apariencia" back />

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Tema
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '12px 8px',
                background: 'var(--ink-2)',
                border: theme === t.id ? '2px solid var(--amber)' : '2px solid var(--line)',
                borderRadius: 14,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: t.bg,
                  border: '1px solid var(--line)',
                  position: 'relative',
                }}
              >
                {theme === t.id && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      color: t.dot,
                    }}
                  >
                    <CheckIcon />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme === t.id ? 'var(--amber)' : 'var(--fg-mute)' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Accent placeholder */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Color acento
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['#e0a84a', '#58b26a', '#6a94c4', '#d66a5a', '#3d8b82'].map((c) => (
              <button
                key={c}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: c,
                  border: c === '#e0a84a' ? '3px solid var(--fg)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
