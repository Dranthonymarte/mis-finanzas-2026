// ═══════════════════════════════════════════════════
// CatIcon — category icon with colored background + emoji/initials
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

/** Default emoji map for known categories */
const CAT_EMOJI: Record<string, string> = {
  'Alimentación':    '🍔',
  'Mercado':         '🛒',
  'Trabajo':         '💼',
  'Salario':         '💵',
  'Ingreso Fijo':    '💰',
  'Ingreso Variable':'💸',
  'Entretenimiento': '🎬',
  'Suscripción':     '📺',
  'Suscripciones':   '📺',
  'Transporte':      '🚗',
  'Inversión':       '📈',
  'Ahorro':          '🐷',
  'Ahorro en efectivo': '🐷',
  'Interno':         '🔄',
  'Salud':           '❤️',
  'Farmacia':        '💊',
  'Servicios':       '⚡',
  'Restaurantes':    '🍽️',
  'Ocio':            '🎮',
  'Hogar':           '🏠',
  'Ropa':            '👕',
  'Educación':       '📚',
  'Viajes':          '✈️',
  'Mascotas':        '🐾',
  'Tecnología':      '💻',
  'Otro':            '📦',
  'Gasto':           '💸',
  'Ingreso':         '💰',
  'Transferencia Interna': '🔄',
  'Ajuste':          '⚙️',
}

/** Keyword-based emoji fallback */
function findEmojiByKeyword(cat: string): string | undefined {
  const lower = cat.toLowerCase()
  if (lower.includes('ahorro'))     return '🐷'
  if (lower.includes('ingreso'))    return '💰'
  if (lower.includes('salario'))    return '💵'
  if (lower.includes('comida') || lower.includes('aliment')) return '🍔'
  if (lower.includes('transport'))  return '🚗'
  if (lower.includes('salud') || lower.includes('medic'))    return '❤️'
  if (lower.includes('hogar') || lower.includes('casa'))     return '🏠'
  if (lower.includes('ropa') || lower.includes('vestid'))    return '👕'
  if (lower.includes('edu') || lower.includes('escuela'))    return '📚'
  if (lower.includes('viaje') || lower.includes('vuelo'))    return '✈️'
  if (lower.includes('entret') || lower.includes('ocio'))    return '🎬'
  if (lower.includes('serv'))       return '⚡'
  if (lower.includes('tecno') || lower.includes('comput'))   return '💻'
  if (lower.includes('ajuste'))     return '⚙️'
  return undefined
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

function getStoredEmoji(cat: string): string | undefined {
  try {
    const map = JSON.parse(localStorage.getItem('mf-cat-emojis') || '{}') as Record<string, string>
    return map[cat] || undefined
  } catch { return undefined }
}

export default function CatIcon({ cat, size = 36 }: CatIconProps) {
  const safe  = cat ?? ''
  const c     = catColor(safe)
  const emoji = getStoredEmoji(safe) ?? CAT_EMOJI[safe] ?? findEmojiByKeyword(safe) ?? '💸'
  return (
    <div
      style={{
        width:        size,
        height:       size,
        borderRadius: size * 0.28,
        background:   `${c}30`,
        border:       `1px solid ${c}55`,
        display:      'grid',
        placeItems:   'center',
        color:         c,
        fontSize:      size * 0.45,
        fontWeight:    600,
        flexShrink:    0,
        lineHeight:    1,
      }}
    >
      {emoji}
    </div>
  )
}
