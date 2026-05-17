import { useState, useEffect } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { CheckIcon } from '../../components/icons/Icons'

type ThemeMode = 'dark' | 'light' | 'system'

const LS_THEME  = 'mis_finanzas_theme'
const LS_ACCENT = 'mis_finanzas_accent'

const ACCENTS = ['#e0a84a', '#58b26a', '#6a94c4', '#d66a5a', '#3d8b82', '#b0a3c7']

const THEMES: { id: ThemeMode; label: string; bg: string; dot: string }[] = [
  { id: 'dark',   label: 'Oscuro',  bg: '#0a0b0d', dot: '#e0a84a' },
  { id: 'light',  label: 'Claro',   bg: '#f5f3ee', dot: '#b87d1f' },
  { id: 'system', label: 'Sistema', bg: 'linear-gradient(135deg,#0a0b0d 50%,#f5f3ee 50%)', dot: '#9aa0ab' },
]

function resolveTheme(t: ThemeMode): 'dark' | 'light' {
  if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return t
}

function applyTheme(t: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolveTheme(t))
  localStorage.setItem(LS_THEME, t)
}

function applyAccent(c: string) {
  document.documentElement.style.setProperty('--amber', c)
  localStorage.setItem(LS_ACCENT, c)
}

export default function Appearance() {
  const [theme,  setTheme]  = useState<ThemeMode>(
    () => (localStorage.getItem(LS_THEME) as ThemeMode) ?? 'dark'
  )
  const [accent, setAccent] = useState(
    () => localStorage.getItem(LS_ACCENT) ?? '#e0a84a'
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleTheme(t: ThemeMode) {
    setTheme(t)
    applyTheme(t)
  }

  function handleAccent(c: string) {
    setAccent(c)
    applyAccent(c)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Apariencia" back />

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Tema
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTheme(t.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 8px', background: 'var(--ink-2)',
                border: theme === t.id ? '2px solid var(--amber)' : '2px solid var(--line)',
                borderRadius: 14, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: t.bg, border: '1px solid var(--line)', position: 'relative',
              }}>
                {theme === t.id && (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: t.dot }}>
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

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Color acento
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {ACCENTS.map(c => (
              <button
                key={c}
                onClick={() => handleAccent(c)}
                aria-label={`Acento ${c}`}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: c,
                  border: accent === c ? '3px solid var(--fg)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'border .15s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
