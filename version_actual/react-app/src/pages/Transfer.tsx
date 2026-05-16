// ═══════════════════════════════════════════════════
// Transfer — /transfer
// Full screen, no TabBar. Transferencia entre cuentas.
// Bloque 2. Checkpoint C: crear par TRANSFER_DEBIT +
//   TRANSFER_CREDIT con pair_id en Supabase.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon, TransferIcon } from '../components/icons/Icons'
import { MOCK_ACCOUNTS, fmt } from '../data/mock'

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

/* ── Account mini-card selector ─────────────────── */
function AccountPicker({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: typeof MOCK_ACCOUNTS
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {accounts.map((acc) => {
        const sel = acc.id === selectedId
        return (
          <button
            key={acc.id}
            onClick={() => onSelect(acc.id)}
            style={{
              flexShrink: 0, borderRadius: 12, padding: '10px 14px',
              background: sel
                ? `radial-gradient(ellipse at 85% 10%, ${acc.color}2a 0%, transparent 60%), var(--ink-2)`
                : 'var(--ink-2)',
              border: sel ? `1.5px solid ${acc.color}50` : '1px solid var(--line)',
              textAlign: 'left', minWidth: 130, transition: 'all .12s', cursor: 'pointer',
            }}
          >
            <div style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: acc.color, marginBottom: 2,
            }}>
              {acc.type}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{acc.name}</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 1 }}>
              {acc.currency === 'USD'
                ? fmt(acc.balance)
                : `Bs ${acc.balance.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════ */
export default function Transfer() {
  const navigate = useNavigate()

  const [fromId, setFromId] = useState<string>(MOCK_ACCOUNTS[0].id)
  const [toId,   setToId]   = useState<string>(MOCK_ACCOUNTS[1].id)
  const [amount, setAmount] = useState('')
  const [desc,   setDesc]   = useState('')
  const [notes,  setNotes]  = useState('')
  const [saved,  setSaved]  = useState(false)

  const fromAcc = MOCK_ACCOUNTS.find(a => a.id === fromId) ?? MOCK_ACCOUNTS[0]
  const toAcc   = MOCK_ACCOUNTS.find(a => a.id === toId)   ?? MOCK_ACCOUNTS[1]

  /* ── Handlers ───────────────────────────────── */
  function handleFromChange(id: string) {
    setFromId(id)
    // If current destination equals new source, switch to another account
    if (toId === id) {
      const other = MOCK_ACCOUNTS.find(a => a.id !== id)
      if (other) setToId(other.id)
    }
  }

  function handleToChange(id: string) {
    if (id === fromId) return // same account blocked
    setToId(id)
  }

  function handleSave() {
    if (!amount || parseFloat(amount) <= 0) return
    if (fromId === toId) return
    // TODO Checkpoint C: create pair with shared pair_id
    //   { tipo: 'TRANSFER_DEBIT',  accountId: fromId, amount: -parsed, ... }
    //   { tipo: 'TRANSFER_CREDIT', accountId: toId,   amount: +parsed, ... }
    const pairId = `tfr-${Date.now()}`
    console.log('[Transfer]', {
      pairId,
      debit:  { accountId: fromId, amount: -parseFloat(amount), tipo: 'TRANSFER_DEBIT' },
      credit: { accountId: toId,   amount:  parseFloat(amount), tipo: 'TRANSFER_CREDIT' },
      desc:   desc || `${fromAcc.name} → ${toAcc.name}`,
      notes,
    })
    setSaved(true)
    setTimeout(() => navigate(-1), 500)
  }

  /* ── Validation ─────────────────────────────── */
  const parsedAmount   = parseFloat(amount) || 0
  const insufficient   = parsedAmount > 0 && parsedAmount > fromAcc.balance

  /* ── Styles ─────────────────────────────────── */
  const inputSt: CSSProperties = {
    width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'var(--f-ui)',
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
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>Transferencia</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>Entre tus cuentas</div>
        </div>

        <button
          onClick={handleSave}
          aria-label="Ejecutar"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: saved ? 'var(--pos)' : 'var(--teal)',
            border: 'none', display: 'grid', placeItems: 'center',
            color: '#fff', transition: 'background .2s',
          }}
        >
          <CheckIcon />
        </button>
      </div>

      {/* ── Content ──────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* From */}
        <SLabel>Cuenta origen</SLabel>
        <AccountPicker
          accounts={MOCK_ACCOUNTS}
          selectedId={fromId}
          onSelect={handleFromChange}
        />

        {/* Arrow divider */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <div style={{ color: 'var(--teal)', display: 'grid', placeItems: 'center', opacity: 0.8 }}>
            <TransferIcon />
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        {/* To */}
        <SLabel>Cuenta destino</SLabel>
        <AccountPicker
          accounts={MOCK_ACCOUNTS.filter(a => a.id !== fromId)}
          selectedId={toId}
          onSelect={handleToChange}
        />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line)', margin: '16px 16px 0' }} />

        {/* Amount hero */}
        <SLabel>Monto a transferir</SLabel>
        <div style={{ padding: '4px 16px 14px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 38, color: 'var(--teal)',
              opacity: 0.6, marginRight: 4, lineHeight: 1,
            }}>
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                fontFamily:    'var(--f-display)',
                fontSize:      52,
                lineHeight:    1,
                color:         'var(--teal)',
                background:    'transparent',
                border:        'none',
                outline:       'none',
                width:         '6ch',
                minWidth:      '2ch',
                textAlign:     'left',
                letterSpacing: '-.02em',
              } as CSSProperties}
            />
          </div>
          {insufficient && (
            <div style={{ fontSize: 11.5, color: 'var(--neg)', marginTop: 6, fontWeight: 600 }}>
              ⚠ Saldo insuficiente en {fromAcc.name}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />

        {/* Description */}
        <SLabel>Descripción</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={`${fromAcc.name} → ${toAcc.name}`}
            style={inputSt}
            maxLength={80}
          />
        </div>

        {/* Notes */}
        <SLabel>Notas</SLabel>
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
            rows={2}
            style={{ ...inputSt, resize: 'none', lineHeight: 1.5 }}
            maxLength={200}
          />
        </div>

        {/* Save CTA */}
        <div style={{
          padding: '20px 16px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: saved ? 'var(--pos)' : 'var(--teal)',
              fontSize: 15.5, fontWeight: 700, color: '#fff',
              letterSpacing: '.02em',
              boxShadow: saved
                ? '0 4px 20px rgba(88,178,106,.35)'
                : '0 4px 20px rgba(61,139,130,.30)',
              transition: 'background .2s, box-shadow .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <TransferIcon />
            {saved ? '✓  Transferencia ejecutada' : 'Ejecutar transferencia'}
          </button>
        </div>

      </div>
    </div>
  )
}
