// ═══════════════════════════════════════════════════
// CatIcon — category icon with colored background + initials
// Matches m-main.jsx CatIcon() anatomy exactly.
// ═══════════════════════════════════════════════════

const CAT_COLORS: Record<string, string> = {
  'Alimentación':    '#e0a84a',
  'Mercado':         '#e0a84a',
  'Trabajo':         '#58b26a',
  'Salario':         '#58b26a',
  'Entretenimiento': '#6a94c4',
  'Suscripción':     '#6a94c4',
  'Suscripciones':   '#6a94c4',
  'Transporte':      '#3d8b82',
  'Inversión':       '#b0a3c7',
  'Ahorro':          '#b0a3c7',
  'Interno':         '#b0a3c7',
  'Salud':           '#d4a7a7',
  'Farmacia':        '#d4a7a7',
  'Servicios':       '#9aa0ab',
  'Restaurantes':    '#d66a5a',
  'Ocio':            '#b8a870',
}

/** Deterministic hue from string so unknown cats get consistent, non-gray colors. */
function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = str.charCodeAt(i) + ((h << 5) - h); h |= 0 }
  return Math.abs(h) % 360
}

export function catColor(cat: string | null | undefined): string {
  if (!cat) return '#6e7681'
  return CAT_COLORS[cat] ?? `hsl(${hashHue(cat)}, 50%, 52%)`
}

interface CatIconProps {
  cat: string | null | undefined
  size?: number
}

export default function CatIcon({ cat, size = 36 }: CatIconProps) {
  const safe = cat ?? ''
  const c = catColor(safe)
  return (
    <div
      style={{
        width:        size,
        height:       size,
        borderRadius: size * 0.28,
        background:   `${c}22`,
        border:       `1px solid ${c}44`,
        display:      'grid',
        placeItems:   'center',
        color:         c,
        fontSize:      size * 0.3,
        fontWeight:    600,
        flexShrink:    0,
        lineHeight:    1,
      }}
    >
      {safe.slice(0, 2).toUpperCase() || '??'}
    </div>
  )
}
