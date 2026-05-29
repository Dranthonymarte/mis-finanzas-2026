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
const _savedTheme  = localStorage.getItem('mis_finanzas_theme') ?? 'dark'
const _resolved    = _savedTheme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : _savedTheme
document.documentElement.setAttribute('data-theme', _resolved)
// Paleta de marca (acento + tinte). Migración: si había accent custom, default amber.
const _savedPalette = localStorage.getItem('mis_finanzas_palette') ?? 'amber'
document.documentElement.setAttribute('data-palette', _savedPalette)

// Force is-mobile so mobile-uix.css body.is-mobile rules apply on all viewports
document.body.classList.add('is-mobile')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
