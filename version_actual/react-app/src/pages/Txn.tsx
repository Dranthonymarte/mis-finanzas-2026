import { useState } from 'react'
import CatIcon from '../components/ui/CatIcon'
import { MOCK_TRANSACTIONS, MOCK_MONTH, fmt, txnGroup } from '../data/mock'
import { FilterIcon, SearchIcon } from '../components/icons/Icons'

type FilterType = 'all' | 'gasto' | 'ingreso' | 'ahorro'

/* ── Counts per filter ── */
const COUNTS: Record<FilterType, number> = {
  all:     MOCK_TRANSACTIONS.length,
  gasto:   MOCK_TRANSACTIONS.filter(t => txnGroup(t.tipo) === 'gasto').length,
  ingreso: MOCK_TRANSACTIONS.filter(t => txnGroup(t.tipo) === 'ingreso').length,
  ahorro:  MOCK_TRANSACTIONS.filter(t => txnGroup(t.tipo) === 'ahorro').length,
}

/* ── TxnRow ── */
function TxnRow({ t, last }: { t: typeof MOCK_TRANSACTIONS[0]; last: boolean }) {
  const group   = txnGroup(t.tipo)
  const isInc   = group === 'ingreso'
  const isSav   = group === 'ahorro'
  const color   = isInc ? 'var(--pos)' : isSav ? 'var(--info)' : 'var(--fg)'
  const sign    = isInc ? '+' : '−'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '11px 14px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.desc}
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
function DateHeader({ date, txns }: { date: string; txns: typeof MOCK_TRANSACTIONS }) {
  const inc = txns.filter(t => txnGroup(t.tipo) === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const exp = txns.filter(t => txnGroup(t.tipo) === 'gasto').reduce((s, t) => s + Math.abs(t.amount), 0)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 4px 6px',
    }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-dim)' }}>{date}</span>
      <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
        {inc > 0 && <span style={{ color: 'var(--pos)' }}>+{fmt(inc)}</span>}
        {exp > 0 && <span style={{ color: 'var(--neg)' }}>−{fmt(exp)}</span>}
      </div>
    </div>
  )
}

export default function Txn() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = MOCK_TRANSACTIONS.filter(t => {
    if (filter === 'all') return true
    return txnGroup(t.tipo) === filter
  })

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, txn) => {
    ;(acc[txn.date] = acc[txn.date] || []).push(txn)
    return acc
  }, {})

  const LABELS: Record<FilterType, string> = {
    all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos', ahorro: 'Ahorro',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Abril 2026
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginTop: 2 }}>
            Movimientos
          </h1>
        </div>
        <button style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
        }} aria-label="Filtrar"><FilterIcon /></button>
        <button style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
        }} aria-label="Buscar"><SearchIcon /></button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{
        margin: '4px 16px 12px',
        background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
      }}>
        {[
          { label: 'Entradas', value: fmt(MOCK_MONTH.income), color: 'var(--pos)' },
          null,
          { label: 'Salidas',  value: fmt(MOCK_MONTH.expenses), color: 'var(--neg)' },
          null,
          { label: 'Neto',     value: fmt(MOCK_MONTH.income - MOCK_MONTH.expenses), color: 'var(--fg)' },
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

      {/* ── Filter chips ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 14px', overflowX: 'auto',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
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
            <span style={{
              marginLeft: 5, fontSize: 10.5,
              color: filter === f ? 'rgba(0,0,0,.45)' : 'var(--fg-mute)',
            }}>
              {COUNTS[f]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Transaction list ── */}
      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column' }}>
        {Object.entries(grouped).map(([date, txns]) => (
          <div key={date}>
            <DateHeader date={date} txns={txns} />
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {txns.map((t, i) => (
                <TxnRow key={t.id} t={t} last={i === txns.length - 1} />
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

    </div>
  )
}
