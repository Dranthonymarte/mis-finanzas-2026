import { useEffect, useRef } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { CheckIcon } from '../../components/icons/Icons'
import { usePrefsStore, type TemaId, type PaletteId } from '../../store/prefs'

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveTheme(t: TemaId): 'dark' | 'light' | 'oled' | 'sepia' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

function applyTheme(t: TemaId) {
  document.documentElement.setAttribute('data-theme', resolveTheme(t))
}

function applyPalette(p: PaletteId) {
  document.documentElement.setAttribute('data-palette', p)
}

// ── Data ──────────────────────────────────────────────────────────────────────

const THEMES: { id: TemaId; label: string; bg: string; dot: string }[] = [
  {
    id:  'dark',
    label: 'Oscuro',
    bg:    '#0a0b0d',
    dot:   '#e0a84a',
  },
  {
    id:  'light',
    label: 'Claro',
    bg:    '#f5f3ee',
    dot:   '#b87d1f',
  },
  {
    id:  'system',
    label: 'Sistema',
    // Split diagonal dark/light — patrón macOS / iOS Settings
    bg:    'linear-gradient(135deg,#0a0b0d 50%,#f5f3ee 50%)',
    dot:   '#9aa0ab',
  },
  {
    id:  'oled',
    label: 'OLED',
    bg:    '#000000',
    dot:   '#ffffff',
  },
  {
    id:  'sepia',
    label: 'Sepia',
    bg:    '#f7f2e5',
    dot:   '#9a6b2f',
  },
]

const PALETTES: { id: PaletteId; label: string; accent: string }[] = [
  { id: 'amber',    label: 'Ámbar',     accent: '#e0a84a' },
  { id: 'emerald',  label: 'Esmeralda', accent: '#4eb88a' },
  { id: 'indigo',   label: 'Índigo',    accent: '#7c8cf0' },
  { id: 'rose',     label: 'Rosa',      accent: '#e87aa8' },
  { id: 'graphite', label: 'Grafito',   accent: '#aeb4bf' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Appearance() {
  const tema    = usePrefsStore((s) => s.tema)
  const palette = usePrefsStore((s) => s.palette)
  const setTema    = usePrefsStore((s) => s.setTema)
  const setPalette = usePrefsStore((s) => s.setPalette)

  // Listener para tema "sistema" — reactivo durante vida del componente
  const mqRef = useRef<MediaQueryList | null>(null)

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => {
      if (tema === 'system') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
    }
    mqRef.current = window.matchMedia('(prefers-color-scheme: dark)')
    mqRef.current.addEventListener('change', handler)
    return () => mqRef.current?.removeEventListener('change', handler)
  }, [tema])

  function handleTheme(t: TemaId) {
    setTema(t)
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

        {/* ── Tema ── */}
        <div style={{
          fontSize: 10.5, color: 'var(--fg-mute)',
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Tema
        </div>

        {/* Fila 1: dark · light · system */}
        <div style={{ display: 'flex', gap: 10 }}>
          {THEMES.slice(0, 3).map(t => (
            <ThemeButton
              key={t.id}
              t={t}
              active={tema === t.id}
              onSelect={handleTheme}
            />
          ))}
        </div>

        {/* Fila 2: oled · sepia */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {THEMES.slice(3).map(t => (
            <ThemeButton
              key={t.id}
              t={t}
              active={tema === t.id}
              onSelect={handleTheme}
            />
          ))}
          {/* Spacer para mantener alineación */}
          <div style={{ flex: 1 }} />
        </div>

        {/* ── Paleta de acento ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontSize: 10.5, color: 'var(--fg-mute)',
            letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Color de acento
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => handlePalette(p.id)}
                aria-label={`Acento ${p.label}`}
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
                <span style={{
                  fontSize: 9.5, fontWeight: 600,
                  color: palette === p.id ? 'var(--amber)' : 'var(--fg-mute)',
                }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 10, lineHeight: 1.4 }}>
            Cambia el color de acento. Se combina con cualquier tema.
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-component ─────────────────────────────────────────────────────────────

interface ThemeButtonProps {
  t:        { id: TemaId; label: string; bg: string; dot: string }
  active:   boolean
  onSelect: (id: TemaId) => void
}

function ThemeButton({ t, active, onSelect }: ThemeButtonProps) {
  return (
    <button
      onClick={() => onSelect(t.id)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '12px 8px', background: 'var(--ink-2)',
        border: active ? '2px solid var(--amber)' : '2px solid var(--line)',
        borderRadius: 14, cursor: 'pointer',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: t.bg, border: '1px solid rgba(128,128,128,.25)', position: 'relative',
      }}>
        {active && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid', placeItems: 'center', color: t.dot,
          }}>
            <CheckIcon />
          </div>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: active ? 'var(--amber)' : 'var(--fg-mute)',
      }}>
        {t.label}
      </span>
    </button>
  )
}
