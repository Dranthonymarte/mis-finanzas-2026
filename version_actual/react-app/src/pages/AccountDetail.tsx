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
import EmptyState from '../components/ui/EmptyState'
import { ArrowLeftIcon, TransferIcon, EditIcon, TrashIcon, CheckIcon } from '../components/icons/Icons'
import { txnGroup, type Transaction } from '../data/mock'
import { useAccounts }     from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { useFormat }       from '../hooks/useFormat'
import { usePrefsStore }   from '../store/prefs'
import { useTasas }        from '../hooks/useTasas'
import { useAuthStore }    from '../store/auth'
import { supabase }        from '../lib/supabase'
import { confirmAction }   from '../store/confirm'

type TxnFilter   = 'all' | 'ingresos' | 'gastos'
type Currency    = 'USD' | 'BS'

const COLORS = [
  { label: 'Verde', value: '#58b26a' },
  { label: 'Azul',  value: '#6a94c4' },
  { label: 'Ámbar', value: '#e0a84a' },
  { label: 'Teal',  value: '#3d8b82' },
  { label: 'Rojo',  value: '#d66a5a' },
  { label: 'Gris',  value: '#9aa0ab' },
]

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

/* ── Transaction row — tappable, navigates to TxnDetail ── */
function TxnRow({ t, last }: { t: Transaction; last: boolean }) {
  const { fmt }  = useFormat()
  const navigate = useNavigate()
  const grp   = txnGroup(t.tipo)
  const isInc = grp === 'ingreso'
  const isSav = grp === 'ahorro'
  const isTrf = t.tipo === 'Transferencia Interna'
  const color = isInc ? 'var(--pos)' : isSav || isTrf ? 'var(--info)' : 'var(--neg)'
  return (
    <div
      onClick={() => navigate(`/txn/${t.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
        alignItems: 'center', padding: '11px 12px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
        cursor: 'pointer',
      }}
    >
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.desc}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
          {t.cat && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.cat}</span>}
          {t.cat && <span style={{ flexShrink: 0 }}>·</span>}
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t.date}</span>
          {t.author && (
            <span style={{
              display: 'inline-flex', width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
              color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {t.author === 'isabel' ? 'I' : 'A'}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

export default function AccountDetail() {
  const { id }        = useParams<{ id: string }>()
  const navigate      = useNavigate()
  const { fmt }       = useFormat()
  const householdId   = useAuthStore(s => s.householdId)
  const { tasas }     = useTasas()

  const mesActivo = usePrefsStore(s => s.mesActivo)

  const [filter,         setFilter]         = useState<TxnFilter>('all')
  const [movSum,         setMovSum]         = useState<number | null>(null)
  const [editingBalance, setEditingBalance] = useState(false)
  const [newBalance,     setNewBalance]     = useState('')
  const [savingBalance,  setSavingBalance]  = useState(false)
  const [editingName,    setEditingName]    = useState(false)
  const [newName,        setNewName]        = useState('')
  const [editMode,       setEditMode]       = useState(false)
  const [editName,       setEditName]       = useState('')
  const [editMoneda,     setEditMoneda]     = useState<Currency>('USD')
  const [editColor,      setEditColor]      = useState('')
  const [editSaldo,      setEditSaldo]      = useState('')
  const [savingEdit,     setSavingEdit]     = useState(false)

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

  async function saveBalance() {
    if (!id) return
    const val = parseFloat(newBalance)
    if (isNaN(val)) return
    setSavingBalance(true)
    await supabase
      .from('cuentas')
      .update({
        balance_override:      val,
        saldo_inicial:         val,
        balance_override_date: new Date().toISOString().slice(0, 10),
      })
      .eq('id', id)
    setSavingBalance(false)
    setEditingBalance(false)
    setMovSum(null)  // force recalc
    window.location.reload()
  }

  async function saveName() {
    if (!id || !newName.trim()) return
    await supabase.from('cuentas').update({ nombre: newName.trim() }).eq('id', id)
    setEditingName(false)
    window.location.reload()
  }

  function openEditMode() {
    setEditName(acc?.name ?? '')
    setEditMoneda((acc?.currency === 'BS' ? 'BS' : 'USD') as Currency)
    setEditColor(acc?.color ?? COLORS[0].value)
    setEditSaldo(String(acc?.saldoInicial ?? 0))
    setEditMode(true)
  }

  async function saveEdit() {
    if (!id || !editName.trim()) return
    setSavingEdit(true)
    await supabase.from('cuentas').update({
      nombre:        editName.trim(),
      moneda:        editMoneda,
      color:         editColor,
      saldo_inicial: parseFloat(editSaldo) || 0,
    }).eq('id', id)
    setSavingEdit(false)
    setEditMode(false)
    window.location.reload()
  }

  async function handleDeleteAccount() {
    if (!id) return
    if (!(await confirmAction({
      title: `Eliminar "${acc?.name ?? 'cuenta'}"`,
      message: 'Se archivará la cuenta. Los movimientos existentes no se perderán.',
      confirmLabel: 'Eliminar',
      danger: true,
    }))) return
    await supabase.from('cuentas').update({ activa: false }).eq('id', id)
    navigate(-1)
  }

  /* ── Styles ── */
  const segSt = (active: boolean): CSSProperties => ({
    padding: '9px 0', flex: 1, borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: active ? 'var(--ink-3)' : 'transparent',
    color:      active ? 'var(--amber)' : 'var(--fg-mute)',
    border:     active ? '1.5px solid rgba(var(--amber-rgb),.27)' : '1px solid transparent',
    transition: 'all .14s',
  })

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

  /* ── Edit mode (same form as NewAccount) ── */
  if (editMode && acc) {
    const trimmed = editName.trim()
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 12px 10px', paddingTop: 'max(12px, env(safe-area-inset-top))',
          background: 'var(--ink-1)', position: 'sticky', top: 0, zIndex: 10,
          borderBottom: '1px solid var(--line)',
        }}>
          <button
            onClick={() => setEditMode(false)}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer' }}
          ><ArrowLeftIcon /></button>
          <div style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>Editar cuenta</div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>{acc.name}</div>
          </div>
          <button
            onClick={() => void saveEdit()}
            disabled={!trimmed || savingEdit}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: trimmed ? 'var(--amber)' : 'var(--ink-3)',
              display: 'grid', placeItems: 'center',
              color: trimmed ? 'var(--ink-0)' : 'var(--fg-mute)',
              cursor: trimmed ? 'pointer' : 'default',
            }}
          ><CheckIcon /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Preview card */}
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{
              borderRadius: 16, padding: '16px 16px 14px',
              background: `radial-gradient(ellipse at 88% 12%, ${editColor}2e 0%, transparent 58%), var(--ink-2)`,
              border: `1px solid ${editColor}30`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: editColor, marginBottom: 4 }}>
                {acc.type}
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 600, color: trimmed ? 'var(--fg)' : 'var(--fg-mute)' }}>
                {trimmed || 'Nombre de la cuenta'}
              </div>
              <div className="num" style={{ fontSize: 28, fontWeight: 700, color: editColor, marginTop: 6, letterSpacing: '-.02em' }}>
                {editMoneda === 'USD' ? '$' : 'Bs '}
                {editSaldo ? parseFloat(editSaldo).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
            </div>
          </div>

          {/* Name */}
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', padding: '18px 16px 8px' }}>Nombre</div>
          <div style={{ padding: '0 16px' }}>
            <input
              type="text" value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="Nombre de la cuenta…" maxLength={40} autoFocus
              style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)', boxSizing: 'border-box' }}
            />
          </div>

          {/* Moneda */}
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', padding: '18px 16px 8px' }}>Moneda</div>
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', gap: 5, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 4 }}>
              {(['USD', 'BS'] as Currency[]).map(c => (
                <button key={c} onClick={() => setEditMoneda(c)} style={segSt(editMoneda === c)}>
                  {c === 'USD' ? '🇺🇸  USD' : '🇻🇪  BS'}
                </button>
              ))}
            </div>
          </div>

          {/* Saldo inicial */}
          <div style={{ height: 1, background: 'var(--line)', margin: '16px 16px 0' }} />
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', padding: '18px 16px 8px' }}>Saldo inicial</div>
          <div style={{ padding: '4px 16px 14px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--f-display)', fontSize: 36, color: editColor, opacity: 0.6, marginRight: 4, lineHeight: 1 }}>
                {editMoneda === 'USD' ? '$' : 'Bs'}
              </span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={editSaldo} onChange={e => setEditSaldo(e.target.value)} placeholder="0.00"
                style={{ fontFamily: 'var(--f-display)', fontSize: 46, lineHeight: 1, color: editColor, background: 'transparent', border: 'none', outline: 'none', width: '6ch', minWidth: '2ch', textAlign: 'left', letterSpacing: '-.02em' } as CSSProperties}
              />
            </div>
          </div>

          {/* Color */}
          <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', padding: '18px 16px 8px' }}>Color</div>
          <div style={{ padding: '0 16px 6px', display: 'flex', gap: 12, alignItems: 'center' }}>
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setEditColor(c.value)} aria-label={c.label}
                style={{ width: 34, height: 34, borderRadius: '50%', background: c.value, border: editColor === c.value ? '3px solid var(--fg)' : '3px solid transparent', outline: editColor === c.value ? `2px solid ${c.value}` : 'none', outlineOffset: 2, transition: 'all .14s', cursor: 'pointer', flexShrink: 0 }}
              />
            ))}
          </div>

          {/* Save CTA */}
          <div style={{ padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
            <button
              onClick={() => void saveEdit()}
              disabled={!trimmed || savingEdit}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: trimmed ? 'var(--amber)' : 'var(--ink-3)',
                fontSize: 15.5, fontWeight: 700,
                color: trimmed ? 'var(--ink-0)' : 'var(--fg-mute)',
                letterSpacing: '.02em',
                boxShadow: trimmed ? '0 4px 20px rgba(var(--amber-rgb),.35)' : 'none',
              }}
            >
              {savingEdit ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    )
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
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{
                  background: 'var(--ink-2)', border: '1px solid var(--amber)',
                  borderRadius: 10, padding: '6px 10px', fontSize: 16,
                  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)',
                  width: 160,
                }}
              />
              <button onClick={() => void saveName()} style={{ background: 'none', border: 'none', color: 'var(--pos)', fontSize: 18, cursor: 'pointer' }}>✓</button>
              <button onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div
              className="font-display"
              style={{ fontSize: 18, lineHeight: 1, cursor: 'pointer' }}
              onClick={() => { setNewName(acc.name); setEditingName(true) }}
            >
              {acc.name}
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: acc.color, marginTop: 3 }}>
            {acc.type}
          </div>
        </div>

        <button
          onClick={() => { setEditingBalance(v => !v); setNewBalance(String(realBalance)) }}
          aria-label="Editar balance"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: editingBalance ? 'rgba(var(--amber-rgb),.12)' : 'var(--ink-2)',
            border: editingBalance ? '1px solid rgba(var(--amber-rgb),.35)' : '1px solid var(--line)',
            display: 'grid', placeItems: 'center',
            color: editingBalance ? 'var(--amber)' : 'var(--fg-dim)', cursor: 'pointer',
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

            {editingBalance && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" inputMode="decimal"
                    value={newBalance}
                    onChange={e => setNewBalance(e.target.value)}
                    placeholder="Nuevo saldo…"
                    style={{
                      flex: 1, background: 'var(--ink-3)', border: '1px solid var(--line)',
                      borderRadius: 10, padding: '8px 12px', fontSize: 14,
                      color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-num)',
                    }}
                  />
                  <button
                    onClick={() => void saveBalance()}
                    disabled={savingBalance}
                    style={{
                      padding: '8px 14px', borderRadius: 10,
                      background: 'var(--amber)', border: 'none',
                      color: 'var(--ink-0)', fontWeight: 700, fontSize: 13,
                      cursor: savingBalance ? 'default' : 'pointer', opacity: savingBalance ? 0.6 : 1,
                    }}
                  >
                    Guardar
                  </button>
                </div>
                {(() => {
                  const val = parseFloat(newBalance)
                  if (!isNaN(val) && val > 0) {
                    const bs = (tasas.bcv * val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return (
                      <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 5, paddingLeft: 2 }}>
                        ≈ Bs {bs}
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

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
            <EmptyState
              icon={filter === 'all' ? '🧾' : '🔍'}
              title={filter === 'all' ? 'Sin movimientos en esta cuenta' : 'Nada que mostrar'}
              sub={filter === 'all'
                ? 'Los ingresos y gastos de esta cuenta aparecerán aquí.'
                : 'No hay movimientos que coincidan con este filtro.'}
            />
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

        {/* ── Actions ── */}
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={openEditMode}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              background: 'transparent', border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'var(--amber)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <EditIcon />
            Editar cuenta
          </button>
        </div>

        {/* ── Danger zone ── */}
        <div style={{ padding: '12px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={() => void handleDeleteAccount()}
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
        </div>

      </div>
    </div>
  )
}
