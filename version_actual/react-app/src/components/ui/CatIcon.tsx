// ═══════════════════════════════════════════════════
// CatIcon — category icon with colored background + emoji/initials
// ═══════════════════════════════════════════════════

import { catColor } from './catColor'

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

interface CatIconProps {
  cat:       string | null | undefined
  size?:     number
  /** When rendering a subcategory icon, pass "ParentCat::SubName" to resolve its specific emoji */
  subcatKey?: string
}

const CAT_EMOJI_LS_KEY = 'mf-cat-emojis'

/**
 * Look up a stored emoji override.
 * - For categories: key = cat name
 * - For subcategories: key = "parentCat::subName"
 * Both live in the same unified map (matches config_usuario.cat_emojis).
 */
function getStoredEmoji(cat: string, subcatKey?: string): string | undefined {
  try {
    const map = JSON.parse(localStorage.getItem(CAT_EMOJI_LS_KEY) || '{}') as Record<string, string>
    if (subcatKey) return map[subcatKey] || undefined
    return map[cat] || undefined
  } catch { return undefined }
}

export default function CatIcon({ cat, size = 36, subcatKey }: CatIconProps) {
  const safe  = cat ?? ''
  const c     = catColor(safe)
  const emoji = getStoredEmoji(safe, subcatKey) ?? CAT_EMOJI[safe] ?? findEmojiByKeyword(safe) ?? '💸'
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
