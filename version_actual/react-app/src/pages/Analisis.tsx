// ═══════════════════════════════════════════════════
// Analisis — /analisis
// KPIs + comparativa · Donut gastos cat · Subcats expandibles
// Ingresos tipo · Semanal · Top gastos
// ═══════════════════════════════════════════════════

import { useMemo, useState }  from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import AppHeader              from '../components/shell/AppHeader'
import CatIcon                from '../components/ui/CatIcon'
import { usePrefsStore }      from '../store/prefs'
import { useTransactions }    from '../hooks/useTransactions'
import { useFormat }          from '../hooks/useFormat'
import { txnGroup }           from '../data/mock'
import { generateMeses, mesLabel } from '../lib/mes'

const MONTHS_6 = generateMeses(6)

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

// ── Mini horizontal bar ─────────────────────────────
interface BarEntry { label: string; value: number }
function HBar({ data, color }: { data: BarEntry[]; color: string }) {
  const { fmt } = useFormat()
  const max = data.reduce((m, d) => Math.max(m, d.value), 0)
  if (!data.length) return <Empty />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(({ label, value }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {label}
            </span>
            <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(value)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: color, width: `${max > 0 ? (value / max) * 100 : 0}%`, transition: 'width .35s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Empty() {
  return <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '12px 0' }}>Sin datos</div>
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 12 }}>
      {children}
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

