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
  // Ahorros / inversiones
  if (lower.includes('ahorro'))                                               return '🐷'
  if (lower.includes('inversion') || lower.includes('inversión') ||
      lower.includes('bolsa') || lower.includes('cripto'))                    return '📈'
  // Ingresos / salarios
  if (lower.includes('salario') || lower.includes('sueldo') ||
      lower.includes('nomina') || lower.includes('nómina'))                   return '💵'
  if (lower.includes('ingreso'))                                              return '💰'
  // Préstamos / deudas / crédito
  if (lower.includes('prestamo') || lower.includes('préstamo') ||
      lower.includes('deuda') || lower.includes('credito') ||
      lower.includes('crédito'))                                              return '💳'
  // Impuestos / tributos
  if (lower.includes('impuesto') || lower.includes('iva') ||
      lower.includes('tributo'))                                              return '🧾'
  // Bancario / comisiones
  if (lower.includes('banco') || lower.includes('comision') ||
      lower.includes('comisión') || lower.includes('interes') ||
      lower.includes('interés'))                                              return '🏦'
  // Combustible / gasolina
  if (lower.includes('combustible') || lower.includes('gasolina') ||
      lower.includes('gas'))                                                  return '⛽'
  // Transporte específico
  if (lower.includes('taxi') || lower.includes('uber') ||
      lower.includes('metro'))                                                return '🚕'
  if (lower.includes('transport'))                                            return '🚗'
  // Alimentación / comida
  if (lower.includes('restaur') || lower.includes('almuerzo') ||
      lower.includes('cena') || lower.includes('desayuno'))                   return '🍽️'
  if (lower.includes('supermercado') || lower.includes('mercado'))            return '🛒'
  if (lower.includes('comida') || lower.includes('aliment'))                  return '🍔'
  // Salud
  if (lower.includes('farmacia') || lower.includes('medicamento'))            return '💊'
  if (lower.includes('dentis') || lower.includes('dental'))                   return '🦷'
  if (lower.includes('gym') || lower.includes('gimnasio') ||
      lower.includes('deporte'))                                              return '💪'
  if (lower.includes('salud') || lower.includes('medic'))                     return '❤️'
  // Seguros
  if (lower.includes('seguro') || lower.includes('póliza') ||
      lower.includes('poliza'))                                               return '🛡️'
  // Hogar / vivienda
  if (lower.includes('alquiler') || lower.includes('arriend') ||
      lower.includes('arrend'))                                               return '🏠'
  if (lower.includes('hogar') || lower.includes('casa'))                      return '🏠'
  // Servicios públicos
  if (lower.includes('agua'))                                                 return '💧'
  if (lower.includes('internet') || lower.includes('wifi') ||
      lower.includes('celular') || lower.includes('telefon') ||
      lower.includes('teléfon') || lower.includes('movil') ||
      lower.includes('móvil'))                                                return '📱'
  if (lower.includes('serv'))                                                 return '⚡'
  // Hospedaje / viajes
  if (lower.includes('hotel') || lower.includes('hosped'))                    return '🏨'
  if (lower.includes('viaje') || lower.includes('vuelo'))                     return '✈️'
  // Ropa / vestimenta
  if (lower.includes('ropa') || lower.includes('vestid'))                     return '👕'
  // Educación
  if (lower.includes('edu') || lower.includes('escuela'))                     return '📚'
  // Entretenimiento / ocio
  if (lower.includes('entret') || lower.includes('ocio'))                     return '🎬'
  // Tecnología
  if (lower.includes('tecno') || lower.includes('comput'))                    return '💻'
  // Ajustes
  if (lower.includes('ajuste'))                                               return '⚙️'
  // Mascotas
  if (lower.includes('mascota') || lower.includes('veterinari'))              return '🐾'
  // Transferencias
  if (lower.includes('transfer') || lower.includes('interno'))                return '🔄'
  // Regalos / donaciones
  if (lower.includes('regalo') || lower.includes('donacion') ||
      lower.includes('donación'))                                             return '🎁'
  // Personal / belleza
  if (lower.includes('belleza') || lower.includes('peluquer') ||
      lower.includes('personal'))                                             return '💇'
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
