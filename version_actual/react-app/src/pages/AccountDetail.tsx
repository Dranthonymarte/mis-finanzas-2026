// ═══════════════════════════════════════════════════
// AccountDetail — /accounts/:id  (BLOQUE 4)
// Real data: useAccounts + useTransactions filtered by cuenta_id
// Sparkline · stats · txn list · transfer · delete
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sparkline from '../components/ui/Sparkline'
import Pill     from '../components/ui/Pill'
import CatIcon  from '../components/ui/CatIcon'
import { ArrowLeftIcon, TransferIcon, EditIcon, TrashIcon } from '../components/icons/Icons'
import { txnGroup, type Transaction } from '../data/mock'
import { useAccounts }     from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { useFormat }       from '../hooks/useFormat'
import { usePrefsStore }   from '../store/prefs'
import { useAuthStore }    from '../store/auth'
import { supabase }        from '../lib/supabase'

type TxnFilter = 'all' | 'ingresos' | 'gastos'

/* ── Section label ── */
function SLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
      textTransform: 'uppercase', color: 'var(--fg-mute)',
      padding: '18px 0 8px',
    }}>
      {children}
    </div>
  )
}

/* ── Transaction row ── */
function TxnRow({ t, last }: { t: Transaction; last: boolean }) {
  const { fmt } = useFormat()
  const grp      = txnGroup(t.tipo)
  const isInc    = grp === 'ingreso'
  const isSav    = grp === 'ahorro'
  const color    = isInc ? 'var(--pos)' : isSav ? 'var(--info)' : 'var(--fg)'
  const sign     = isInc ? '+' : '−'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '11px 12px',
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
          <span>{t.date}</span>
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

export default function AccountDetail() {
  const { id }        = useParams<{ id: string }>()
  const navigate      = useNavigate()
  const { fmt }       = useFormat()
  const householdId   = useAuthStore(s => s.householdId)

  const mesActivo = usePrefsStore(s => s.mesActivo)

  const [filter,        setFilter]        = useState<TxnFilter>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [movSum,        setMovSum]        = useState<number | null>(null)

  const { accounts } = useAccounts()
  const { transactions: liveTxns } = useTransactions(mesActivo)

  const acc = accounts?.find(a => a.id === id) ?? null

  useEffect(() => {
    // Redirect only after accounts loaded and account not found
    if (accounts !== null && !acc) navigate(-1)
  }, [accounts, acc, navigate])

  // ── Balance real: saldo_inicial + sum(all movimientos for this account) ──
  // Skip if balance_override is set (manually reconciled value takes precedence)
  useEffect(() => {
    if (!id || !householdId || !acc || acc.balanceOverride != null) return
    supabase
      .from('movimientos')
      .select('amount')
      .eq('cuenta_id', id)
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .then(({ data }) => {
        const sum = (data ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0)
        setMovSum(sum)
      })
  }, [id, householdId, acc?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  // If balance_override is set → use it. Otherwise saldo_inicial + sum(all movs)
  const realBalance = acc
    ? (acc.balanceOverride != null ? acc.balanceOverride : (acc.saldoInicial ?? 0) + (movSum ?? 0))
    : 0

  if (!acc) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Cargando…</div>
      </div>
    )
  }

  // ── Transactions for this account this month ──
  const allAccTxns: Transaction[] = (liveTxns ?? []).filter(t => t.accountId === id)

  const filtered: Transaction[] = filter === 'all'
    ? allAccTxns
    : filter === 'ingresos'
      ? allAccTxns.filter(t => txnGroup(t.tipo) === 'ingreso')
      : allAccTxns.filter(t => txnGroup(t.tipo) === 'gasto')

  const groups = filtered.reduce<Record<string, Transaction[]>>((g, t) => {
    if (!g[t.date]) g[t.date] = []
    g[t.date].push(t)
    return g
  }, {})

  const monthIncome  = allAccTxns.filter(t => txnGroup(t.tipo) === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const monthExpense = allAccTxns.filter(t => txnGroup(t.tipo) === 'gasto').reduce((s, t) => s + Math.abs(t.amount), 0)
  const monthNet     = monthIncome - monthExpense

  /* ── Styles ── */
  const chipSt = (active: boolean): CSSProperties => ({
    padding: '5px 13px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
    background: active ? 'var(--amber)' : 'var(--ink-2)',
    color:      active ? 'var(--ink-0)' : 'var(--fg-mute)',
    border:     active ? 'none' : '1px solid var(--line)',
    cursor: 'pointer',
  })

  const labelSt: CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 4,
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 12px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'var(--ink-1)', position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
          }}
        >
          <ArrowLeftIcon />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>{acc.name}</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: acc.color, marginTop: 3 }}>
            {acc.type}
          </div>
        </div>

        <button
          onClick={() => {/* edit account — future */}}
          aria-label="Editar cuenta"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
          }}
        >
          <EditIcon />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ── Hero card ── */}
        <div style={{ padding: '14px 16px 12px' }}>
          <div style={{
            borderRadius: 18,
            background: `radial-gradient(ellipse at 88% 12%, ${acc.color}2e 0%, transparent 58%), var(--ink-2)`,
            border: `1px solid ${acc.color}30`,
            padding: '18px 16px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: acc.color }}>
                Balance actual
              </div>
              <Pill tone="mute" size="xs">{acc.currency}</Pill>
            </div>

            <div className="num" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.02em', color: acc.color }}>
              {movSum === null && acc.balanceOverride == null
                ? <span style={{ opacity: .5 }}>{fmt(acc.balance)}</span>
                : fmt(realBalance)}
            </div>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Sparkline data={acc.spark} color={acc.color} w={160} h={26} fill stroke={1.6} />
              <div style={{ fontSize: 12, fontWeight: 600, color: acc.trend >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                {acc.trend >= 0 ? '▲' : '▼'} {Math.abs(acc.trend)}% este mes
              </div>
            </div>
          </div>
        </div>

        {/* ── Month stats 3-col ── */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
          }}>
            {[
              { key: 'ing',  label: 'Ingresos', value: fmt(monthIncome),              color: 'var(--pos)', prefix: '+' },
              { key: 'sep1', label: '',          value: '',                            color: '', prefix: '' },
              { key: 'gas',  label: 'Gastos',   value: fmt(monthExpense),             color: 'var(--neg)', prefix: '−' },
              { key: 'sep2', label: '',          value: '',                            color: '', prefix: '' },
              { key: 'net',  label: 'Neto',     value: fmt(Math.abs(monthNet)),       color: monthNet >= 0 ? 'var(--pos)' : 'var(--neg)', prefix: monthNet >= 0 ? '+' : '−' },
            ].map(col =>
              col.label === '' ? (
                <div key={col.key} style={{ background: 'var(--line)', margin: '10px 0' }} />
              ) : (
                <div key={col.key} style={{ padding: '12px 10px', textAlign: 'center' }}>
                  <div style={labelSt}>{col.label}</div>
                  <div className="num" style={{ fontSize: 13.5, fontWeight: 700, color: col.color }}>
                    {col.prefix}{col.value}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Txn filter + list ── */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SLabel>Movimientos</SLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'ingresos', 'gastos'] as TxnFilter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={chipSt(filter === f)}>
                  {f === 'all' ? 'Todos' : f === 'ingresos' ? 'Entrada' : 'Salida'}
                </button>
              ))}
            </div>
          </div>

          {Object.keys(groups).length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>
              Sin movimientos en esta cuenta
            </div>
          ) : (
            Object.entries(groups).map(([date, txns]) => (
              <div key={date} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6,
                }}>
                  {date}
                </div>
                <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                  {txns.map((t, i) => (
                    <TxnRow key={t.id} t={t} last={i === txns.length - 1} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Transfer ── */}
        <div style={{ padding: '4px 16px 0' }}>
          <button
            onClick={() => navigate('/transfer')}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: `${acc.color}16`, border: `1px solid ${acc.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: acc.color, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <TransferIcon />
            Transferir fondos
          </button>
        </div>

        {/* ── Danger zone ── */}
        <div style={{ padding: '12px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%', padding: '13px', borderRadius: 14,
                background: 'transparent', border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: 'var(--neg)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <TrashIcon />
              Eliminar cuenta
            </button>
          ) : (
            <div style={{
              background: 'rgba(214,106,90,.08)', border: '1px solid rgba(214,106,90,.3)',
              borderRadius: 14, padding: '16px',
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--neg)', textAlign: 'center', marginBottom: 6 }}>
                ¿Eliminar "{acc.name}"?
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
                Se archivará la cuenta. Los movimientos existentes no se perderán.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                    background: 'var(--ink-2)', border: '1px solid var(--line)',
                    color: 'var(--fg-dim)', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => navigate('/accounts')}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                    background: 'var(--neg)', border: 'none', color: '#fff', cursor: 'pointer',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
