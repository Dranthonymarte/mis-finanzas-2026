// ═══════════════════════════════════════════════════
// Sheet — bottom-sheet rendered via portal to document.body
//
// WHY A PORTAL: AppShell's page wrapper has an `animation` with a
// `transform` (page-slide). A transformed ancestor becomes the
// containing block for `position: fixed`, so a fixed sheet renders
// relative to the (tall, scrollable) page instead of the viewport —
// the dim overlay shows but the dialog is pushed far below the fold.
// Portaling to <body> escapes that containing block entirely.
// ═══════════════════════════════════════════════════

import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open:     boolean
  onClose:  () => void
  children: ReactNode
}

export default function Sheet({ open, onClose, children }: SheetProps) {
  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000 }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: 'var(--ink-1)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--line)', borderBottom: 'none',
          padding: '20px 20px calc(env(safe-area-inset-bottom, 20px) + 40px)',
          zIndex: 1001,
          animation: 'sheet-up .22s cubic-bezier(.32,.72,0,1) both',
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
