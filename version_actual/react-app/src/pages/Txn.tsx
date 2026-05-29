// ═══════════════════════════════════════════════════
// Txn — Movimientos dashboard (BLOQUE 3)
// Mes desde prefs store · Cierre · Filtros · Donut
// Presupuesto vs real · Recurrentes
// ═══════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import CatIcon from '../components/ui/CatIcon'
import { catColor } from '../components/ui/catColor'
import Sheet from '../components/ui/Sheet'
import { txnGroup, type Transaction } from '../data/mock'
import { useFormat } from '../hooks/useFormat'
import { useTransactions } from '../hooks/useTransactions'
import { useConfig }       from '../hooks/useConfig'
import { usePrefsStore }   from '../store/prefs'
import { FilterIcon, LockIcon, SearchIcon } from '../components/icons/Icons'
import { calcKPIs } from '../lib/finance'
import { generateMesesByYear, mesLabel } from '../lib/mes'
import { useTasas } from '../hooks/useTasas'

const MONTHS_BY_YEAR = generateMesesByYear(14)

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
  const { fmt }  = useFormat()
  const { tasas } = useTasas()
  const moneda   = usePrefsStore(s => s.moneda)
  const ocultarMontos = usePrefsStore(s => s.ocultarMontos)
  const group = txnGroup(t.tipo)
  const isInc = group === 'ingreso'
  const isSav = group === 'ahorro'
  const isTrf = t.tipo === 'Transferencia Interna'
  const color = isInc ? 'var(--pos)' : isSav || isTrf ? 'var(--info)' : 'var(--neg)'
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
          {t.cat && <span>{t.cat}</span>}
          {t.cat && t.time && <span>·</span>}
          {t.time && <span>{t.time}</span>}
          {t.author && (
            <span style={{
              display: 'inline-flex', width: 14, height: 14, borderRadius: '50%',
              background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
              color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {t.author === 'isabel' ? 'I' : 'A'}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
          {fmt(Math.abs(t.amount))}
        </div>
        {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && t.amount !== 0 && (
          <div style={{ fontSize: 10, color: 'var(--fg-dim)', fontWeight: 500, whiteSpace: 'nowrap', marginTop: 1 }}>
            ≈ Bs {(Math.abs(t.amount) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </div>
        )}
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
        {inc > 0 && <span style={{ color: 'var(--pos)' }}>{fmt(inc)}</span>}
        {exp > 0 && <span style={{ color: 'var(--neg)' }}>{fmt(exp)}</span>}
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
        {fmt(Math.abs(t.amount))}
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
  const moneda          = usePrefsStore(s => s.moneda)
  const ocultarMontos   = usePrefsStore(s => s.ocultarMontos)
  const activeYear      = activeMes.split('-')[1]
  const { tasas }       = useTasas()

  const [filter,        setFilter]        = useState<FilterType>('all')
  const [closed,        setClosed]        = useState<Set<string>>(loadClosed)
  const [showFilters,   setShowFilters]   = useState(false)
  const [confirmClose,  setConfirmClose]  = useState(false)
  const [addingBudget,   setAddingBudget]   = useState(false)
  const [budgetCat,      setBudgetCat]      = useState('')
  const [budgetAmt,      setBudgetAmt]      = useState('')
  const [showBudgetInfo, setShowBudgetInfo] = useState(false)
  const monthsRef = useRef<HTMLDivElement>(null)

  const isClosed = closed.has(activeMes)
  const { transactions: liveTxns } = useTransactions(activeMes)
  const { config, updateConfig }   = useConfig()

  // Scroll active month chip into view on mount
  useEffect(() => {
    const el = monthsRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeMes])

  function toggleClosed() {
    // Reopening a closed month: no confirmation needed
    if (isClosed) {
      const next = new Set(closed)
      next.delete(activeMes)
      setClosed(next)
      saveClosed(next)
    } else {
      // Closing a month: ask for confirmation first
      setConfirmClose(true)
    }
  }

  function confirmCloseMonth() {
    const next = new Set(closed)
    next.add(activeMes)
    setClosed(next)
    saveClosed(next)
    setConfirmClose(false)
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

  const kpis     = calcKPIs(txnsForMonth, config.tipos)
  const income   = kpis.ingresos
  const expenses = kpis.gastos

  // ── Presupuesto vs real ──
  const spentByCat: Record<string, number> = {}
  for (const t of txnsForMonth) {
    if (txnGroup(t.tipo) === 'gasto')
      spentByCat[t.cat] = (spentByCat[t.cat] ?? 0) + Math.abs(t.amount)
  }
  const budgetCats = Object.keys(config.presupuestos)

  // Categories without a budget (for the picker)
  const NON_BUDGET_TIPOS = new Set(['Ahorro en efectivo', 'Transferencia Interna', 'Prestamo pagado', 'Ajuste'])
  const expenseCats = [...new Set([
    ...config.tipos
      .filter(t => !t.esIngreso && !NON_BUDGET_TIPOS.has(t.nombre))
      .flatMap(t => config.categorias[t.nombre] ?? []),
    ...Object.keys(spentByCat),
  ])]
  const noBudgetCats = expenseCats.filter(c => !config.presupuestos[c])

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
    <div style={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

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
        {/* Buscar */}
        <button
          onClick={() => navigate('/buscar')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center',
            color: 'var(--fg-dim)', cursor: 'pointer',
          }}
          aria-label="Buscar"
        >
          <SearchIcon />
        </button>
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

      {/* ── Month selector (agrupado por año) ── */}
      {/* Year pills */}
      <div style={{ display: 'flex', gap: 6, padding: '2px 16px 4px' }}>
        {MONTHS_BY_YEAR.map(yg => {
          const isActiveYear = yg.year === activeYear
          return (
            <button
              key={yg.year}
              onClick={() => {
                const last = yg.months[yg.months.length - 1]
                setMesActivo(last.id)
                setFilter('all')
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
      {/* Month pills (filtered by active year) */}
      <div
        ref={monthsRef}
        style={{
          display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {(MONTHS_BY_YEAR.find(yg => yg.year === activeYear)?.months ?? []).map(m => {
          const isActive   = m.id === activeMes
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
          { label: 'Entradas', rawUSD: income,            color: 'var(--pos)' },
          null,
          { label: 'Salidas',  rawUSD: expenses,          color: 'var(--neg)' },
          null,
          { label: 'Neto',     rawUSD: income - expenses, color: 'var(--fg)' },
        ].map((col, i) =>
          col === null
            ? <div key={i} style={{ background: 'var(--line)', width: 1, margin: '10px 0' }} />
            : (
              <div key={col.label} style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {col.label}
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 700, color: col.color }}>
                  {fmt(col.rawUSD)}
                </div>
                {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && col.rawUSD !== 0 && (
                  <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', marginTop: 2, fontWeight: 500 }}>
                    ≈ {(Math.abs(col.rawUSD) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                  </div>
                )}
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

      {/* ── Presupuesto vs real (siempre visible) ── */}
      {(
        <div style={{ padding: '20px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
                Presupuesto vs real
              </div>
              <button
                onClick={() => setShowBudgetInfo(v => !v)}
                style={{
                  background: showBudgetInfo ? 'var(--amber)' : 'var(--ink-3)',
                  border: '1px solid var(--line)', borderRadius: '50%',
                  cursor: 'pointer', padding: 0, lineHeight: 1,
                  color: showBudgetInfo ? 'var(--ink-0)' : 'var(--fg-dim)',
                  fontSize: 10, fontWeight: 700,
                  width: 16, height: 16,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Info presupuesto"
              >ℹ</button>
            </div>
            <button
              onClick={() => setAddingBudget(v => !v)}
              style={{
                fontSize: 11, fontWeight: 700, color: addingBudget ? 'var(--fg-mute)' : 'var(--amber)',
                background: addingBudget ? 'var(--ink-3)' : 'rgba(224,168,74,.1)',
                border: addingBudget ? '1px solid var(--line)' : '1px solid rgba(224,168,74,.25)',
                borderRadius: 8, padding: '3px 10px', cursor: 'pointer',
              }}
            >
              {addingBudget ? '✕ Cancelar' : '+ Agregar'}
            </button>
          </div>

          {showBudgetInfo && (
            <div style={{ background: 'rgba(224,168,74,.07)', border: '1px solid rgba(224,168,74,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
              Compara cuánto planificaste gastar por categoría vs lo que realmente gastaste este mes. Verde = dentro del límite, amarillo = cerca, rojo = excedido.
            </div>
          )}

          {addingBudget && (
            <div style={{ background: 'var(--ink-2)', border: '1px solid rgba(224,168,74,.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
                {budgetCat ? `Límite para ${budgetCat}` : 'Selecciona una categoría'}
              </div>

              {/* Step 1: Category picker */}
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

              {/* Step 2: Amount input (after category selected) */}
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
                      style={{ width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px 9px 22px', fontSize: 13, color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' as const }}
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
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {budgetCats.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 12 }}>
                Sin presupuestos — toca "+ Agregar" para crear uno.
              </div>
            )}
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

      {/* ── Close month confirmation sheet ── */}
      <Sheet open={confirmClose} onClose={() => setConfirmClose(false)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: 'rgba(224,168,74,.12)', border: '1px solid rgba(224,168,74,.3)',
            display: 'grid', placeItems: 'center', fontSize: 22,
          }}>
            🔒
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            ¿Cerrar {monthLabel}?
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-mute)', marginBottom: 20, lineHeight: 1.5 }}>
            El mes quedará marcado como cerrado. Aún podrás verlo y reabrirlo después.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setConfirmClose(false)}
              style={{
                flex: 1, padding: '13px', borderRadius: 13,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmCloseMonth}
              style={{
                flex: 1, padding: '13px', borderRadius: 13,
                background: 'var(--amber)', border: 'none',
                fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer',
              }}
            >
              Cerrar mes
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
