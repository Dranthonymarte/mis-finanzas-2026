// ═══════════════════════════════════════════════════
// Mis Finanzas 2026 — Static mock data (Checkpoint A)
// No Supabase. Replace with live data in Checkpoint C.
// ═══════════════════════════════════════════════════

export interface Transaction {
  id: string
  desc: string
  tipo: string
  cat: string
  amount: number
  date: string
  method: string
  author: string
}

export interface Account {
  id: string
  name: string
  balance: number
  currency: string
  color: string
  icon: string
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1',  desc: 'Salario mayo',        tipo: 'Ingreso Fijo',        cat: 'Trabajo',         amount: 1200.00, date: '2026-05-15', method: 'Transferencia', author: 'Anthony' },
  { id: '2',  desc: 'Mercado Central',      tipo: 'Gasto',               cat: 'Alimentación',    amount:   85.50, date: '2026-05-14', method: 'Efectivo',      author: 'Anthony' },
  { id: '3',  desc: 'Netflix',              tipo: 'Gasto',               cat: 'Entretenimiento', amount:   15.99, date: '2026-05-13', method: 'Tarjeta',       author: 'Anthony' },
  { id: '4',  desc: 'Ahorro ETF',           tipo: 'Ahorro en efectivo',  cat: 'Inversión',       amount:  200.00, date: '2026-05-12', method: 'Transferencia', author: 'Anthony' },
  { id: '5',  desc: 'Gasolina',             tipo: 'Gasto',               cat: 'Transporte',      amount:   40.00, date: '2026-05-11', method: 'Efectivo',      author: 'Anthony' },
  { id: '6',  desc: 'Freelance diseño',     tipo: 'Ingreso Variable',    cat: 'Trabajo',         amount:  350.00, date: '2026-05-10', method: 'Transferencia', author: 'Anthony' },
  { id: '7',  desc: 'Farmacia',             tipo: 'Gasto',               cat: 'Salud',           amount:   28.40, date: '2026-05-09', method: 'Efectivo',      author: 'Familia' },
  { id: '8',  desc: 'Internet CANTV',       tipo: 'Gasto',               cat: 'Servicios',       amount:   12.00, date: '2026-05-08', method: 'Tarjeta',       author: 'Anthony' },
  { id: '9',  desc: 'Cena restaurante',     tipo: 'Gasto',               cat: 'Alimentación',    amount:   55.00, date: '2026-05-07', method: 'Efectivo',      author: 'Anthony' },
  { id: '10', desc: 'Spotify',              tipo: 'Gasto',               cat: 'Entretenimiento', amount:    9.99, date: '2026-05-07', method: 'Tarjeta',       author: 'Anthony' },
]

export const MOCK_ACCOUNTS: Account[] = [
  { id: '1', name: 'Efectivo USD',   balance: 450.00,  currency: 'USD', color: '#58b26a', icon: '💵' },
  { id: '2', name: 'Bancamiga',      balance: 2800.00, currency: 'VES', color: '#e0a84a', icon: '🏦' },
  { id: '3', name: 'Zinli',          balance: 380.00,  currency: 'USD', color: '#6a94c4', icon: '💳' },
  { id: '4', name: 'Efectivo VES',   balance: 8500.00, currency: 'VES', color: '#d66a5a', icon: '💰' },
]

export const MOCK_MONTH = {
  label: 'Mayo 2026',
  income:   1550.00,
  expenses:  246.88,
  savings:   200.00,
  net:      1303.12,
  rateBCV:   36.50,   // USD/VES mock rate
}

/** Classify a transaction tipo into a semantic group */
export function txnGroup(tipo: string): 'ingreso' | 'ahorro' | 'ajuste' | 'gasto' {
  if (['Ingreso Fijo', 'Ingreso Variable', 'Prestamo recibido'].includes(tipo)) return 'ingreso'
  if (['Ahorro en efectivo'].includes(tipo)) return 'ahorro'
  if (['Ajuste'].includes(tipo)) return 'ajuste'
  return 'gasto'
}

/** Format a USD amount */
export function fmt(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
