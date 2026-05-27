// ═══════════════════════════════════════════════════
// Pill — status badge. Matches m-main.jsx <Pill> usage.
// tone: 'pos' | 'neg' | 'amber' | 'info' | 'mute'
// ═══════════════════════════════════════════════════

import { type ReactNode } from 'react'

type Tone = 'pos' | 'neg' | 'amber' | 'info' | 'mute'
type Size = 'xs' | 'sm' | 'md'

const TONES: Record<Tone, { bg: string; color: string }> = {
  pos:   { bg: 'var(--pos-d)',                   color: 'var(--pos)'   },
  neg:   { bg: 'var(--neg-d)',                   color: 'var(--neg)'   },
  amber: { bg: 'var(--amber-d)',                 color: 'var(--amber)' },
  info:  { bg: 'rgba(106,148,196,.18)',          color: 'var(--info)'  },
  mute:  { bg: 'var(--ink-3)',                   color: 'var(--fg-mute)' },
}

const SIZES: Record<Size, { fontSize: number; padding: string }> = {
  xs: { fontSize: 9.5,  padding: '2px 7px'  },
  sm: { fontSize: 11,   padding: '3px 9px'  },
  md: { fontSize: 12.5, padding: '4px 11px' },
}

interface PillProps {
  children: ReactNode
  tone?: Tone
  size?: Size
  title?: string
}

export default function Pill({ children, tone = 'pos', size = 'xs', title }: PillProps) {
  const c = TONES[tone]
  const s = SIZES[size]
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: s.padding,
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: '.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}
