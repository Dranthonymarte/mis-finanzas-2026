/**
 * mes.ts — Utilidades de mes para Mis Finanzas 2026
 *
 * DB format : "Mayo" (solo nombre, sin año — convención del app vanilla)
 * ID format : "may-26" (3 letras lower + guión + año 2 dígitos)
 *             → distingue 2025 de 2026, compatible con prefs store
 */

const FULL: string[] = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const SHORT_TO_FULL: Record<string, string> = {
  'ene':'Enero','feb':'Febrero','mar':'Marzo','abr':'Abril',
  'may':'Mayo', 'jun':'Junio', 'jul':'Julio', 'ago':'Agosto',
  'sep':'Septiembre','oct':'Octubre','nov':'Noviembre','dic':'Diciembre',
}

/** date → "may-26"  (prefs store + selector id) */
export function dateToMesId(d: Date = new Date()): string {
  const short = FULL[d.getMonth()].slice(0, 3).toLowerCase()
  return `${short}-${String(d.getFullYear()).slice(2)}`
}

/** "may-26" → "Mayo"  (DB query key) */
export function mesIdToDbKey(mesId: string): string {
  const short = mesId.split('-')[0]
  return SHORT_TO_FULL[short] ?? mesId
}

/** "may-26" → "Mayo 26"  (display label) */
export function mesLabel(mesId: string): string {
  const [short, yr] = mesId.split('-')
  const full = SHORT_TO_FULL[short] ?? mesId
  return `${full} ${yr}`
}

/** "may-26" → "May. 26"  (short display) */
export function mesShort(mesId: string): string {
  const [short, yr] = mesId.split('-')
  const full = SHORT_TO_FULL[short] ?? short
  return `${full.slice(0,3)}. ${yr}`
}

/** Current month id: "may-26" */
export function currentMes(): string {
  return dateToMesId(new Date())
}

/** Last N months as { id: "may-26", label: "Mayo" | "Dic 2025", dbKey: "Mayo" } */
export function generateMeses(count = 12): Array<{ id: string; label: string; dbKey: string }> {
  const result  = []
  const now     = new Date()
  const curYear = now.getFullYear()
  for (let i = count - 1; i >= 0; i--) {
    const d    = new Date(curYear, now.getMonth() - i, 1)
    const id   = dateToMesId(d)
    const full = FULL[d.getMonth()]
    const yearSuffix = d.getFullYear() !== curYear ? ` ${d.getFullYear()}` : ''
    result.push({
      id,
      label: `${full}${yearSuffix}`,
      dbKey: full,
    })
  }
  return result
}
