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

export function catColor(cat: string): string {
  return CAT_COLORS[cat] || '#6e7681'
}

interface CatIconProps {
  cat: string
  size?: number
}

export default function CatIcon({ cat, size = 36 }: CatIconProps) {
  const c = catColor(cat)
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
      {cat.slice(0, 2).toUpperCase()}
    </div>
  )
}
