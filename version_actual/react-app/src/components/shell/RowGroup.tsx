import { type ReactNode } from 'react'

interface RowGroupProps {
  /** Section label above the card */
  title?: string
  children: ReactNode
}

/**
 * Settings card container.
 * Wraps RowLink items in an ink-2 card with border and rounded corners.
 * CSS class: m-row-group
 */
export default function RowGroup({ title, children }: RowGroupProps) {
  return (
    <div className="m-row-group">
      {title && <div className="m-row-group-title">{title}</div>}
      <div className="m-row-group-inner">{children}</div>
    </div>
  )
}
