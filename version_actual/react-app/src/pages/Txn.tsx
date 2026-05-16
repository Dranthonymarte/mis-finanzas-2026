import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { MOCK_TRANSACTIONS, MOCK_MONTH, fmt, txnGroup } from '../data/mock'
import { FilterIcon, SearchIcon } from '../components/icons/Icons'

type FilterType = 'all' | 'gasto' | 'ingreso' | 'ahorro'

export default function Txn() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = MOCK_TRANSACTIONS.filter((t) => {
    if (filter === 'all') return true
    return txnGroup(t.tipo) === filter
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, txn) => {
    const key = txn.date
    ;(acc[key] = acc[key] || []).push(txn)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader
        title="Movimientos"
        sub="este mes"
        large
        right={
          <>
            <button className="m-app-header-icon-btn" aria-label="Filtrar">
              <FilterIcon />
            </button>
            <button className="m-app-header-icon-btn" aria-label="Buscar">
              <SearchIcon />
            </button>
          </>
        }
      />

      {/* Summary card */}
      <div className="m-txn-summary-card" style={{ margin: '0 16px 14px' }}>
        <div className="m-txn-summary-col">
          <div className="m-txn-summary-label">Entradas</div>
          <div className="m-txn-summary-val" style={{ color: 'var(--pos)' }}>{fmt(MOCK_MONTH.income)}</div>
        </div>
        <div className="m-txn-summary-col">
          <div className="m-txn-summary-label">Salidas</div>
          <div className="m-txn-summary-val" style={{ color: 'var(--neg)' }}>{fmt(MOCK_MONTH.expenses)}</div>
        </div>
        <div className="m-txn-summary-col">
          <div className="m-txn-summary-label">Neto</div>
          <div className="m-txn-summary-val">{fmt(MOCK_MONTH.net)}</div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="m-filter-chips-row" style={{ padding: '0 16px 12px' }}>
        {(['all', 'gasto', 'ingreso', 'ahorro'] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`m-filter-chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {{ all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos', ahorro: 'Ahorro' }[f]}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{ flex: 1, padding: '0 16px' }}>
        {Object.entries(grouped).map(([date, txns]) => (
          <div key={date} className="m-txn-date-group">
            <div className="m-txn-date-header">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-VE', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </div>
            <div className="m-txn-group-card">
              {txns.map((txn, idx) => {
                const group = txnGroup(txn.tipo)
                const isIncome = group === 'ingreso'
                const isAhorro = group === 'ahorro'
                const color  = isIncome ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--fg)'
                const prefix = isIncome ? '+' : isAhorro ? '' : '−'
                return (
                  <div
                    key={txn.id}
                    className="m-txn-row"
                    style={{
                      borderBottom: idx < txns.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div
                      className="m-cat-icon"
                      style={{ background: 'var(--ink-3)', fontSize: 16 }}
                    >
                      {isIncome ? '💰' : isAhorro ? '📊' : '🛒'}
                    </div>
                    <div className="m-txn-row-info">
                      <div className="m-txn-row-desc">{txn.desc}</div>
                      <div className="m-txn-row-meta">
                        {txn.cat} · {txn.method}
                        <span className="m-author-dot" />
                        {txn.author}
                      </div>
                    </div>
                    <div className={`m-txn-row-amount${isIncome ? ' pos' : ''}`} style={{ color }}>
                      {prefix}{fmt(txn.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', marginTop: 48, fontSize: 13 }}>
            Sin movimientos en esta categoría
          </div>
        )}
      </div>
    </div>
  )
}
