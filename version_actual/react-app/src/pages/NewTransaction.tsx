// ═══════════════════════════════════════════════════
// NewTransaction — Pantalla completa nueva transacción
// FAB ('+') → /new-txn. Sin TabBar. Back → navigate(-1).
// Checkpoint C: reemplazar handleSave con mutación Supabase.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type ReactNode, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { ArrowLeftIcon, CheckIcon } from '../components/icons/Icons'
import { MOCK_ACCOUNTS } from '../data/mock'
import { useAuthStore } from '../store/auth'

/* ── Types ─────────────────────────────────────── */
type TxnType = 'gasto' | 'ingreso' | 'ahorro'

const CATS: Record<TxnType, string[]> = {
  gasto:   ['Alimentación', 'Restaurantes', 'Transporte', 'Entretenimiento',
             'Suscripciones', 'Salud', 'Servicios', 'Ocio'],
  ingreso: ['Trabajo', 'Freelance', 'Inversión', 'Préstamo recibido'],
  ahorro:  ['Ahorro', 'Inversión', 'Emergencia'],
}

const TYPE_META: Record<TxnType, { label: string; color: string; sign: string }> = {
  gasto:   { label: 'Gasto',   color: 'var(--neg)',  sign: '−' },
  ingreso: { label: 'Ingreso', color: 'var(--pos)',  sign: '+' },
  ahorro:  { label: 'Ahorro',  color: 'var(--info)', sign: ''  },
}

/* ── Shared input style ─────────────────────────── */
const inputSt: CSSProperties = {
  width:       '100%',
  background:  'var(--ink-2)',
  border:      '1px solid var(--line)',
  borderRadius: 12,
  padding:     '12px 14px',
  fontSize:    14,
  color:       'var(--fg)',
  outline:     'none',
  fontFamily:  'var(--f-ui)',
}

/* ── Sub-components ─────────────────────────────── */
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

function Rule() {
  return <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />
}

/* ── Today formatted ────────────────────────────── */
function todayLabel() {
  const d = new Date()
  return d.toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long',
  }) + ' · ' + d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

