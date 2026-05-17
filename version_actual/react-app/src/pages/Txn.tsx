// ═══════════════════════════════════════════════════
// Txn — Movimientos dashboard (BLOQUE 3)
// Mes desde prefs store · Cierre · Filtros · Donut
// Presupuesto vs real · Recurrentes
// ═══════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { txnGroup, type Transaction } from '../data/mock'
import { useFormat } from '../hooks/useFormat'
import { useTransactions } from '../hooks/useTransactions'
import { useConfig }       from '../hooks/useConfig'
import { usePrefsStore }   from '../store/prefs'
import { FilterIcon, LockIcon } from '../components/icons/Icons'
import { generateMeses, mesLabel } from '../lib/mes'

const MONTHS = generateMeses(12)

const LS_CLOSED = 'mis_finanzas_closed_months'

function loadClosed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_CLOSED) || '[]') as string[]) }
  catch { return new Set() }
}
function saveClosed(s: Set<string>) {
  localStorage.setItem(LS_CLOSED, JSON.stringify([...s]))
}

/* ── Donut chart tooltip ── */
function CatTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: { cat: string; value: number; fill: string } }>
}) {
  const { fmt } = useFormat()
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--ink-3)', border: '1px solid var(--line)',
      borderRadius: 10, padding: '8px 12px', fontSize: 11.5,
    }}>
      <div style={{ color: 'var(--fg-mute)', fontSize: 10, marginBottom: 4 }}>{d.cat}</div>
      <div style={{ color: d.fill, fontWeight: 700 }}>{fmt(d.value)}</div>
    </div>
  )
}

type FilterType = 'all' | 'gasto' | 'ingreso' | 'ahorro'

