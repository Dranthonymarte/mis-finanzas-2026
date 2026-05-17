import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import CatIcon, { catColor } from '../../components/ui/CatIcon'
import { useConfig } from '../../hooks/useConfig'
import { useFormat } from '../../hooks/useFormat'
import { useTransactions } from '../../hooks/useTransactions'
import { txnGroup } from '../../data/mock'
import { currentMes } from '../../lib/mes'

const inputSt: React.CSSProperties = {
  width: '80px', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '6px 10px', fontSize: 14, fontWeight: 600,
  color: 'var(--fg)', outline: 'none', textAlign: 'right',
}

export default function Budgets() {
  const { fmt }                  = useFormat()
  const { config, updateConfig } = useConfig()
  const { transactions }         = useTransactions(currentMes())
  const [editCat, setEditCat]    = useState<string | null>(null)
  const [editVal, setEditVal]    = useState('')

  // Sum gastos per cat this month
  const spentByCat: Record<string, number> = {}
  for (const t of transactions ?? []) {
    if (txnGroup(t.tipo) === 'gasto') {
      spentByCat[t.cat] = (spentByCat[t.cat] ?? 0) + Math.abs(t.amount)
    }
  }

  // Cats that have a budget set
  const budgetCats = Object.keys(config.presupuestos)

  // All expense cats that don't have a budget yet
  const expenseCats = config.categorias['Gasto'] ?? []
  const noBudgetCats = expenseCats.filter(c => !config.presupuestos[c])

  async function saveBudget(cat: string, value: number) {
    if (value <= 0) return
    const next = { ...config.presupuestos, [cat]: value }
    await updateConfig('presupuestos', next)
    setEditCat(null)
  }

  async function removeBudget(cat: string) {
    const next = { ...config.presupuestos }
    delete next[cat]
    await updateConfig('presupuestos', next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Presupuestos" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {budgetCats.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Sin presupuestos configurados
          </div>
        )}

        {budgetCats.map(cat => {
          const limit  = config.presupuestos[cat]
          const spent  = spentByCat[cat] ?? 0
          const pct    = Math.min(100, (spent / limit) * 100)
          const over   = spent > limit
          const color  = catColor(cat)
          const isEdit = editCat === cat

          return (
            <div key={cat} style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <CatIcon cat={cat} size={32} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat}</span>
                {isEdit ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>$</span>
                    <input
                      type="number" value={editVal} autoFocus
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveBudget(cat, parseFloat(editVal)) }}
                      style={inputSt}
                    />
                    <button
                      onClick={() => saveBudget(cat, parseFloat(editVal))}
                      style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--amber)', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{ fontSize: 12, color: over ? 'var(--neg)' : 'var(--fg-mute)', cursor: 'pointer' }}
                      onClick={() => { setEditCat(cat); setEditVal(String(limit)) }}
                    >
                      {fmt(spent)} / {fmt(limit)}
                    </span>
                    <button
                      onClick={() => removeBudget(cat)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(214,106,90,.1)', border: 'none', color: 'var(--neg)', fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: over ? 'var(--neg)' : color,
                  borderRadius: 3, transition: 'width .4s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: over ? 'var(--neg)' : 'var(--fg-mute)', marginTop: 5, textAlign: 'right' }}>
                {over ? `Excedido ${fmt(spent - limit)}` : `${fmt(limit - spent)} restante`}
              </div>
            </div>
          )
        })}

        {/* Add budget for cats without one */}
        {noBudgetCats.length > 0 && (
          <>
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 8 }}>
              Sin presupuesto
            </div>
            {noBudgetCats.map(cat => (
              <div key={cat} style={{
                background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
                borderRadius: 14, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <CatIcon cat={cat} size={30} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--fg-dim)' }}>{cat}</span>
                <button
                  onClick={() => { setEditCat(cat); setEditVal('') }}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-dim)', cursor: 'pointer',
                  }}
                >
                  + Límite
                </button>
              </div>
            ))}
          </>
        )}

        {editCat && !budgetCats.includes(editCat) && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--amber)',
            borderRadius: 14, padding: '13px 14px',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{editCat}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>$</span>
            <input
              type="number" value={editVal} autoFocus
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveBudget(editCat, parseFloat(editVal)) }}
              style={inputSt}
            />
            <button
              onClick={() => saveBudget(editCat, parseFloat(editVal))}
              style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--amber)', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}
            >
              OK
            </button>
            <button
              onClick={() => setEditCat(null)}
              style={{ padding: '6px 8px', borderRadius: 8, background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-mute)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