/* ════════════════════════════════════════════════ */
export default function NewTransaction() {
  const navigate  = useNavigate()
  const userName  = useAuthStore((s) => s.userName)

  const [type,    setType]    = useState<TxnType>('gasto')
  const [amount,  setAmount]  = useState('')
  const [cat,     setCat]     = useState<string>(CATS.gasto[0])
  const [account, setAccount] = useState<string>(MOCK_ACCOUNTS[0].id)
  const [desc,    setDesc]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [autor,   setAutor]   = useState<'anthony' | 'isabel'>('anthony')
  const [saved,   setSaved]   = useState(false)

  function changeType(t: TxnType) {
    setType(t)
    setCat(CATS[t][0])
  }

  function handleSave() {
    if (!amount || parseFloat(amount) <= 0) return
    // TODO Checkpoint C: supabase.from('transactions').insert(...)
    console.log('[NewTxn]', { type, amount: parseFloat(amount), cat, account, desc, notes, autor })
    setSaved(true)
    setTimeout(() => navigate(-1), 500)
  }

  const meta = TYPE_META[type]

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--ink-1)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top bar ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 12px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'var(--ink-1)',
        position: 'sticky', top: 0, zIndex: 10,
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
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>
            Nuevo movimiento
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>
            {new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <button
          onClick={handleSave}
          aria-label="Guardar"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: saved ? 'var(--pos)' : 'var(--amber)',
            border: 'none', display: 'grid', placeItems: 'center',
            color: 'var(--ink-0)', transition: 'background .2s',
          }}
        >
          <CheckIcon />
        </button>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* Type selector */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: 4,
          }}>
            {(['gasto', 'ingreso', 'ahorro'] as TxnType[]).map((t) => (
              <button
                key={t}
                onClick={() => changeType(t)}
                style={{
                  padding: '9px 0', borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  background: type === t ? 'var(--ink-3)' : 'transparent',
                  color:      type === t ? TYPE_META[t].color : 'var(--fg-mute)',
                  border:     type === t ? `1.5px solid ${TYPE_META[t].color}44` : '1px solid transparent',
                  transition: 'all .14s',
                }}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount hero */}
        <div style={{ padding: '18px 16px 14px', textAlign: 'center' }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.15em',
            textTransform: 'uppercase', color: meta.color, marginBottom: 6,
          }}>
            {meta.sign && `${meta.sign} `}{meta.label}
          </div>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 42, color: meta.color,
              opacity: 0.6, marginRight: 4, lineHeight: 1,
            }}>$</span>
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
                fontFamily:          'var(--f-display)',
                fontSize:            52,
                lineHeight:          1,
                color:               meta.color,
                background:          'transparent',
                border:              'none',
                outline:             'none',
                width:               '6ch',
                minWidth:            '2ch',
                textAlign:           'left',
                letterSpacing:       '-.02em',
                fontVariantNumeric:  'tabular-nums',
              } as CSSProperties}
            />
          </div>
        </div>

        <Rule />

        {/* Category grid */}
        <SLabel>Categoría</SLabel>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 8, padding: '0 16px',
        }}>
          {CATS[type].map((c) => {
            const sel   = c === cat
            const color = catColor(c)
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 5,
                  padding: '9px 4px', borderRadius: 12,
                  background: sel ? `${color}16` : 'var(--ink-2)',
                  border:     sel ? `1.5px solid ${color}55` : '1px solid var(--line)',
                  transition: 'all .12s',
                }}
              >
                <CatIcon cat={c} size={36} />
                <span style={{
                  fontSize: 9, fontWeight: 500, lineHeight: 1.2,
                  color:  sel ? color : 'var(--fg-mute)',
                  textAlign: 'center', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ height: 1, background: 'var(--line)', margin: '16px 16px 0' }} />

        {/* Account selector */}
        <SLabel>Cuenta</SLabel>
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {MOCK_ACCOUNTS.map((acc) => {
            const sel = acc.id === account
            return (
              <button
                key={acc.id}
                onClick={() => setAccount(acc.id)}
                style={{
                  flexShrink: 0, borderRadius: 12, padding: '10px 14px',
                  background: sel
                    ? `radial-gradient(ellipse at 85% 10%, ${acc.color}2a 0%, transparent 60%), var(--ink-2)`
                    : 'var(--ink-2)',
                  border: sel ? `1.5px solid ${acc.color}50` : '1px solid var(--line)',
                  textAlign: 'left', minWidth: 130, transition: 'all .12s',
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
                  ${acc.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ height: 1, background: 'var(--line)', margin: '16px 16px 0' }} />

        {/* Description */}
        <SLabel>Descripción</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ej. Supermercado Plaza, Netflix…"
            style={inputSt}
            maxLength={80}
          />
        </div>

        {/* Date */}
        <SLabel>Fecha y hora</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            ...inputSt, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            color: 'var(--fg-dim)', fontSize: 13, cursor: 'default',
          }}>
            <span>{todayLabel()}</span>
            <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Cambiar</span>
          </div>
        </div>

        {/* Autor */}
        <SLabel>Registrado por</SLabel>
        <div style={{ padding: '0 16px', display: 'flex', gap: 8 }}>
          {([
            { id: 'anthony' as const, label: userName,  color: '#6a94c4' },
            { id: 'isabel'  as const, label: 'Isabel',  color: '#b0a3c7' },
          ]).map(({ id, label, color }) => {
            const sel = autor === id
            return (
              <button
                key={id}
                onClick={() => setAutor(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', borderRadius: 12,
                  background: sel ? `${color}18` : 'var(--ink-2)',
                  border:     sel ? `1.5px solid ${color}50` : '1px solid var(--line)',
                  transition: 'all .12s',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: color, display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--ink-0)', flexShrink: 0,
                }}>
                  {label[0]}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: sel ? color : 'var(--fg-dim)',
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Notes */}
        <SLabel>Notas</SLabel>
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
            rows={3}
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
              background:  saved ? 'var(--pos)' : 'var(--amber)',
              fontSize: 15.5, fontWeight: 700,
              color: 'var(--ink-0)', letterSpacing: '.02em',
              boxShadow: saved
                ? '0 4px 20px rgba(88,178,106,.35)'
                : '0 4px 20px rgba(224,168,74,.35)',
              transition: 'background .2s, box-shadow .2s',
            }}
          >
            {saved ? '✓  Guardado' : 'Guardar movimiento'}
          </button>
        </div>

      </div>
    </div>
  )
}