/* ── TxnRow ── */
function TxnRow({ t, last, onTap }: { t: Transaction; last: boolean; onTap: () => void }) {
  const { fmt } = useFormat()
  const group = txnGroup(t.tipo)
  const isInc = group === 'ingreso'
  const isSav = group === 'ahorro'
  const color = isInc ? 'var(--pos)' : isSav ? 'var(--info)' : 'var(--fg)'
  const sign  = isInc ? '+' : '−'
  return (
    <div
      onClick={onTap}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
        alignItems: 'center', padding: '11px 14px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
        cursor: 'pointer',
      }}
    >
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          {t.desc}
          {t.recurrente && (
            <span style={{ fontSize: 9, color: 'var(--amber)', background: 'rgba(224,168,74,.12)', border: '1px solid rgba(224,168,74,.25)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '.04em' }}>REC</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
          <span>{t.cat}</span>
          <span>·</span>
          <span>{t.time}</span>
          {t.author && (
            <>
              <span>·</span>
              <span style={{
                display: 'inline-flex', width: 14, height: 14, borderRadius: '50%',
                background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
                color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {t.author === 'isabel' ? 'I' : 'A'}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {sign}{fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

/* ── Date group header ── */
function DateHeader({ date, txns }: { date: string; txns: Transaction[] }) {
  const { fmt } = useFormat()
  const inc = txns.filter(t => txnGroup(t.tipo) === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const exp = txns.filter(t => txnGroup(t.tipo) === 'gasto').reduce((s, t) => s + Math.abs(t.amount), 0)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px 6px' }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-dim)' }}>{date}</span>
      <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
        {inc > 0 && <span style={{ color: 'var(--pos)' }}>+{fmt(inc)}</span>}
        {exp > 0 && <span style={{ color: 'var(--neg)' }}>−{fmt(exp)}</span>}
      </div>
    </div>
  )
}

interface Recurrente {
  id: string; desc: string; cat: string; tipo: string
  amount: number; recDia?: number
}

/* ── Recurrente row (simplified) ── */
function RecRow({ t, last }: { t: Recurrente; last: boolean }) {
  const { fmt } = useFormat()
  const isInc = txnGroup(t.tipo) === 'ingreso'
  const color = isInc ? 'var(--pos)' : 'var(--neg)'
  const sign  = isInc ? '+' : '−'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 8,
      alignItems: 'center', padding: '10px 14px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 1 }}>Día {t.recDia} de cada mes</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {sign}{fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

export default function Txn() {
  const navigate        = useNavigate()
  const { fmt }         = useFormat()
  // ── Mes activo desde prefs store (sincronizado con Home) ──
  const activeMes       = usePrefsStore(s => s.mesActivo)
  const setMesActivo    = usePrefsStore(s => s.setMesActivo)

  const [filter,      setFilter]      = useState<FilterType>('all')
  const [closed,      setClosed]      = useState<Set<string>>(loadClosed)
  const [showFilters, setShowFilters] = useState(false)
  const monthsRef = useRef<HTMLDivElement>(null)

  const isClosed = closed.has(activeMes)
  const { transactions: liveTxns } = useTransactions(activeMes)
  const { config }                 = useConfig()

  // Scroll active month chip into view on mount
  useEffect(() => {
    const el = monthsRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeMes])

  function toggleClosed() {
    const next = new Set(closed)
    if (isClosed) next.delete(activeMes)
    else next.add(activeMes)
    setClosed(next)
    saveClosed(next)
  }

  const txnsForMonth = liveTxns ?? []

  // Recurrentes from config_usuario — map RecurrenteConfig → local Recurrente shape
  const recurring: Recurrente[] = config.recurrentes.map(r => ({
    id:     r.id,
    desc:   r.descripcion,
    cat:    r.cat,
    tipo:   r.tipo,
    amount: r.monto,
    recDia: undefined,
  }))

  const filtered = txnsForMonth.filter(t => {
    if (filter === 'all') return true
    return txnGroup(t.tipo) === filter
  })

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, txn) => {
    ;(acc[txn.date] = acc[txn.date] || []).push(txn)
    return acc
  }, {})

  const monthLabel = mesLabel(activeMes)

  // Top 5 expense categories for donut
  const catData = (() => {
    const totals: Record<string, number> = {}
    txnsForMonth.forEach(t => {
      if (txnGroup(t.tipo) === 'gasto') totals[t.cat] = (totals[t.cat] || 0) + Math.abs(t.amount)
    })
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, value]) => ({ cat, value, fill: catColor(cat) }))
  })()

  const income   = txnsForMonth.filter(t => txnGroup(t.tipo) === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const expenses = txnsForMonth.filter(t => txnGroup(t.tipo) === 'gasto').reduce((s, t) => s + Math.abs(t.amount), 0)

  // ── Presupuesto vs real ──
  const spentByCat: Record<string, number> = {}
  for (const t of txnsForMonth) {
    if (txnGroup(t.tipo) === 'gasto')
      spentByCat[t.cat] = (spentByCat[t.cat] ?? 0) + Math.abs(t.amount)
  }
  const budgetCats = Object.keys(config.presupuestos)

  const LABELS: Record<FilterType, string> = {
    all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos', ahorro: 'Ahorro',
  }

  const COUNTS: Record<FilterType, number> = {
    all:     txnsForMonth.length,
    gasto:   txnsForMonth.filter(t => txnGroup(t.tipo) === 'gasto').length,
    ingreso: txnsForMonth.filter(t => txnGroup(t.tipo) === 'ingreso').length,
    ahorro:  txnsForMonth.filter(t => txnGroup(t.tipo) === 'ahorro').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            {monthLabel}
            {isClosed && (
              <span style={{ fontSize: 9, color: 'var(--amber)', background: 'rgba(224,168,74,.12)', border: '1px solid rgba(224,168,74,.25)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '.06em' }}>
                CERRADO
              </span>
            )}
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginTop: 2 }}>
            Movimientos
          </h1>
        </div>
        {/* Cierre de mes */}
        <button
          onClick={toggleClosed}
          title={isClosed ? 'Reabrir mes' : 'Cerrar mes'}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: isClosed ? 'rgba(224,168,74,.12)' : 'var(--ink-2)',
            border: isClosed ? '1px solid rgba(224,168,74,.35)' : '1px solid var(--line)',
            display: 'grid', placeItems: 'center',
            color: isClosed ? 'var(--amber)' : 'var(--fg-dim)', cursor: 'pointer',
          }}
          aria-label={isClosed ? 'Reabrir mes' : 'Cerrar mes'}
        >
          <LockIcon />
        </button>
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: showFilters ? 'rgba(224,168,74,.12)' : 'var(--ink-2)',
            border: showFilters ? '1px solid rgba(224,168,74,.35)' : '1px solid var(--line)',
            display: 'grid', placeItems: 'center',
            color: showFilters ? 'var(--amber)' : 'var(--fg-dim)', cursor: 'pointer',
          }}
          aria-label="Filtrar"
        >
          <FilterIcon />
        </button>
      </div>

      {/* ── Month selector ── */}
      <div
        ref={monthsRef}
        style={{
          display: 'flex', gap: 6, padding: '2px 16px 12px', overflowX: 'auto',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {MONTHS.map(m => {
          const isActive  = m.id === activeMes
          const isMeClosed = closed.has(m.id)
          return (
            <button
              key={m.id}
              data-active={isActive}
              onClick={() => { setMesActivo(m.id); setFilter('all') }}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                background: isActive ? 'var(--amber)' : 'var(--ink-2)',
                color:      isActive ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     isActive ? 'none' : '1px solid var(--line)',
                position: 'relative',
              }}
            >
              {m.label}
              {isMeClosed && !isActive && (
                <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', border: '1px solid var(--ink-1)' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Summary strip ── */}
      <div style={{
        margin: '0 16px 12px',
        background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
      }}>
        {[
          { label: 'Entradas', value: fmt(income),            color: 'var(--pos)' },
          null,
          { label: 'Salidas',  value: fmt(expenses),          color: 'var(--neg)' },
          null,
          { label: 'Neto',     value: fmt(income - expenses), color: 'var(--fg)' },
        ].map((col, i) =>
          col === null
            ? <div key={i} style={{ background: 'var(--line)', width: 1, margin: '10px 0' }} />
            : (
              <div key={col.label} style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {col.label}
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 700, color: col.color }}>
                  {col.value}
                </div>
              </div>
            )
        )}
      </div>

      {/* ── Top 5 categorías donut ── */}
      {catData.length > 0 && (
        <div style={{ margin: '0 16px 12px' }}>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 14px 12px' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
              Top categorías
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    {catData.map(entry => <Cell key={entry.cat} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CatTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catData.map(entry => (
                  <div key={entry.cat} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--fg-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.cat}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter chips (collapsible) ── */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {(['all', 'gasto', 'ingreso', 'ahorro'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: filter === f ? 'var(--amber)' : 'var(--ink-2)',
                color:      filter === f ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     filter === f ? 'none' : '1px solid var(--line)',
              }}
            >
              {LABELS[f]}
              <span style={{ marginLeft: 5, fontSize: 10.5, color: filter === f ? 'rgba(0,0,0,.45)' : 'var(--fg-mute)' }}>
                {COUNTS[f]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Transaction list ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
        {Object.entries(grouped).map(([date, txns]) => (
          <div key={date}>
            <DateHeader date={date} txns={txns} />
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {txns.map((t, i) => (
                <TxnRow key={t.id} t={t} last={i === txns.length - 1} onTap={() => navigate(`/txn/${t.id}`)} />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', marginTop: 48, fontSize: 13 }}>
            Sin movimientos
          </div>
        )}
      </div>

      {/* ── Presupuesto vs real ── */}
      {budgetCats.length > 0 && (
        <div style={{ padding: '20px 16px 4px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 10 }}>
            Presupuesto vs real
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {budgetCats.map((cat, i) => {
              const limit  = config.presupuestos[cat]
              const spent  = spentByCat[cat] ?? 0
              const pct    = Math.min(100, (spent / limit) * 100)
              const over   = spent > limit
              const color  = catColor(cat)
              const isLast = i === budgetCats.length - 1
              return (
                <div key={cat} style={{
                  padding: '12px 14px',
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
        </div>
      )}

      {/* ── Recurrentes ── */}
      {recurring.length > 0 && (
        <div style={{ padding: '20px 16px 4px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 10 }}>
            Recurrentes este mes
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {recurring.map((t, i) => (
              <RecRow key={t.id} t={t} last={i === recurring.length - 1} />
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
