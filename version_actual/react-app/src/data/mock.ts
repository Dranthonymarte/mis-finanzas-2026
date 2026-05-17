// ═══════════════════════════════════════════════════
// Mis Finanzas 2026 — Static mock data (Checkpoint B)
// Matches m-main.jsx MOCK structure exactly.
// No Supabase — replace in Checkpoint C.
// ═══════════════════════════════════════════════════

export interface Transaction {
  id: string
  desc: string
  cat: string
  subcat?: string | null   // subcategory (from DB)
  tipo: string
  amount: number
  date: string      // display label: 'Hoy' | 'Ayer' | '14 abr' etc.
  isoDate?: string  // ISO date 'YYYY-MM-DD' (from DB — used for grouping)
  time: string      // '14:32'
  author: 'anthony' | 'isabel'
  accountId: string // foreign key → Account.id
  recurrente?: boolean
  recDia?: number   // day of month 1-28
  mes?: string      // 'YYYY-MM' for future filtering
}

export interface Account {
  id: string
  type: string       // 'CORRIENTE' | 'AHORRO' | 'CASH'
  name: string
  currency: string
  balance: number
  trend: number      // % change this month
  color: string
  spark: number[]
}

export interface KPI {
  id: string
  label: string
  value: number
  delta: number
  neg: boolean       // true = lower is better
  spark: number[]
  suffix?: string
}

// ── Balance sparkline (8 months) ──────────────────
export const MOCK_BALANCE_SERIES = [12400, 12650, 12500, 12900, 12750, 13200, 13800, 14286]

// ── KPI cards ─────────────────────────────────────
export const MOCK_KPIS: KPI[] = [
  {
    id:    'ingresos',
    label: 'Ingresos',
    value: 3250,
    delta: 8.2,
    neg:   false,
    spark: [2800, 2900, 3050, 2980, 3100, 3250],
  },
  {
    id:    'gastos',
    label: 'Gastos',
    value: 1842,
    delta: -3.1,
    neg:   true,
    spark: [2100, 1980, 1900, 1960, 1870, 1842],
  },
  {
    id:    'ahorro',
    label: 'Ahorro',
    value: 1408,
    delta: 14,
    neg:   false,
    spark: [900, 1050, 1100, 1200, 1350, 1408],
  },
  {
    id:     'tasa',
    label:  'Tasa Ahorro',
    value:  43.3,
    delta:  2.1,
    neg:    false,
    spark:  [38, 39.5, 40.2, 41, 42.1, 43.3],
    suffix: '%',
  },
]

// ── Accounts ──────────────────────────────────────
export const MOCK_ACCOUNTS: Account[] = [
  {
    id:       '1',
    type:     'CORRIENTE',
    name:     'Principal',
    currency: 'USD',
    balance:  5820.14,
    trend:    1.2,
    color:    '#58b26a',
    spark:    [5200, 5350, 5300, 5550, 5580, 5820],
  },
  {
    id:       '2',
    type:     'AHORRO',
    name:     'Ahorro BCP',
    currency: 'USD',
    balance:  6450.00,
    trend:    3.4,
    color:    '#6a94c4',
    spark:    [5800, 5900, 6100, 6200, 6350, 6450],
  },
  {
    id:       '3',
    type:     'AHORRO',
    name:     'Emergencia',
    currency: 'USD',
    balance:  2016.33,
    trend:    0.8,
    color:    '#e0a84a',
    spark:    [1900, 1940, 1970, 2000, 2008, 2016],
  },
  {
    id:       '4',
    type:     'CASH',
    name:     'Efectivo',
    currency: 'VES',
    balance:  420.00,
    trend:    -2.1,
    color:    '#d66a5a',
    spark:    [500, 480, 460, 450, 435, 420],
  },
]

