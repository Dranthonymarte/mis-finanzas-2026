import { useState, useEffect } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { CheckIcon } from '../../components/icons/Icons'

type ThemeMode = 'dark' | 'light' | 'system'
type PaletteId = 'amber' | 'emerald' | 'indigo' | 'rose' | 'graphite'

const LS_THEME   = 'mis_finanzas_theme'
const LS_PALETTE = 'mis_finanzas_palette'

const THEMES: { id: ThemeMode; label: string; bg: string; dot: string }[] = [
  { id: 'dark',   label: 'Oscuro',  bg: '#0a0b0d', dot: '#e0a84a' },
  { id: 'light',  label: 'Claro',   bg: '#f5f3ee', dot: '#b87d1f' },
  { id: 'system', label: 'Sistema', bg: 'linear-gradient(135deg,#0a0b0d 50%,#f5f3ee 50%)', dot: '#9aa0ab' },
]

// Paletas de marca — acento + tinte sutil de superficie (ver tokens.css).
const PALETTES: { id: PaletteId; label: string; accent: string }[] = [
  { id: 'amber',    label: 'Ámbar',     accent: '#e0a84a' },
  { id: 'emerald',  label: 'Esmeralda', accent: '#4eb88a' },
  { id: 'indigo',   label: 'Índigo',    accent: '#7c8cf0' },
  { id: 'rose',     label: 'Rosa',      accent: '#e87aa8' },
  { id: 'graphite', label: 'Grafito',   accent: '#aeb4bf' },
]

function resolveTheme(t: ThemeMode): 'dark' | 'light' {
  if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return t
}

function applyTheme(t: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolveTheme(t))
  localStorage.setItem(LS_THEME, t)
}

function applyPalette(p: PaletteId) {
  document.documentElement.setAttribute('data-palette', p)
  localStorage.setItem(LS_PALETTE, p)
}

export default function Appearance() {
  const [theme,   setTheme]   = useState<ThemeMode>(
    () => (localStorage.getItem(LS_THEME) as ThemeMode) ?? 'dark'
  )
  const [palette, setPalette] = useState<PaletteId>(
    () => (localStorage.getItem(LS_PALETTE) as PaletteId) ?? 'amber'
  )

  useEffect(() => { applyTheme(theme) }, [theme])

  function handleTheme(t: ThemeMode) {
    setTheme(t)
    applyTheme(t)
  }

  function handlePalette(p: PaletteId) {
    setPalette(p)
    applyPalette(p)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Apariencia" back />

      <div style={{ padding: '20px 16px 0' }}>
        {/* ── Modo ── */}
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

        {/* ── Paleta de marca ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Paleta de marca
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => handlePalette(p.id)}
                aria-label={`Paleta ${p.label}`}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 4px', background: 'var(--ink-2)',
                  border: palette === p.id ? '2px solid var(--amber)' : '2px solid var(--line)',
                  borderRadius: 12, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: p.accent,
                  display: 'grid', placeItems: 'center', color: '#0a0b0d',
                }}>
                  {palette === p.id && <CheckIcon />}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: palette === p.id ? 'var(--amber)' : 'var(--fg-mute)' }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 10, lineHeight: 1.4 }}>
            Cambia el color de acento y un tinte sutil de la app. Combínalo con cualquier tema.
          </div>
        </div>
      </div>
    </div>
  )
}
