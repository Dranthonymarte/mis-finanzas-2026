// ═══════════════════════════════════════════════════
// Analisis — /analisis
// KPIs + comparativa · Ingresos/Gastos por cat · Semanal
// Presupuesto vs real · Recurrentes — cards colapsables
// ═══════════════════════════════════════════════════

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate }        from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import AppHeader              from '../components/shell/AppHeader'
import CatIcon                from '../components/ui/CatIcon'
import { catColor }           from '../components/ui/catColor'
import { usePrefsStore }      from '../store/prefs'
import { useTransactions }    from '../hooks/useTransactions'
import { useFormat }          from '../hooks/useFormat'
import { txnGroup }           from '../data/mock'
import { generateMesesByYear, mesLabel } from '../lib/mes'
import { useTasas }           from '../hooks/useTasas'
import { useConfig, DEFAULTS } from '../hooks/useConfig'
import { calcKPIs }           from '../lib/finance'

const MONTHS_BY_YEAR = generateMesesByYear()

// ── Derive previous month id ────────────────────────
const MES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function prevMesId(mesId: string): string {
  const [short, yr] = mesId.split('-')
  const idx = MES_SHORT.indexOf(short)
  if (idx < 0) return mesId
  if (idx === 0) {
    const prevYr = String(parseInt(yr) - 1).padStart(2, '0')
    return `dic-${prevYr}`
  }
  return `${MES_SHORT[idx - 1]}-${yr}`
}

// ── Pie donut colors ────────────────────────────────
const PIE_COLORS = [
  '#e0a84a','#4a9eda','#58b26a','#d66a5a','#b0a3c7',
  '#3d8b82','#e87c3e','#7cc4d4','#a0c878','#d4a0d4',
]

interface BarEntry { label: string; value: number }

function Empty() {
  return <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '12px 0' }}>Sin datos</div>
}

// ── Collapsible card (toggle como "Gastos semanales", abierta por defecto) ──
function CollapsibleCard({ title, defaultOpen = true, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          marginBottom: open ? 12 : 0,
        }}
      >
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', textAlign: 'left' }}>
          {title}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--amber)', fontWeight: 700,
          background: open ? 'rgba(var(--amber-rgb),.22)' : 'var(--ink-3)',
          borderRadius: 4, padding: '1px 6px', lineHeight: 1.4, flexShrink: 0, marginLeft: 8,
        }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && children}
    </div>
  )
}

// ── Delta chip ──────────────────────────────────────
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return null
  const pct  = ((cur - prev) / prev) * 100
  const up   = pct >= 0
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
      background: up ? 'rgba(88,178,106,.15)' : 'rgba(214,106,90,.15)',
      color:      up ? 'var(--pos)'           : 'var(--neg)',
    }}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

// ── Recurrente (movido desde Txn) ────────────────────
interface Recurrente {
  id: string; desc: string; cat: string; tipo: string
  amount: number; recDia?: number; cadaDias: number
}

function RecRow({ t, last }: { t: Recurrente; last: boolean }) {
  const { fmt } = useFormat()
  const isInc = txnGroup(t.tipo) === 'ingreso'
  const color = isInc ? 'var(--pos)' : 'var(--neg)'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 1 }}>
          {t.recDia != null ? `Día ${t.recDia} de cada mes` : `Cada ${t.cadaDias} días`}
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

