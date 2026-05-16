import { type ReactNode } from 'react'
import { ChevronIcon } from '../icons/Icons'

interface RowLinkProps {
  /** 18×18 icon element */
  icon?: ReactNode
  /** Icon background color */
  iconBg?: string
  /** Icon foreground color */
  iconColor?: string
  /** Primary label */
  label: string
  /** Secondary label below */
  sub?: string
  /** Custom right element (overrides chevron) */
  right?: ReactNode
  /** Red danger styling */
  danger?: boolean
  /** Unused — CSS :last-child handles border removal automatically */
  last?: boolean
  /** Click handler */
  onClick?: () => void
}

/**
 * Settings-style list row.
 * Renders inside <RowGroup>. CSS class: m-row-link
 */
export default function RowLink({
  icon,
  iconBg,
  iconColor,
  label,
  sub,
  right,
  danger,
  last: _last,   // CSS :last-child handles border — prop kept for call-site clarity
  onClick,
}: RowLinkProps) {
  return (
    <button
      className={`m-row-link${danger ? ' danger' : ''}`}
      onClick={onClick}
      type="button"
    >
      {icon && (
        <div
          className="m-row-link-icon"
          style={{
            background: iconBg || 'var(--ink-3)',
            color: danger ? 'var(--neg)' : (iconColor || 'var(--fg-dim)'),
          }}
        >
          {icon}
        </div>
      )}
      <div className="m-row-link-content">
        <div
          className="m-row-link-label"
          style={{ color: danger ? 'var(--neg)' : undefined }}
        >
          {label}
        </div>
        {sub && <div className="m-row-link-sub">{sub}</div>}
      </div>
      <div className="m-row-link-right">
        {right ?? <ChevronIcon />}
      </div>
    </button>
  )
}
