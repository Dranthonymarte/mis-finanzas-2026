// ═══════════════════════════════════════════════════
// Brand — AppIcon + Logo
// Identidad visual global: bar-chart icon + "Mis Finanzas"
// Matches A1/A2 mockup branding exactly.
// ═══════════════════════════════════════════════════

interface AppIconProps {
  size?: number
}

/** Amber square icon with ascending bar-chart (matches mockup) */
export function AppIcon({ size = 34 }: AppIconProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width:        size,
        height:       size,
        borderRadius: Math.round(size * 0.24),
        background:   'linear-gradient(145deg, #f5c572, #d99b38)',
        display:      'grid',
        placeItems:   'center',
        boxShadow:    '0 3px 10px rgba(224,168,74,.35)',
        flexShrink:   0,
      }}
    >
      {/* 3 ascending bars */}
      <svg
        viewBox="0 0 18 18"
        width={size * 0.58}
        height={size * 0.58}
        fill="rgba(10,11,13,.82)"
        aria-hidden="true"
      >
        <rect x="0.5"  y="11"  width="4.5" height="6.5"  rx="0.8" />
        <rect x="6.75" y="6"   width="4.5" height="11.5" rx="0.8" />
        <rect x="13"   y="1"   width="4.5" height="16.5" rx="0.8" />
      </svg>
    </div>
  )
}

interface LogoProps {
  /** Icon size in px */
  iconSize?: number
  /** Text size in px (defaults to iconSize × 0.53) */
  textSize?: number
  /** Override text color (defaults to var(--amber)) */
  color?: string
}

/** Full brand lockup: icon + "Mis Finanzas" text */
export function Logo({ iconSize = 34, textSize, color = 'var(--amber)' }: LogoProps) {
  const resolvedTextSize = textSize ?? Math.round(iconSize * 0.53)

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(iconSize * 0.29) }}>
      <AppIcon size={iconSize} />
      <span
        style={{
          fontFamily:    'var(--f-display)',
          fontSize:      resolvedTextSize,
          fontWeight:    400,
          color,
          letterSpacing: '-0.01em',
          lineHeight:    1,
          whiteSpace:    'nowrap',
        }}
      >
        Mis Finanzas
      </span>
    </div>
  )
}