export default function Analisis() {
  const navigate     = useNavigate()
  const { fmt }      = useFormat()
  const mesActivo    = usePrefsStore(s => s.mesActivo)
  const setMesActivo = usePrefsStore(s => s.setMesActivo)
  const moneda       = usePrefsStore(s => s.moneda)
  const ocultarMontos = usePrefsStore(s => s.ocultarMontos)
  const { tasas }    = useTasas()
  const { config, updateConfig } = useConfig()
  const prevId       = prevMesId(mesActivo)
  const activeYear   = mesActivo.split('-')[1]

  const { transactions: liveTxns, loading }  = useTransactions(mesActivo)
  const { transactions: prevTxns }           = useTransactions(prevId)

  const [openCat,       setOpenCat]       = useState<string | null>(null)
  const [openIngCat,    setOpenIngCat]    = useState<string | null>(null)
  const [openSemana,    setOpenSemana]    = useState<string | null>(null)

  // Presupuesto vs real (movido desde Txn)
  const [addingBudget,   setAddingBudget]   = useState(false)
  const [budgetCat,      setBudgetCat]      = useState('')
  const [budgetAmt,      setBudgetAmt]      = useState('')
  const [showBudgetInfo, setShowBudgetInfo] = useState(false)

  const monthsRef = useRef<HTMLDivElement>(null)

  // Scroll active month chip into view on mount / change
  useEffect(() => {
    const el = monthsRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [mesActivo])

  // ── Helpers ─────────────────────────────────────
  const txns        = useMemo(() => liveTxns ?? [], [liveTxns])
  const prevTxnsArr = useMemo(() => prevTxns ?? [], [prevTxns])

  // ── tipos config (same source as Home/useKPIs) ───
  const tipos = useMemo(
    () => config.tipos.length > 0 ? config.tipos : DEFAULTS.tipos,
    [config.tipos]
  )

  // ── KPIs current + prev ──────────────────────────
  const kpis = useMemo(() => {
    const r = calcKPIs(txns, tipos)
    return { ingresos: r.ingresos, gastos: r.gastos, balance: r.neto }
  }, [txns, tipos])

  const prevKpis = useMemo(() => {
    const r = calcKPIs(prevTxnsArr, tipos)
    return { ingresos: r.ingresos, gastos: r.gastos, balance: r.neto }
  }, [prevTxnsArr, tipos])

  // ── Gastos por categoría (donut) ─────────────────
  const gastosPorCat = useMemo<BarEntry[]>(() => {
    const acc: Record<string, number> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) === 'gasto')
        acc[t.cat] = (acc[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(acc).sort(([, a], [, b]) => b - a).slice(0, 8).map(([label, value]) => ({ label, value }))
  }, [txns])

  // ── Gastos por subcategoría por cat ──────────────
  const subcatByCat = useMemo<Record<string, BarEntry[]>>(() => {
    const acc: Record<string, Record<string, number>> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'gasto') continue
      const sub = t.subcat ?? 'Sin subcategoría'
      if (!acc[t.cat]) acc[t.cat] = {}
      acc[t.cat][sub] = (acc[t.cat][sub] ?? 0) + Math.abs(t.amount)
    }
    return Object.fromEntries(
      Object.entries(acc).map(([cat, subs]) => [
        cat,
        Object.entries(subs).sort(([, a], [, b]) => b - a).map(([label, value]) => ({ label, value })),
      ])
    )
  }, [txns])

  // ── Ingresos por categoría ────────────────────────
  const ingresosPorCat = useMemo<BarEntry[]>(() => {
    const acc: Record<string, number> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'ingreso') continue
      acc[t.cat] = (acc[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(acc).sort(([, a], [, b]) => b - a).map(([label, value]) => ({ label, value }))
  }, [txns])

  // ── Txns por categoría de ingreso (desglose al tap) ─
  type IngTxn = typeof txns[number]
  const txnsByIngCat = useMemo<Record<string, IngTxn[]>>(() => {
    const acc: Record<string, IngTxn[]> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'ingreso') continue
      if (!acc[t.cat]) acc[t.cat] = []
      acc[t.cat].push(t)
    }
    return Object.fromEntries(
      Object.entries(acc).map(([cat, ts]) => [cat, ts.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))])
    )
  }, [txns])

  // ── Desglose semanal (gastos) con txns por semana ─
  type TxnItem = typeof txns[number]
  const semanalData = useMemo<{ label: string; value: number; txns: TxnItem[] }[]>(() => {
    const weeks: Record<number, { total: number; txns: TxnItem[] }> = {
      1: { total: 0, txns: [] },
      2: { total: 0, txns: [] },
      3: { total: 0, txns: [] },
      4: { total: 0, txns: [] },
      5: { total: 0, txns: [] },
    }
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'gasto') continue
      const iso = t.isoDate ?? ''
      if (!iso) continue
      const day = parseInt(iso.split('-')[2] ?? '1', 10)
      const wk  = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5
      weeks[wk].total += Math.abs(t.amount)
      weeks[wk].txns.push(t)
    }
    const [short, yr] = mesActivo.split('-')
    const monthShortLabel = `${short}.${yr}`
    return Object.entries(weeks)
      .filter(([, v]) => v.total > 0)
      .map(([wk, v]) => ({
        label: `Sem ${wk} ${monthShortLabel}`,
        value: v.total,
        txns:  v.txns.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
      }))
  }, [txns, mesActivo])

  // ── Presupuesto vs real (movido desde Txn) ────────
  const spentByCat = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) === 'gasto')
        acc[t.cat] = (acc[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return acc
  }, [txns])

  const budgetCats = Object.keys(config.presupuestos)

  const NON_BUDGET_TIPOS = new Set(['Ahorro en efectivo', 'Transferencia Interna', 'Prestamo pagado', 'Ajuste'])
  const expenseCats = [...new Set([
    ...config.tipos
      .filter(t => !t.esIngreso && !NON_BUDGET_TIPOS.has(t.nombre))
      .flatMap(t => config.categorias[t.nombre] ?? []),
    ...Object.keys(spentByCat),
  ])]
  const noBudgetCats = expenseCats.filter(c => !config.presupuestos[c])

  // ── Recurrentes (movido desde Txn) ────────────────
  const recurring: Recurrente[] = config.recurrentes.map(r => ({
    id:      r.id,
    desc:    r.descripcion,
    cat:     r.cat,
    tipo:    r.tipo,
    amount:  r.monto,
    recDia:  r.recDia,
    cadaDias: r.recurrencia_dias,
  }))

  // ── Prev-month label ──────────────────────────────
  const prevLabel = mesLabel(prevId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 32 }}>
      <AppHeader title="Análisis" back />

      {/* ── Month selector (agrupado por año) ── */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 4px' }}>
        {MONTHS_BY_YEAR.map(yg => {
          const isActiveYear = yg.year === activeYear
          return (
            <button
              key={yg.year}
              onClick={() => {
                const last = yg.months[yg.months.length - 1]
                setMesActivo(last.id)
              }}
              style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: isActiveYear ? 'var(--fg)' : 'var(--ink-2)',
                color:      isActiveYear ? 'var(--ink-0)' : 'var(--fg-mute)',
                border:     isActiveYear ? 'none' : '1px solid var(--line)',
              }}
            >
              {yg.yearLabel}
            </button>
          )
        })}
      </div>
      <div
        ref={monthsRef}
        style={{
          display: 'flex', gap: 6, padding: '0 16px 4px', overflowX: 'auto',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {(MONTHS_BY_YEAR.find(yg => yg.year === activeYear)?.months ?? []).map(m => {
          const isActive = m.id === mesActivo
          return (
            <button
              key={m.id}
              data-active={isActive}
              onClick={() => setMesActivo(m.id)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                background: isActive ? 'var(--amber)' : 'var(--ink-2)',
                color:      isActive ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     isActive ? 'none' : '1px solid var(--line)',
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-mute)', fontSize: 13, padding: 40 }}>
          Cargando análisis…
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 0' }}>

          {/* ── KPIs + comparativa ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {([
              { label: 'Ingresos', cur: kpis.ingresos, prev: prevKpis.ingresos, color: 'var(--pos)' },
              { label: 'Gastos',   cur: kpis.gastos,   prev: prevKpis.gastos,   color: 'var(--neg)' },
              { label: 'Balance',  cur: kpis.balance,  prev: prevKpis.balance,  color: kpis.balance >= 0 ? 'var(--pos)' : 'var(--neg)' },
            ]).map(k => (
              <div
                key={k.label}
                style={{
                  background: 'var(--ink-2)', border: '1px solid var(--line)',
                  borderRadius: 12, padding: '10px 10px 8px',
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 5 }}>
                  {k.label}
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: k.color, marginBottom: 4 }}>
                  {k.label === 'Balance' && k.cur >= 0 ? '+' : ''}{fmt(k.cur)}
                </div>
                {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
                  <div style={{ fontSize: 9, color: 'var(--fg-dim)', fontWeight: 500, marginBottom: 2 }}>
                    ≈ Bs {(Math.abs(k.cur) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </div>
                )}
                <Delta cur={k.cur} prev={k.prev} />
                {k.prev > 0 && (
                  <div style={{ fontSize: 9, color: 'var(--fg-mute)', marginTop: 3 }}>
                    vs {prevLabel}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Ingresos por categoría (colapsable, abierta) ── */}
          {ingresosPorCat.length > 0 && (
            <CollapsibleCard title={`Ingresos por categoría — ${mesLabel(mesActivo)}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {ingresosPorCat.map(({ label, value }, i) => {
                  const isOpen  = openIngCat === label
                  const catTxns = txnsByIngCat[label] ?? []
                  const max     = ingresosPorCat[0]?.value ?? 1
                  return (
                    <div key={label}>
                      <button
                        onClick={() => setOpenIngCat(isOpen ? null : label)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer',
                          borderTop: i === 0 ? '1px solid var(--line)' : 'none',
                        }}
                      >
                        <CatIcon cat={label} size={16} />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', textAlign: 'left' }}>{label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pos)' }}>{fmt(value)}</div>
                          {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
                            <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', fontWeight: 500 }}>
                              ≈ Bs {(value * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                            </div>
                          )}
                        </div>
                        {catTxns.length > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                        )}
                      </button>

                      <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: 'var(--pos)', width: `${max > 0 ? (value / max) * 100 : 0}%`, transition: 'width .35s' }} />
                      </div>

                      {isOpen && catTxns.length > 0 && (
                        <div style={{ marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid rgba(88,178,106,.25)', display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {catTxns.map(t => (
                            <div key={t.id} onClick={() => navigate('/txn/' + t.id)} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 1, display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
                                  {t.subcat && <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subcat}</span><span style={{ flexShrink: 0 }}>·</span></>}
                                  <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t.date}</span>
                                </div>
                              </div>
                              <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--pos)', whiteSpace: 'nowrap', marginLeft: 10 }}>
                                {fmt(Math.abs(t.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsibleCard>
          )}

          {/* ── Gastos semanales (colapsable, abierta) ── */}
          {semanalData.length > 0 && (
            <CollapsibleCard title={`Gastos semanales — ${mesLabel(mesActivo)}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {semanalData.map(({ label, value, txns: weekTxns }) => {
                  const isOpen = openSemana === label
                  const maxVal = semanalData.reduce((m, d) => Math.max(m, d.value), 0)
                  return (
                    <div key={label}>
                      <button
                        onClick={() => setOpenSemana(isOpen ? null : label)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--fg)', textAlign: 'left' }}>{label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--amber)' }}>{fmt(value)}</div>
                          {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
                            <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', fontWeight: 500 }}>
                              ≈ Bs {(value * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                            </div>
                          )}
                        </div>
                        {weekTxns.length > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                        )}
                      </button>

                      <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden', marginBottom: isOpen ? 8 : 4 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: 'var(--amber)', width: `${maxVal > 0 ? (value / maxVal) * 100 : 0}%`, transition: 'width .35s' }} />
                      </div>

                      {isOpen && weekTxns.length > 0 && (
                        <div style={{ marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid rgba(var(--amber-rgb),.25)', display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {weekTxns.map(t => (
                            <div
                              key={t.id}
                              onClick={() => navigate('/txn/' + t.id)}
                              style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 1, display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
                                  {t.cat && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.cat}</span>}
                                  {t.cat && <span style={{ flexShrink: 0 }}>·</span>}
                                  <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t.date}</span>
                                </div>
                              </div>
                              <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--neg)', whiteSpace: 'nowrap', marginLeft: 10 }}>
                                {fmt(Math.abs(t.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsibleCard>
          )}

          {/* ── Gastos por categoría: donut + lista (colapsable, abierta) ── */}
          <CollapsibleCard title={`Gastos por categoría — ${mesLabel(mesActivo)}`}>
            {gastosPorCat.length === 0 ? <Empty /> : (
              <>
                {/* Donut chart */}
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={gastosPorCat}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {gastosPorCat.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: 'var(--fg)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category list (expandible subcats) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
                  {gastosPorCat.map(({ label, value }, i) => {
                    const isOpen = openCat === label
                    const subs   = subcatByCat[label] ?? []
                    return (
                      <div key={label}>
                        <button
                          onClick={() => setOpenCat(isOpen ? null : label)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer',
                            borderTop: i === 0 ? '1px solid var(--line)' : 'none',
                          }}
                        >
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <CatIcon cat={label} size={16} />
                          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', textAlign: 'left' }}>{label}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--neg)' }}>{fmt(value)}</div>
                            {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
                              <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', fontWeight: 500 }}>
                                ≈ Bs {(value * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                              </div>
                            )}
                          </div>
                          {subs.length > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                          )}
                        </button>

                        {/* Subcategorías expandibles */}
                        {isOpen && subs.length > 0 && (
                          <div style={{ marginLeft: 20, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {subs.map(s => (
                              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 12px', borderLeft: `2px solid ${PIE_COLORS[i % PIE_COLORS.length]}20` }}>
                                <span style={{ fontSize: 11.5, color: 'var(--fg-dim)' }}>{s.label}</span>
                                <span className="num" style={{ fontSize: 11.5, color: 'var(--fg-dim)' }}>{fmt(s.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CollapsibleCard>

          {/* ── Presupuesto vs real (movido, colapsable, abierta) ── */}
          <CollapsibleCard title="Presupuesto vs real">
            {/* toolbar: info + agregar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setShowBudgetInfo(v => !v)}
                style={{
                  background: showBudgetInfo ? 'var(--amber)' : 'var(--ink-3)',
                  border: '1px solid var(--line)', borderRadius: '50%',
                  cursor: 'pointer', padding: 0, lineHeight: 1,
                  color: showBudgetInfo ? 'var(--ink-0)' : 'var(--fg-dim)',
                  fontSize: 10, fontWeight: 700, width: 16, height: 16,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Info presupuesto"
              >ℹ</button>
              <button
                onClick={() => setAddingBudget(v => !v)}
                style={{
                  fontSize: 11, fontWeight: 700, color: addingBudget ? 'var(--fg-mute)' : 'var(--amber)',
                  background: addingBudget ? 'var(--ink-3)' : 'rgba(var(--amber-rgb),.1)',
                  border: addingBudget ? '1px solid var(--line)' : '1px solid rgba(var(--amber-rgb),.25)',
                  borderRadius: 8, padding: '3px 10px', cursor: 'pointer',
                }}
              >
                {addingBudget ? '✕ Cancelar' : '+ Agregar'}
              </button>
            </div>

            {showBudgetInfo && (
              <div style={{ background: 'rgba(var(--amber-rgb),.07)', border: '1px solid rgba(var(--amber-rgb),.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
                Compara cuánto planificaste gastar por categoría vs lo que realmente gastaste este mes. Verde = dentro del límite, amarillo = cerca, rojo = excedido.
              </div>
            )}

            {addingBudget && (
              <div style={{ background: 'var(--ink-1)', border: '1px solid rgba(var(--amber-rgb),.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
                  {budgetCat ? `Límite para ${budgetCat}` : 'Selecciona una categoría'}
                </div>

                {!budgetCat && (
                  noBudgetCats.length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '12px 0' }}>
                        Todas las categorías ya tienen presupuesto
                      </div>
                    : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {noBudgetCats.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { setBudgetCat(cat); setBudgetAmt('') }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 500,
                              background: 'var(--ink-3)', border: '1px solid var(--line)',
                              color: 'var(--fg-dim)', cursor: 'pointer',
                            }}
                          >
                            <CatIcon cat={cat} size={18} />
                            {cat}
                          </button>
                        ))}
                      </div>
                )}

                {budgetCat && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => setBudgetCat('')}
                      style={{ padding: '4px 8px', borderRadius: 8, background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-mute)', fontSize: 11, cursor: 'pointer' }}
                    >← Volver</button>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--fg-mute)' }}>$</span>
                      <input
                        autoFocus type="number" min="0" step="0.01"
                        placeholder="Límite mensual"
                        value={budgetAmt}
                        onChange={e => setBudgetAmt(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            const amt = parseFloat(budgetAmt)
                            if (!isNaN(amt) && amt > 0) {
                              await updateConfig('presupuestos', { ...config.presupuestos, [budgetCat]: amt })
                              setBudgetCat(''); setBudgetAmt(''); setAddingBudget(false)
                            }
                          }
                        }}
                        style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px 9px 22px', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' as const }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const amt = parseFloat(budgetAmt)
                        if (isNaN(amt) || amt <= 0) return
                        await updateConfig('presupuestos', { ...config.presupuestos, [budgetCat]: amt })
                        setBudgetCat(''); setBudgetAmt(''); setAddingBudget(false)
                      }}
                      disabled={!budgetAmt}
                      style={{
                        flexShrink: 0, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        background: budgetAmt ? 'var(--amber)' : 'var(--ink-3)',
                        color: budgetAmt ? 'var(--ink-0)' : 'var(--fg-mute)',
                        border: 'none', cursor: budgetAmt ? 'pointer' : 'default',
                      }}
                    >Guardar</button>
                  </div>
                )}
              </div>
            )}

            {/* budget bars */}
            <div style={{ borderTop: budgetCats.length ? '1px solid var(--line)' : 'none' }}>
              {budgetCats.length === 0 ? (
                <div style={{ padding: '4px 0 0', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12 }}>
                  Sin presupuestos — toca "+ Agregar" para crear uno.
                </div>
              ) : budgetCats.map((cat, i) => {
                const limit  = config.presupuestos[cat]
                const spent  = spentByCat[cat] ?? 0
                const pct    = Math.min(100, (spent / limit) * 100)
                const over   = spent > limit
                const color  = catColor(cat)
                const isLast = i === budgetCats.length - 1
                return (
                  <div key={cat} style={{
                    padding: '12px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <CatIcon cat={cat} size={22} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{cat}</span>
                      <span className="num" style={{ fontSize: 12.5, color: over ? 'var(--neg)' : 'var(--fg-dim)' }}>
                        {fmt(spent)} / {fmt(limit)}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width .4s ease',
                        width: `${pct}%`,
                        background: over ? 'var(--neg)' : color,
                      }} />
                    </div>
                    {over && (
                      <div style={{ fontSize: 10, color: 'var(--neg)', marginTop: 4, textAlign: 'right' }}>
                        Excedido {fmt(spent - limit)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CollapsibleCard>

          {/* ── Recurrentes (movido, colapsable, abierta) ── */}
          {recurring.length > 0 && (
            <CollapsibleCard title="Recurrentes este mes">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recurring.map((t, i) => (
                  <RecRow key={t.id} t={t} last={i === recurring.length - 1} />
                ))}
              </div>
            </CollapsibleCard>
          )}

        </div>
      )}
    </div>
  )
}