export default function Analisis() {
  const { fmt }      = useFormat()
  const mesActivo    = usePrefsStore(s => s.mesActivo)
  const setMesActivo = usePrefsStore(s => s.setMesActivo)
  const prevId       = prevMesId(mesActivo)

  const { transactions: liveTxns, loading }  = useTransactions(mesActivo)
  const { transactions: prevTxns }           = useTransactions(prevId)

  const [openCat,       setOpenCat]       = useState<string | null>(null)
  const [ingresosOpen,  setIngresosOpen]  = useState(false)

  // ── Helpers ─────────────────────────────────────
  const txns     = liveTxns ?? []
  const prevTxnsArr = prevTxns ?? []

  // ── KPIs current + prev ──────────────────────────
  const kpis     = useMemo(() => {
    let ingresos = 0, gastos = 0
    for (const t of txns) {
      const g = txnGroup(t.tipo)
      if (g === 'ingreso') ingresos += Math.abs(t.amount)
      else if (g === 'gasto') gastos += Math.abs(t.amount)
    }
    return { ingresos, gastos, balance: ingresos - gastos }
  }, [txns])

  const prevKpis = useMemo(() => {
    let ingresos = 0, gastos = 0
    for (const t of prevTxnsArr) {
      const g = txnGroup(t.tipo)
      if (g === 'ingreso') ingresos += Math.abs(t.amount)
      else if (g === 'gasto') gastos += Math.abs(t.amount)
    }
    return { ingresos, gastos, balance: ingresos - gastos }
  }, [prevTxnsArr])

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

  // ── Ingresos: total + desglose por categoría ──
  const ingresosTotal = useMemo(
    () => txns.reduce((s, t) => txnGroup(t.tipo) === 'ingreso' ? s + Math.abs(t.amount) : s, 0),
    [txns],
  )
  const ingresosPorTipo = useMemo<BarEntry[]>(() => {
    const map: Record<string, number> = {}
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'ingreso') continue
      map[t.tipo] = (map[t.tipo] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ label, value }))
  }, [txns])

  // ── Desglose semanal (gastos) ────────────────────
  const semanal = useMemo<BarEntry[]>(() => {
    const weeks: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const t of txns) {
      if (txnGroup(t.tipo) !== 'gasto') continue
      const iso = t.isoDate ?? ''
      if (!iso) continue
      const day = parseInt(iso.split('-')[2] ?? '1', 10)
      const wk  = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : day <= 28 ? 4 : 5
      weeks[wk] += Math.abs(t.amount)
    }
    // Get month label from mesActivo
    const [short, yr] = mesActivo.split('-')
    const monthShortLabel = `${short}.${yr}`
    return Object.entries(weeks)
      .filter(([, v]) => v > 0)
      .map(([wk, value]) => ({ label: `Sem ${wk} ${monthShortLabel}`, value }))
  }, [txns, mesActivo])

  // ── Top 5 individual gastos ──────────────────────
  const topGastosTxns = useMemo(() => {
    return txns.filter(t => txnGroup(t.tipo) === 'gasto')
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5)
  }, [txns])

  // ── Prev-month label ──────────────────────────────
  const prevLabel = mesLabel(prevId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 32 }}>
      <AppHeader title="Análisis" back />

      {/* ── Month selector ── */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 4px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {MONTHS_6.map(m => {
          const isActive = m.id === mesActivo
          return (
            <button key={m.id} onClick={() => setMesActivo(m.id)} style={{
              padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              background: isActive ? 'var(--amber)' : 'var(--ink-2)',
              color:      isActive ? 'var(--ink-0)' : 'var(--fg-dim)',
              border:     isActive ? 'none'         : '1px solid var(--line)',
            }}>
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
              { label: 'Ingresos', cur: kpis.ingresos, prev: prevKpis.ingresos, color: 'var(--pos)',                                      key: 'ing' },
              { label: 'Gastos',   cur: kpis.gastos,   prev: prevKpis.gastos,   color: 'var(--neg)',                                      key: 'gas' },
              { label: 'Balance',  cur: kpis.balance,  prev: prevKpis.balance,  color: kpis.balance >= 0 ? 'var(--pos)' : 'var(--neg)',   key: 'bal' },
            ]).map(k => {
              const isIng     = k.key === 'ing'
              const isGas     = k.key === 'gas'
              const expanded  = isIng ? ingresosOpen : false
              const toggle    = isIng ? () => setIngresosOpen(v => !v) : undefined
              return (
                <div
                  key={k.label}
                  onClick={toggle}
                  style={{
                    background: 'var(--ink-2)', border: `1px solid ${expanded ? k.color + '50' : 'var(--line)'}`,
                    borderRadius: 12, padding: '10px 10px 8px',
                    cursor: toggle ? 'pointer' : 'default',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {k.label}
                    {(isIng || isGas) && (
                      <span style={{ fontSize: 9, opacity: 0.5, color: k.color }}>{expanded ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 700, color: k.color, marginBottom: 4 }}>
                    {k.label === 'Balance' && k.cur >= 0 ? '+' : ''}{fmt(k.cur)}
                  </div>
                  <Delta cur={k.cur} prev={k.prev} />
                  {k.prev > 0 && (
                    <div style={{ fontSize: 9, color: 'var(--fg-mute)', marginTop: 3 }}>vs {prevLabel}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Desglose ingresos por tipo (expandible) ── */}
          {ingresosOpen && ingresosPorTipo.length > 0 && (
            <div style={{ background: 'var(--ink-2)', border: '1px solid rgba(88,178,106,.3)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--pos)', marginBottom: 10 }}>
                Desglose por fuente de ingreso
              </div>
              <HBar data={ingresosPorTipo} color="var(--pos)" />
            </div>
          )}

          {/* ── Gastos por categoría: donut + lista ── */}
          <Card>
            <SLabel>Gastos por categoría — {mesLabel(mesActivo)}</SLabel>
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
                          <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--neg)' }}>{fmt(value)}</span>
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
          </Card>

          {/* ── Ingresos: total + desglose por persona ── */}
          <Card>
            <SLabel>Ingresos — {mesLabel(mesActivo)}</SLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Total ingresos</span>
              <span className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--pos)' }}>{fmt(ingresosTotal)}</span>
            </div>
            <HBar data={ingresosPorTipo} color="var(--pos)" />
          </Card>

          {/* ── Desglose semanal ── */}
          {semanal.length > 0 && (
            <Card>
              <SLabel>Gastos semanales — {mesLabel(mesActivo)}</SLabel>
              <HBar data={semanal} color="var(--amber)" />
            </Card>
          )}

          {/* ── Top gastos individuales ── */}
          <Card>
            <SLabel>Top gastos — {mesLabel(mesActivo)}</SLabel>
            {topGastosTxns.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topGastosTxns.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10,
                    padding: '10px 0',
                    borderBottom: i < topGastosTxns.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.desc}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 4 }}>
                        <span>{t.cat}</span>
                        {t.subcat && <><span>·</span><span>{t.subcat}</span></>}
                        <span>·</span>
                        <span>{t.date}</span>
                      </div>
                    </div>
                    <div className="num" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--neg)', whiteSpace: 'nowrap' }}>
                      −{fmt(Math.abs(t.amount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}

