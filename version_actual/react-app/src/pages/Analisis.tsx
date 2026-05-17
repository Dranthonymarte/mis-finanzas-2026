// ═══════════════════════════════════════════════════
// Analisis — /analisis
// KPIs · Gastos por categoría · Ingresos por tipo · Top txns
// ═══════════════════════════════════════════════════

import { useMemo }          from 'react'
import AppHeader            from '../components/shell/AppHeader'
import { usePrefsStore }    from '../store/prefs'
import { useTransactions }  from '../hooks/useTransactions'
import { useFormat }        from '../hooks/useFormat'
import { txnGroup }         from '../data/mock'
import { generateMeses, mesLabel } from '../lib/mes'

const MONTHS_6 = generateMeses(6)

// ── Shared card wrapper ─────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--ink-2)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 14, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

// ── Section label ───────────────────────────────────
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
      textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ── Horizontal bar chart ────────────────────────────
interface BarEntry { label: string; value: number }
function BarChart({
  data, color,
}: { data: BarEntry[]; color: string }) {
  const { fmt } = useFormat()
  const max = data.reduce((m, d) => Math.max(m, d.value), 0)
  if (data.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '12px 0' }}>
        Sin datos
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(({ label, value }) => {
        const pct = max > 0 ? (value / max) * 100 : 0
        return (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
              <span style={{
                fontSize: 12, color: 'var(--fg-dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '60%',
              }}>
                {label}
              </span>
              <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>
                {fmt(value)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: color,
                width: `${pct}%`,
                opacity: 0.85,
                transition: 'width .35s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Analisis() {
  const { fmt }      = useFormat()
  const mesActivo    = usePrefsStore(s => s.mesActivo)
  const setMesActivo = usePrefsStore(s => s.setMesActivo)

  const { transactions: liveTxns, loading } = useTransactions(mesActivo)

  // ── KPI aggregations ────────────────────────────
  const kpis = useMemo(() => {
    const txns = liveTxns ?? []
    let ingresos = 0, gastos = 0
    for (const t of txns) {
      const g = txnGroup(t.tipo)
      if (g === 'ingreso') ingresos += Math.abs(t.amount)
      else if (g === 'gasto') gastos += Math.abs(t.amount)
    }
    return { ingresos, gastos, balance: ingresos - gastos }
  }, [liveTxns])

  // ── Gastos por categoría (top 6) ────────────────
  const gastosPorCat = useMemo<BarEntry[]>(() => {
    const acc: Record<string, number> = {}
    for (const t of liveTxns ?? []) {
      if (txnGroup(t.tipo) === 'gasto')
        acc[t.cat] = (acc[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(acc)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [liveTxns])

  // ── Ingresos por tipo (top 6) ───────────────────
  const ingresosPorTipo = useMemo<BarEntry[]>(() => {
    const acc: Record<string, number> = {}
    for (const t of liveTxns ?? []) {
      if (txnGroup(t.tipo) === 'ingreso')
        acc[t.tipo] = (acc[t.tipo] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(acc)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [liveTxns])

  // ── Top 5 individual gastos ─────────────────────
  const topGastosTxns = useMemo(() => {
    return (liveTxns ?? [])
      .filter(t => txnGroup(t.tipo) === 'gasto')
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5)
  }, [liveTxns])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 32 }}>
      <AppHeader title="Análisis" back />

      {/* ── Month selector ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 16px 4px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {MONTHS_6.map(m => {
          const isActive = m.id === mesActivo
          return (
            <button
              key={m.id}
              onClick={() => setMesActivo(m.id)}
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
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

      {/* ── Loading ── */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-mute)', fontSize: 13, padding: 40 }}>
          Cargando análisis…
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 0' }}>

          {/* ── KPI row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {([
              { label: 'Ingresos', value: kpis.ingresos, color: 'var(--pos)' },
              { label: 'Gastos',   value: kpis.gastos,   color: 'var(--neg)' },
              { label: 'Balance',  value: kpis.balance,  color: kpis.balance >= 0 ? 'var(--pos)' : 'var(--neg)' },
            ] as const).map(k => (
              <div key={k.label} style={{
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 12, padding: '10px 10px 8px',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 5 }}>
                  {k.label}
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: k.color }}>
                  {k.label === 'Balance' && kpis.balance >= 0 ? '+' : ''}{fmt(k.value)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Gastos por categoría ── */}
          <Card>
            <SLabel>Gastos por categoría — {mesLabel(mesActivo)}</SLabel>
            <BarChart data={gastosPorCat} color="var(--neg)" />
          </Card>

          {/* ── Ingresos por tipo ── */}
          <Card>
            <SLabel>Ingresos por tipo — {mesLabel(mesActivo)}</SLabel>
            <BarChart data={ingresosPorTipo} color="var(--pos)" />
          </Card>

          {/* ── Top gastos individuales ── */}
          <Card>
            <SLabel>Top gastos — {mesLabel(mesActivo)}</SLabel>
            {topGastosTxns.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '10px 0' }}>
                Sin gastos registrados
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topGastosTxns.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      alignItems: 'center', gap: 10,
                      padding: '10px 0',
                      borderBottom: i < topGastosTxns.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.desc}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 4 }}>
                        <span>{t.cat}</span>
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
