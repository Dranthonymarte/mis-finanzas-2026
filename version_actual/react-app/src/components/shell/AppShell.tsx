// ═══════════════════════════════════════════════════
// AppShell — main app layout (used as layout route)
// Renders <Outlet /> for child routes + fixed TabBar.
// Auth pages (Onboarding, Login) do NOT use this shell.
// ═══════════════════════════════════════════════════

import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/app'
import TabBar from './TabBar'

export default function AppShell() {
  const location     = useLocation()
  const navDirection = useAppStore((s) => s.navDirection)

  const slideClass = navDirection === 'back'
    ? 'page-slide-back'
    : 'page-slide-forward'

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        minHeight:      '100dvh',
        background:     'var(--ink-1)',
        position:       'relative',
      }}
    >
      {/* ── Scrollable page area ── */}
      <div
        key={location.key}
        className={slideClass}
        style={{
          flex:                    1,
          display:                 'flex',
          flexDirection:           'column',
          overflowY:               'auto',
          overflowX:               'hidden',
          paddingBottom:           'calc(80px + env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </div>

      {/* ── TabBar — fixed at bottom ── */}
      <div
        style={{
          position:  'fixed',
          bottom:    0,
          left:      '50%',
          transform: 'translateX(-50%)',
          width:     '100%',
          maxWidth:  430,
          zIndex:    100,
        }}
      >
        <TabBar />
      </div>
    </div>
  )
}
