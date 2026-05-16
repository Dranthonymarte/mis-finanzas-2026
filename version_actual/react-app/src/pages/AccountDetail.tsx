// ═══════════════════════════════════════════════════
// AccountDetail — /accounts/:id
// Full screen, no TabBar. Back → navigate(-1).
// Bloque 2. Checkpoint C: replace mock with Supabase hooks.
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sparkline from '../components/ui/Sparkline'
import Pill     from '../components/ui/Pill'
import CatIcon  from '../components/ui/CatIcon'
import { ArrowLeftIcon, TransferIcon, EditIcon, TrashIcon } from '../components/icons/Icons'
import { type Transaction, MOCK_ACCOUNTS, MOCK_TRANSACTIONS, fmt, txnGroup } from '../data/mock'

/* ── Types ─────────────────────────────────────── */
type TxnFilter = 'all' | 'ingresos' | 'gastos'

/* ── Section label ──────────────────────────────── */
function SLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
      textTransform: 'uppercase', color: 'var(--fg-mute)',
      padding: '18px 16px 8px',
    }}>
      {children}
    </div>
  )
}

/* ── Transaction row ────────────────────────────── */
function TxnRow({ t, last }: { t: Transaction; last: boolean }) {
  const grp      = txnGroup(t.tipo)
  const isIncome = grp === 'ingreso'
  const isAhorro = grp === 'ahorro'
  const color    = isIncome ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--fg)'
  const sign     = isIncome ? '+' : '−'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '11px 12px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {t.desc}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
          <span>{t.cat}</span>
          <span>·</span>
          <span>{t.time}</span>
          <span>·</span>
          <span style={{
            display: 'inline-flex', width: 14, height: 14, borderRadius: '50%',
            background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
            color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {t.author === 'isabel' ? 'I' : 'A'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {sign}{fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════ */
export default function AccountDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [filter,        setFilter]        = useState<TxnFilter>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const acc = MOCK_ACCOUNTS.find(a => a.id === id)

  useEffect(() => {
    if (!acc) navigate(-1)
  }, [acc, navigate])

  if (!acc) return null

  /* ── Derived data ─────────────────────────── */
  const allTxns = MOCK_TRANSACTIONS.filter(t => t.accountId === id)

  const filtered: Transaction[] = filter === 'all'
    ? allTxns
    : filter === 'ingresos'
      ? allTxns.filter(t => t.amount > 0)
      : allTxns.filter(t => t.amount < 0)

  const groups = filtered.reduce<Record<string, Transaction[]>>((g, t) => {
    if (!g[t.date]) g[t.date] = []
    g[t.date].push(t)
    return g
  }, {})

  const monthIncome  = allTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const monthExpense = allTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const monthNet     = monthIncome - monthExpense

  const displayBalance = acc.currency === 'USD'
    ? fmt(acc.balance)
    : `Bs ${acc.balance.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`

  /* ── Styles ───────────────────────────────── */
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

  /* ── Render ───────────────────────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ──────────────────────────── */}
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
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)',
          }}
        >
          <ArrowLeftIcon />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>{acc.name}</div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: acc.color, marginTop: 3,
          }}>
            {acc.type}
          </div>
        </div>

        <button
          onClick={() => { /* TODO Bloque 4: edit account */ }}
          aria-label="Editar cuenta"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)',
          }}
        >
          <EditIcon />
        </button>
      </div>

      {/* ── Scrollable content ───────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* Hero card */}
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

            <div className="num" style={{
              fontSize: 36, fontWeight: 700, letterSpacing: '-.02em', color: acc.color,
            }}>
              {displayBalance}
            </div>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Sparkline data={acc.spark} color={acc.color} w={160} h={26} fill stroke={1.6} />
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: acc.trend >= 0 ? 'var(--pos)' : 'var(--neg)',
              }}>
                {acc.trend >= 0 ? '▲' : '▼'} {Math.abs(acc.trend)}% este mes
              </div>
            </div>
          </div>
        </div>

        {/* Month stats 3-col */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
          }}>
            <div style={{ padding: '12px 10px', textAlign: 'center' }}>
              <div style={labelSt}>Ingresos</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--pos)' }}>
                +{fmt(monthIncome)}
              </div>
            </div>

            <div style={{ background: 'var(--line)' }} />

            <div style={{ padding: '12px 10px', textAlign: 'center' }}>
              <div style={labelSt}>Gastos</div>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--neg)' }}>
                {fmt(monthExpense)}
              </div>
            </div>

            <div style={{ background: 'var(--line)' }} />

            <div style={{ padding: '12px 10px', textAlign: 'center' }}>
              <div style={labelSt}>Neto</div>
              <div className="num" style={{
                fontSize: 14, fontWeight: 700,
                color: monthNet >= 0 ? 'var(--pos)' : 'var(--neg)',
              }}>
                {monthNet >= 0 ? '+' : '−'}{fmt(Math.abs(monthNet))}
              </div>
            </div>
          </div>
        </div>

        {/* Txn section header + filter */}
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SLabel>Movimientos</SLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'ingresos', 'gastos'] as TxnFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={chipSt(filter === f)}>
                {f === 'all' ? 'Todos' : f === 'ingresos' ? 'Entrada' : 'Salida'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        {Object.keys(groups).length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13 }}>
            No hay movimientos en esta cuenta
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {Object.entries(groups).map(([date, txns]) => (
              <div key={date} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6,
                }}>
                  {date}
                </div>
                <div style={{
                  background: 'var(--ink-2)', border: '1px solid var(--line)',
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  {txns.map((t, i) => (
                    <TxnRow key={t.id} t={t} last={i === txns.length - 1} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transfer action */}
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

        {/* Danger zone */}
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
              background: 'rgba(214,106,90,.08)',
              border: '1px solid rgba(214,106,90,.3)',
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
                  onClick={() => {
                    // TODO Checkpoint C: supabase update activa=false
                    console.log('[AccountDetail] delete', acc.id)
                    navigate('/accounts')
                  }}
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
