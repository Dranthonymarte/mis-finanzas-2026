import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/app'
import TabBar from './TabBar'

interface AppShellProps {
  children: ReactNode
}

/**
 * Root layout: full-height flex column.
 * children (pages) scroll inside; TabBar is fixed at bottom.
 */
export default function AppShell({ children }: AppShellProps) {
  const location     = useLocation()
  const navDirection = useAppStore((s) => s.navDirection)

  const slideClass = navDirection === 'back'
    ? 'page-slide-back'
    : 'page-slide-forward'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: 'var(--ink-0)',
        position: 'relative',
      }}
    >
      {/* Page area */}
      <div
        key={location.key}
        className={slideClass}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          /* Extra bottom padding so content isn't hidden behind TabBar */
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>

      {/* Tab Bar — fixed at bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          zIndex: 100,
        }}
      >
        <TabBar />
      </div>
    </div>
  )
}
