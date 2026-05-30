import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './styles/tokens.css'
import './styles/mobile-uix.css'
import './index.css'
import App from './App'

// ── Register service worker → makes the app installable (PWA) ──
// vite-plugin-pwa generates the SW; without this call no SW is registered
// and Android Chrome will NOT offer "Add to home screen".
registerSW({ immediate: true })

// ── Apply saved theme/palette before React renders (prevents flash) ──
// Leer primero del store Zustand persist, con fallback al localStorage legacy.
type _TemaId = 'dark' | 'light' | 'system' | 'oled' | 'sepia'
type _PaletteId = 'amber' | 'emerald' | 'indigo' | 'rose' | 'graphite'

function _resolveTheme(t: _TemaId): 'dark' | 'light' | 'oled' | 'sepia' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

const _VALID_TEMAS: _TemaId[] = ['dark', 'light', 'system', 'oled', 'sepia']
const _VALID_PALETTES: _PaletteId[] = ['amber', 'emerald', 'indigo', 'rose', 'graphite']

// Leer store Zustand (JSON serializado en localStorage bajo 'mis-finanzas-prefs')
let _savedTema: _TemaId = 'dark'
let _savedPalette: _PaletteId = 'amber'
try {
  const _raw = localStorage.getItem('mis-finanzas-prefs')
  if (_raw) {
    const _parsed = JSON.parse(_raw) as { state?: { tema?: string; palette?: string } }
    const _t = _parsed?.state?.tema
    const _p = _parsed?.state?.palette
    if (_t && (_VALID_TEMAS as string[]).includes(_t)) _savedTema = _t as _TemaId
    if (_p && (_VALID_PALETTES as string[]).includes(_p)) _savedPalette = _p as _PaletteId
  }
} catch { /* Fallback a defaults si el JSON está corrupto */ }

// Fallback: legacy keys separadas (migración desde versión anterior)
if (_savedTema === 'dark') {
  const _legacyTheme = localStorage.getItem('mis_finanzas_theme')
  if (_legacyTheme && (_VALID_TEMAS as string[]).includes(_legacyTheme)) {
    _savedTema = _legacyTheme as _TemaId
  }
}
if (_savedPalette === 'amber') {
  const _legacyPalette = localStorage.getItem('mis_finanzas_palette')
  if (_legacyPalette && (_VALID_PALETTES as string[]).includes(_legacyPalette)) {
    _savedPalette = _legacyPalette as _PaletteId
  }
}

document.documentElement.setAttribute('data-theme', _resolveTheme(_savedTema))
document.documentElement.setAttribute('data-palette', _savedPalette)

// Listener para tema "sistema" — actualiza data-theme si el SO cambia preferencia
if (_savedTema === 'system') {
  const _mq = window.matchMedia('(prefers-color-scheme: dark)')
  const _onSystemChange = (e: MediaQueryListEvent) => {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
  }
  _mq.addEventListener('change', _onSystemChange)
}

// Force is-mobile so mobile-uix.css body.is-mobile rules apply on all viewports
document.body.classList.add('is-mobile')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
