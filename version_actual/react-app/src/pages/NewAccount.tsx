// ═══════════════════════════════════════════════════
// NewAccount — /new-account
// Full screen, no TabBar. Back → navigate(-1).
// Bloque 2. Checkpoint C: replace handleSave with Supabase insert.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon } from '../components/icons/Icons'
import { supabase }     from '../lib/supabase'
import { useAuthStore } from '../store/auth'

/* ── Types ─────────────────────────────────────── */
type AccountType = 'CORRIENTE' | 'AHORRO' | 'CASH'
type Currency    = 'USD' | 'VES'

const ACCOUNT_TYPES: AccountType[] = ['CORRIENTE', 'AHORRO', 'CASH']
const CURRENCIES:   Currency[]    = ['USD', 'VES']

const COLORS = [
  { label: 'Verde', value: '#58b26a' },   // --pos
  { label: 'Azul',  value: '#6a94c4' },   // --info
  { label: 'Ámbar', value: '#e0a84a' },   // --amber
  { label: 'Teal',  value: '#3d8b82' },   // --teal
  { label: 'Rojo',  value: '#d66a5a' },   // --neg
  { label: 'Gris',  value: '#9aa0ab' },   // --fg-dim
]

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

/* ════════════════════════════════════════════════ */
export default function NewAccount() {
  const navigate = useNavigate()
  const householdId = useAuthStore(s => s.householdId)

  const [name,     setName]     = useState('')
  const [type,     setType]     = useState<AccountType>('CORRIENTE')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [balance,  setBalance]  = useState('')
  const [color,    setColor]    = useState(COLORS[0].value)
  const [notes,    setNotes]    = useState('')
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  const trimmed = name.trim()

  async function handleSave() {
    if (!trimmed || !householdId) return
    setSaving(true)
    const initialBalance = parseFloat(balance) || 0
    const { error } = await supabase.from('cuentas').insert({
      nombre:       trimmed,
      moneda:       currency,
      saldo_inicial: initialBalance,
      color,
      activa:       true,
      household_id: householdId,
      owner:        householdId,
    })
    setSaving(false)
    if (error) { console.error('[NewAccount]', error.message); return }
    setSaved(true)
    setTimeout(() => navigate('/accounts'), 400)
  }

  /* ── Shared styles ──────────────────────────── */
  const inputSt: CSSProperties = {
    width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
    borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--fg)',
    outline: 'none', fontFamily: 'var(--f-ui)',
  }

  const segSt = (active: boolean): CSSProperties => ({
    padding: '9px 0', flex: 1, borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: active ? 'var(--ink-3)' : 'transparent',
    color:      active ? 'var(--amber)' : 'var(--fg-mute)',
    border:     active ? '1.5px solid rgba(224,168,74,.27)' : '1px solid transparent',
    transition: 'all .14s',
  })

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
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>Nueva cuenta</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>Agregar a tu patrimonio</div>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          aria-label="Guardar"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: saved ? 'var(--pos)' : trimmed ? 'var(--amber)' : 'var(--ink-3)',
            border: 'none', display: 'grid', placeItems: 'center',
            color: trimmed ? 'var(--ink-0)' : 'var(--fg-mute)',
            transition: 'background .2s',
          }}
        >
          <CheckIcon />
        </button>
      </div>

      {/* ── Content ──────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* Live preview card */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{
            borderRadius: 16, padding: '16px 16px 14px',
            background: `radial-gradient(ellipse at 88% 12%, ${color}2e 0%, transparent 58%), var(--ink-2)`,
            border: `1px solid ${color}30`,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '.14em',
              textTransform: 'uppercase', color, marginBottom: 4,
            }}>
              {type}
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 600, color: trimmed ? 'var(--fg)' : 'var(--fg-mute)' }}>
              {trimmed || 'Nombre de la cuenta'}
            </div>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6, letterSpacing: '-.02em' }}>
              {currency === 'USD' ? '$' : 'Bs '}
              {balance
                ? parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'}
            </div>
          </div>
        </div>

        {/* Name */}
        <SLabel>Nombre</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Principal, Ahorro viaje, Efectivo…"
            style={inputSt}
            maxLength={40}
            autoFocus
          />
        </div>

        {/* Type */}
        <SLabel>Tipo de cuenta</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            display: 'flex', gap: 5,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 4,
          }}>
            {ACCOUNT_TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} style={segSt(type === t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <SLabel>Moneda</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            display: 'flex', gap: 5,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 4,
          }}>
            {CURRENCIES.map((c) => (
              <button key={c} onClick={() => setCurrency(c)} style={segSt(currency === c)}>
                {c === 'USD' ? '🇺🇸  USD' : '🇻🇪  VES'}
              </button>
            ))}
          </div>
        </div>

        {/* Initial balance */}
        <div style={{ height: 1, background: 'var(--line)', margin: '16px 16px 0' }} />
        <SLabel>Saldo inicial</SLabel>
        <div style={{ padding: '4px 16px 14px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 36, color,
              opacity: 0.6, marginRight: 4, lineHeight: 1,
            }}>
              {currency === 'USD' ? '$' : 'Bs'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              style={{
                fontFamily:    'var(--f-display)',
                fontSize:      46,
                lineHeight:    1,
                color,
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
        </div>

        {/* Color */}
        <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />
        <SLabel>Color</SLabel>
        <div style={{ padding: '0 16px 6px', display: 'flex', gap: 12, alignItems: 'center' }}>
          {COLORS.map((c) => {
            const sel = color === c.value
            return (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                aria-label={c.label}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: c.value,
                  border:         sel ? '3px solid var(--fg)' : '3px solid transparent',
                  outline:        sel ? `2px solid ${c.value}` : 'none',
                  outlineOffset:  2,
                  transition:     'all .14s',
                  cursor:         'pointer',
                  flexShrink:     0,
                }}
              />
            )
          })}
        </div>

        {/* Notes */}
        <SLabel>Notas</SLabel>
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Banco, número de cuenta, sucursal… (opcional)"
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
            onClick={() => void handleSave()}
            disabled={!trimmed || saving}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background: saved
                ? 'var(--pos)'
                : trimmed
                  ? 'var(--amber)'
                  : 'var(--ink-3)',
              fontSize: 15.5, fontWeight: 700,
              color: trimmed ? 'var(--ink-0)' : 'var(--fg-mute)',
              letterSpacing: '.02em',
              boxShadow: saved
                ? '0 4px 20px rgba(88,178,106,.35)'
                : trimmed
                  ? '0 4px 20px rgba(224,168,74,.35)'
                  : 'none',
              transition: 'background .2s, box-shadow .2s',
            }}
          >
            {saving ? 'Guardando…' : saved ? '✓  Cuenta creada' : 'Crear cuenta'}
          </button>
        </div>

      </div>
    </div>
  )
}