// ── Transactions ──────────────────────────────────
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1',  desc: 'Supermercado Plaza',    cat: 'Alimentación',    tipo: 'Gasto',              amount: -84.20,   date: 'Hoy',    time: '14:32', author: 'anthony', accountId: '1', mes: '2026-04' },
  { id: '2',  desc: 'Salario abril',         cat: 'Trabajo',         tipo: 'Ingreso Fijo',        amount:  2800.00, date: 'Hoy',    time: '09:15', author: 'anthony', accountId: '1', mes: '2026-04', recurrente: true, recDia: 1 },
  { id: '3',  desc: 'Netflix',               cat: 'Entretenimiento', tipo: 'Gasto',              amount: -15.99,   date: 'Ayer',   time: '20:41', author: 'anthony', accountId: '1', mes: '2026-04', recurrente: true, recDia: 3 },
  { id: '4',  desc: 'Gasolina',              cat: 'Transporte',      tipo: 'Gasto',              amount: -42.50,   date: 'Ayer',   time: '18:02', author: 'isabel',  accountId: '4', mes: '2026-04' },
  { id: '5',  desc: 'Transferencia ahorro',  cat: 'Inversión',       tipo: 'Ahorro en efectivo', amount: -500.00,  date: '14 abr', time: '12:30', author: 'anthony', accountId: '2', mes: '2026-04' },
  { id: '6',  desc: 'Farmacia',              cat: 'Salud',           tipo: 'Gasto',              amount: -22.14,   date: '14 abr', time: '11:08', author: 'isabel',  accountId: '4', mes: '2026-04' },
  { id: '7',  desc: 'Spotify',               cat: 'Entretenimiento', tipo: 'Gasto',              amount: -9.99,    date: '13 abr', time: '08:00', author: 'anthony', accountId: '1', mes: '2026-04', recurrente: true, recDia: 13 },
  { id: '8',  desc: 'Freelance diseño',      cat: 'Trabajo',         tipo: 'Ingreso Variable',   amount:  350.00,  date: '13 abr', time: '15:20', author: 'anthony', accountId: '1', mes: '2026-04' },
  { id: '9',  desc: 'Mercado La Plaza',      cat: 'Alimentación',    tipo: 'Gasto',              amount: -62.40,   date: '13 abr', time: '11:05', author: 'isabel',  accountId: '4', mes: '2026-04' },
  { id: '10', desc: 'Internet CANTV',        cat: 'Servicios',       tipo: 'Gasto',              amount: -12.00,   date: '12 abr', time: '10:00', author: 'anthony', accountId: '1', mes: '2026-04', recurrente: true, recDia: 12 },
]

// ── Months for selector ───────────────────────────
export interface MonthEntry { id: string; label: string; shortYear: string }
export const MOCK_MONTHS: MonthEntry[] = [
  { id: '2025-11', label: 'Nov', shortYear: '25' },
  { id: '2025-12', label: 'Dic', shortYear: '25' },
  { id: '2026-01', label: 'Ene', shortYear: '26' },
  { id: '2026-02', label: 'Feb', shortYear: '26' },
  { id: '2026-03', label: 'Mar', shortYear: '26' },
  { id: '2026-04', label: 'Abr', shortYear: '26' },
]
export const ACTIVE_MONTH = '2026-04'

export const MONTH_LABELS: Record<string, string> = {
  '2026-04': 'Abril 2026',
  '2026-03': 'Marzo 2026',
  '2026-02': 'Febrero 2026',
  '2026-01': 'Enero 2026',
  '2025-12': 'Diciembre 2025',
  '2025-11': 'Noviembre 2025',
}

// ── Month summary ─────────────────────────────────
export const MOCK_MONTH = {
  label:    'Abril 2026',
  income:   3250.00,
  expenses: 1842.00,
  savings:  1408.00,
  net:      14286.47,   // patrimonio total
  rateBCV:  36.50,
}

// ── AI chat mock ──────────────────────────────────
export interface ChatMsg {
  role: 'bot' | 'user'
  text: string
  time: string
  chart?: boolean
}
export const MOCK_CHAT: ChatMsg[] = [
  { role: 'bot',  text: 'Hola Anthony, ¿en qué puedo ayudarte hoy?',                                                      time: '9:40' },
  { role: 'user', text: '¿Cuánto gasté en restaurantes este mes?',                                                          time: '9:41' },
  { role: 'bot',  text: 'Gastaste $264 en abril en 8 operaciones. Es un 32% más que marzo.',            chart: true,        time: '9:41' },
  { role: 'user', text: '¿Si reduzco a la mitad?',                                                                          time: '9:42' },
  { role: 'bot',  text: 'Ahorrarías $1,584 al año. Suficiente para acelerar el viaje a Japón en 4 meses.',                  time: '9:42' },
]

// ── Helpers ───────────────────────────────────────
export function fmt(n: number): string {
  const abs = Math.abs(n)
  return '$' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function fmtShort(n: number): string {
  const abs = Math.abs(n)
  return '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function txnGroup(tipo: string): 'ingreso' | 'ahorro' | 'ajuste' | 'gasto' {
  if (['Ingreso Fijo', 'Ingreso Variable', 'Prestamo recibido'].includes(tipo)) return 'ingreso'
  if (['Ahorro en efectivo'].includes(tipo)) return 'ahorro'
  if (['Ajuste'].includes(tipo)) return 'ajuste'
  return 'gasto'
}
