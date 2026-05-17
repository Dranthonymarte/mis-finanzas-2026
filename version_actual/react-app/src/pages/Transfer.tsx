// ═══════════════════════════════════════════════════
// Transfer — /transfer
// Full screen, no TabBar. Transferencia entre cuentas.
// Real accounts via useAccounts · Real Supabase insert
// (2 rows: Transferencia Interna, shared descripcion)
// ═══════════════════════════════════════════════════

import { useState, useRef } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon, TransferIcon } from '../components/icons/Icons'
import { type Account } from '../data/mock'
import { useAccounts }  from '../hooks/useAccounts'
import { useAuthStore } from '../store/auth'
import { useFormat }    from '../hooks/useFormat'
import { supabase }     from '../lib/supabase'
import { mesIdToDbKey, dateToMesId } from '../lib/mes'

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
  accounts: Account[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const { fmt } = useFormat()
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
              {acc.currency === 'VES'
                ? `Bs ${acc.balance.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`
                : fmt(acc.balance)}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════ */
export default function Transfer() {
  const navigate    = useNavigate()
  const householdId = useAuthStore(s => s.householdId)
  const { fmt }     = useFormat()
  const { accounts: liveAccounts, loading: accsLoading } = useAccounts()
  const accounts = liveAccounts ?? []

  // Initialise from/to once accounts load (useRef prevents re-trigger)
  const initDone = useRef(false)
  const [fromId, setFromId] = useState<string>('')
  const [toId,   setToId]   = useState<string>('')

  if (!initDone.current && accounts.length >= 1) {
    setFromId(accounts[0].id)
    setToId(accounts[1]?.id ?? accounts[0].id)
    initDone.current = true
  }

  const [amount,  setAmount]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [confirm, setConfirm] = useState(false)   // confirmation sheet

  const fromAcc = accounts.find(a => a.id === fromId) ?? accounts[0]
  const toAcc   = accounts.find(a => a.id === toId)   ?? accounts[1]

  /* ── Handlers ─────────────────────────────────── */
  function handleFromChange(id: string) {
    setFromId(id)
    if (toId === id) {
      const other = accounts.find(a => a.id !== id)
      if (other) setToId(other.id)
    }
  }

  function handleToChange(id: string) {
    if (id === fromId) return
    setToId(id)
  }

  async function executeTransfer() {
    if (!fromAcc || !toAcc || !householdId) return
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0 || fromId === toId) return

    setSaving(true)
    setError('')

    const today     = new Date().toISOString().slice(0, 10)
    const mes       = mesIdToDbKey(dateToMesId(new Date(today + 'T12:00:00')))
    const transferId = crypto.randomUUID()
    const label     = desc.trim() || `${fromAcc.name} → ${toAcc.name}`

    // Two rows for a transfer — share the same descripcion as link
    const debit = {
      id:           transferId,
      user_id:      householdId,   // RLS: user_id = active_household_id()
      household_id: householdId,
      mes,
      descripcion:  label,
      tipo:         'Transferencia Interna',
      cat:          'Transferencia',
      subcat:       '',            // NOT NULL
      amount:       -parsed,       // negative = salida
      amount_bs:    0,
      method:       '',            // NOT NULL
      fecha:        today,
      author:       'anthony',
      rate_type:    'bcv',
      cuenta_id:    fromId || null,
    }

    const credit = {
      id:           crypto.randomUUID(),
      user_id:      householdId,
      household_id: householdId,
      mes,
      descripcion:  label,
      tipo:         'Transferencia Interna',
      cat:          'Transferencia',
      subcat:       '',
      amount:        parsed,       // positive = entrada
      amount_bs:    0,
      method:       '',
      fecha:        today,
      author:       'anthony',
      rate_type:    'bcv',
      cuenta_id:    toId || null,
    }

    const { error: err } = await supabase.from('movimientos').insert([debit, credit])
    if (err) {
      setError(err.message)
      setSaving(false)
      setConfirm(false)
      return
    }

    setSaved(true)
    setConfirm(false)
    setTimeout(() => navigate(-1), 500)
  }

  /* ── Validation ───────────────────────────────── */
  const parsedAmount = parseFloat(amount) || 0
  const insufficient = parsedAmount > 0 && fromAcc && parsedAmount > fromAcc.balance
  const canSave      = parsedAmount > 0 && fromId !== toId && !insufficient && !saving

  /* ── Styles ───────────────────────────────────── */
  const inputSt: CSSProperties = {
    width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'var(--f-ui)',
  }

  /* ── Loading skeleton ─────────────────────────── */
  if (accsLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>Cargando cuentas…</div>
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, width: 36, height: 36, display: 'grid', placeItems: 'center', color: 'var(--fg-dim)' }}>
            <ArrowLeftIcon />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Transferencia</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13, padding: '0 32px' }}>
            No tienes cuentas registradas.<br />Crea una cuenta primero.
          </div>
        </div>
      </div>
    )
  }

  /* ── Render ───────────────────────────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ─────────────────────────────── */}
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
          onClick={() => canSave && setConfirm(true)}
          aria-label="Ejecutar"
          disabled={!canSave}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: saved ? 'var(--pos)' : canSave ? 'var(--teal)' : 'var(--ink-3)',
            border: 'none', display: 'grid', placeItems: 'center',
            color: canSave || saved ? '#fff' : 'var(--fg-mute)',
            transition: 'background .2s',
          }}
        >
          <CheckIcon />
        </button>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* From */}
        <SLabel>Cuenta origen</SLabel>
        <AccountPicker accounts={accounts} selectedId={fromId} onSelect={handleFromChange} />

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
          accounts={accounts.filter(a => a.id !== fromId)}
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
            }}>$</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                fontFamily: 'var(--f-display)', fontSize: 52, lineHeight: 1,
                color: 'var(--teal)', background: 'transparent',
                border: 'none', outline: 'none',
                width: '6ch', minWidth: '2ch',
                textAlign: 'left', letterSpacing: '-.02em',
              } as CSSProperties}
            />
          </div>
          {insufficient && (
            <div style={{ fontSize: 11.5, color: 'var(--neg)', marginTop: 6, fontWeight: 600 }}>
              ⚠ Saldo insuficiente en {fromAcc?.name}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />

        {/* Description */}
        <SLabel>Descripción</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text" value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder={fromAcc && toAcc ? `${fromAcc.name} → ${toAcc.name}` : 'Descripción'}
            style={inputSt} maxLength={80}
          />
        </div>

        {/* Notes */}
        <SLabel>Notas</SLabel>
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales (opcional)…" rows={2}
            style={{ ...inputSt, resize: 'none', lineHeight: 1.5 }}
            maxLength={200}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin: '12px 16px 0',
            background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.3)',
            borderRadius: 12, padding: '10px 14px',
            fontSize: 12, color: 'var(--neg)',
          }}>
            {error}
          </div>
        )}

        {/* Save CTA */}
        <div style={{ padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={() => canSave && setConfirm(true)}
            disabled={!canSave}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: saved ? 'var(--pos)' : canSave ? 'var(--teal)' : 'var(--ink-3)',
              fontSize: 15.5, fontWeight: 700,
              color: canSave || saved ? '#fff' : 'var(--fg-mute)',
              letterSpacing: '.02em',
              boxShadow: canSave ? '0 4px 20px rgba(61,139,130,.30)' : 'none',
              transition: 'background .2s, box-shadow .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <TransferIcon />
            {saved ? '✓  Transferencia ejecutada' : 'Ejecutar transferencia'}
          </button>
        </div>

      </div>

      {/* ── Confirmation sheet ───────────────────── */}
      {confirm && fromAcc && toAcc && (
        <>
          <div
            onClick={() => { if (!saving) setConfirm(false) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 500 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430,
            background: 'var(--ink-1)', borderRadius: '20px 20px 0 0',
            border: '1px solid var(--line)',
            padding: '20px 20px max(24px, calc(24px + env(safe-area-inset-bottom, 0px)))',
            zIndex: 501,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>↔</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                ¿Ejecutar transferencia?
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>
                {fmt(parsedAmount)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>
                {fromAcc.name} → {toAcc.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 8 }}>
                Se crearán 2 movimientos: un débito y un crédito.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirm(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'var(--ink-3)', border: '1px solid var(--line)',
                  fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeTransfer}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'var(--teal)', border: 'none',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
