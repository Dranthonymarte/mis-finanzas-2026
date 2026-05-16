import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../icons/Icons'

interface SheetProps {
  /** Controls open/closed state */
  open: boolean
  /** Close callback */
  onClose: () => void
  /** Sheet title (font-display 20px) */
  title?: string
  /** Subtitle below title */
  sub?: string
  /** Max height override (default: 92dvh) */
  height?: string
  /** Show close button (default: true) */
  showClose?: boolean
  children: ReactNode
}

export default function Sheet({
  open,
  onClose,
  title,
  sub,
  height = '92dvh',
  showClose = true,
  children,
}: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="m-sheet-overlay open"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="m-sheet"
        style={{ maxHeight: height }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="m-sheet-handle" />

        {(title || showClose) && (
          <div className="m-sheet-header">
            <div className="m-sheet-header-info">
              {title && <div className="m-sheet-title font-display">{title}</div>}
              {sub && <div className="m-sheet-sub">{sub}</div>}
            </div>
            {showClose && (
              <button className="m-sheet-close" onClick={onClose} aria-label="Cerrar">
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        <div className="m-sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
