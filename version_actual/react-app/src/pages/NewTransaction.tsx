// ═══════════════════════════════════════════════════
// NewTransaction — Paridad completa con modal-mov vanilla
// Tipo→Categoría→Subcategoría en cadena
// USD↔Bs bidireccional con tasa BCV activa
// Método de pago, cuenta, recurrente, ef_contribution
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { ArrowLeftIcon, CheckIcon } from '../components/icons/Icons'
import { MOCK_ACCOUNTS } from '../data/mock'
import { useAccounts } from '../hooks/useAccounts'
import { useAuthStore } from '../store/auth'

// ── Tipos exactos del vanilla ─────────────────────
const TIPOS = [
  'Gasto',
  'Ingreso Fijo',
  'Ingreso Variable',
  'Ahorro en efectivo',
  'Transferencia Interna',
  'Prestamo recibido',
  'Prestamo pagado',
  'Ajuste',
] as const

type Tipo = typeof TIPOS[number]

// ── Metadatos por tipo (color, signo) ──────────────
const TIPO_META: Record<Tipo, { color: string; sign: '' | '+' | '−' }> = {
  'Gasto':                { color: 'var(--neg)',  sign: '−' },
  'Ingreso Fijo':         { color: 'var(--pos)',  sign: '+' },
  'Ingreso Variable':     { color: 'var(--pos)',  sign: '+' },
  'Ahorro en efectivo':   { color: 'var(--info)', sign: ''  },
  'Transferencia Interna':{ color: 'var(--teal)', sign: ''  },
  'Prestamo recibido':    { color: 'var(--pos)',  sign: '+' },
  'Prestamo pagado':      { color: 'var(--neg)',  sign: '−' },
  'Ajuste':               { color: 'var(--amber)', sign: '' },
}

// ── Subcategorías ocultas para ciertos tipos ──────
const TIPOS_SIN_SUBCAT = new Set<Tipo>(['Ajuste', 'Prestamo recibido', 'Prestamo pagado', 'Transferencia Interna'])

// ── Categorías por tipo ────────────────────────────
const CATS_BY_TIPO: Record<Tipo, string[]> = {
  'Gasto': [
    'Alimentación', 'Restaurantes', 'Transporte', 'Entretenimiento',
    'Salud', 'Hogar', 'Servicios', 'Suscripciones', 'Ropa', 'Ocio', 'Educación',
  ],
  'Ingreso Fijo':      ['Trabajo', 'Salario', 'Arrendamiento', 'Pensión'],
  'Ingreso Variable':  ['Freelance', 'Negocio', 'Inversión', 'Comisión', 'Venta', 'Otro'],
  'Ahorro en efectivo':['Ahorro general', 'Emergencia', 'FIRE', 'Meta viaje', 'Meta hogar'],
  'Transferencia Interna': ['Transferencia Interna'],
  'Prestamo recibido': ['Familiar', 'Amigo', 'Banco', 'Personal'],
  'Prestamo pagado':   ['Familiar', 'Amigo', 'Banco', 'Personal'],
  'Ajuste':            ['Corrección', 'Diferencia cambiaria', 'Otro'],
}

// ── Subcategorías por categoría ───────────────────
const SUBCATS: Record<string, string[]> = {
  'Alimentación':    ['Supermercado', 'Panadería', 'Carnicería', 'Bodega', 'Frutas y verduras'],
  'Restaurantes':    ['Almuerzo', 'Cena', 'Domicilio', 'Fast Food', 'Café / Merienda'],
  'Transporte':      ['Gasolina', 'Taxi / Uber', 'Bus', 'Parking', 'Peaje', 'Avión'],
  'Entretenimiento': ['Cine', 'Conciertos', 'Teatro', 'Eventos', 'Parques'],
  'Salud':           ['Farmacia', 'Médico', 'Dentista', 'Seguro', 'Gimnasio', 'Vitaminas'],
  'Hogar':           ['Alquiler', 'Electricidad', 'Agua', 'Internet', 'Gas', 'Reparaciones', 'Muebles'],
  'Servicios':       ['Teléfono', 'Internet', 'Cable TV', 'Seguro hogar'],
  'Suscripciones':   ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'Amazon Prime', 'YouTube Premium'],
  'Ropa':            ['Ropa', 'Zapatos', 'Accesorios'],
  'Ocio':            ['Viajes', 'Deporte', 'Hobbies', 'Libros'],
  'Educación':       ['Cursos online', 'Universidad', 'Materiales', 'Idiomas'],
  'Trabajo':         ['Salario', 'Bono', 'Horas extra', 'Viáticos'],
  'Freelance':       ['Diseño', 'Programación', 'Consultoría', 'Contenido', 'Traducción'],
  'Inversión':       ['Acciones', 'Crypto', 'Fondo mutuo', 'Dividendos', 'Bienes raíces'],
  'Ahorro general':  ['Meta ahorro', 'General'],
  'Emergencia':      ['Fondo emergencia'],
  'FIRE':            ['Independencia financiera'],
}

// ── Métodos de pago ────────────────────────────────
const METHODS = [
  'Pago móvil',
  'Transferencia',
  'Zelle',
  'Efectivo en dólares',
  'Efectivo en bolívares',
  'Tarjeta de débito',
  'Binance',
]

// ── Utilidades ─────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function loadBCV(): number {
  try {
    const raw = localStorage.getItem('mis_finanzas_tasas')
    if (raw) return JSON.parse(raw).bcv || 431.01
  } catch { /* ignore */ }
  return 431.01
}

// ── Sub-components ─────────────────────────────────
const inputSt: CSSProperties = {
  width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
  borderRadius: 12, padding: '11px 14px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)',
}

function SLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
      textTransform: 'uppercase', color: 'var(--fg-mute)',
      padding: '16px 16px 8px',
    }}>
      {children}
    </div>
  )
}

function Rule() {
  return <div style={{ height: 1, background: 'var(--line)', margin: '14px 16px 0' }} />
}

// ══════════════════════════════════════════════════
export default function NewTransaction() {
  const navigate = useNavigate()
  const userName = useAuthStore((s) => s.userName)

  const { accounts: liveAccounts } = useAccounts()
  const accounts = liveAccounts ?? MOCK_ACCOUNTS

  // ── Form state ────────────────────────────────
  const [tipo,        setTipo]        = useState<Tipo>('Gasto')
  const [cat,         setCat]         = useState<string>(CATS_BY_TIPO['Gasto'][0])
  const [subcat,      setSubcat]      = useState<string>('')
  const [amountUSD,   setAmountUSD]   = useState('')
  const [amountBs,    setAmountBs]    = useState('')
  const [method,      setMethod]      = useState(METHODS[0])
  const [account,     setAccount]     = useState('')
  const [accountTo,   setAccountTo]   = useState('')
  const [desc,        setDesc]        = useState('')
  const [fecha,       setFecha]       = useState(todayISO())
  const [autor,       setAutor]       = useState<'anthony' | 'isabel'>('anthony')
  const [recurrente,  setRecurrente]  = useState(false)
  const [recDia,      setRecDia]      = useState(1)
  const [notes,       setNotes]       = useState('')
  const [rateBCV,     setRateBCV]     = useState(loadBCV)
  const [saved,       setSaved]       = useState(false)

  // Keep rate fresh; initialize accounts once loaded
  useEffect(() => {
    setRateBCV(loadBCV())
  }, [])

  useEffect(() => {
    if (accounts.length > 0 && account === '') {
      setAccount(accounts[0].id)
      setAccountTo(accounts[1]?.id ?? accounts[0].id)
    }
  }, [accounts, account])

  // ── Cascade: tipo → cat → subcat ─────────────
  function changeTipo(t: Tipo) {
    setTipo(t)
    const firstCat = CATS_BY_TIPO[t][0]
    setCat(firstCat)
    setSubcat(SUBCATS[firstCat]?.[0] ?? '')
  }

  function changeCat(c: string) {
    setCat(c)
    setSubcat(SUBCATS[c]?.[0] ?? '')
  }

  // ── Bidirectional USD↔Bs ──────────────────────
  function handleUSD(v: string) {
    setAmountUSD(v)
    const n = parseFloat(v)
    setAmountBs(isNaN(n) ? '' : (n * rateBCV).toFixed(2))
  }

  function handleBs(v: string) {
    setAmountBs(v)
    const n = parseFloat(v)
    setAmountUSD(isNaN(n) ? '' : (n / rateBCV).toFixed(2))
  }

  // ── ef_contribution (auto for Ahorro) ────────
  const usdNum     = parseFloat(amountUSD) || 0
  const efContrib  = tipo === 'Ahorro en efectivo' ? usdNum * 0.30 : 0
  const isTransfer = tipo === 'Transferencia Interna'

  // ── Save ──────────────────────────────────────
  function handleSave() {
    if (!amountUSD || usdNum <= 0) return
    const mes = fecha.slice(0, 7)
    const sign = ['Ingreso Fijo', 'Ingreso Variable', 'Prestamo recibido'].includes(tipo) ? 1 : -1
    const mov = {
      tipo, cat,
      subcat:          subcat || null,
      amount:          sign * usdNum,
      amount_bs:       parseFloat(amountBs) || 0,
      descripcion:     desc || cat,
      method,
      cuenta_id:       account || null,
      cuenta_destino:  isTransfer ? accountTo : null,
      fecha,
      mes,
      author:          autor,
      recurrente,
      rec_dia:         recurrente ? recDia : null,
      ef_contribution: efContrib > 0 ? efContrib : null,
      rate_bcv:        rateBCV,
    }
    console.log('[NewTxn]', mov)
    setSaved(true)
    setTimeout(() => navigate(-1), 400)
  }
  const meta      = TIPO_META[tipo]
  const subcats   = SUBCATS[cat] ?? []
  const showSubcat = !TIPOS_SIN_SUBCAT.has(tipo) && subcats.length > 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
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
          <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>Nuevo movimiento</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
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

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ── Tipo selector (8 chips, scrollable) ── */}
        <div style={{
          display: 'flex', gap: 6, padding: '14px 16px 0',
          overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {TIPOS.map(t => {
            const sel = t === tipo
            const c   = TIPO_META[t].color
            const shortLabels: Partial<Record<Tipo, string>> = {
              'Ingreso Fijo':         'Ing. Fijo',
              'Ingreso Variable':     'Ing. Variable',
              'Ahorro en efectivo':   'Ahorro',
              'Transferencia Interna':'Transferencia',
              'Prestamo recibido':    'Préstamo +',
              'Prestamo pagado':      'Préstamo −',
            }
            return (
              <button
                key={t}
                onClick={() => changeTipo(t)}
                style={{
                  flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                  fontSize: 12, fontWeight: 600,
                  background: sel ? `${c}18` : 'var(--ink-2)',
                  color:      sel ? c : 'var(--fg-mute)',
                  border:     sel ? `1.5px solid ${c}55` : '1px solid var(--line)',
                  transition: 'all .12s',
                }}
              >
                {shortLabels[t] ?? t}
              </button>
            )
          })}
        </div>

        {/* ── Amount hero ── */}
        <div style={{ padding: '16px 16px 10px', textAlign: 'center' }}>
          {/* USD row */}
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 40, color: meta.color,
              opacity: 0.55, lineHeight: 1,
            }}>
              {meta.sign || '$'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amountUSD}
              onChange={e => handleUSD(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                fontFamily: 'var(--f-display)', fontSize: 52, lineHeight: 1,
                color: meta.color, background: 'transparent',
                border: 'none', outline: 'none',
                width: '5.5ch', minWidth: '2ch',
                textAlign: 'left', letterSpacing: '-.02em',
              } as CSSProperties}
            />
          </div>

          {/* Bs row */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Bs</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={amountBs}
              onChange={e => handleBs(e.target.value)}
              placeholder="0.00"
              style={{
                fontFamily: 'var(--f-num)', fontSize: 17, fontWeight: 600,
                color: 'var(--fg-dim)', background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--line)',
                outline: 'none', width: '8ch', textAlign: 'center', padding: '2px 4px',
              } as CSSProperties}
            />
            <span style={{ fontSize: 10, color: 'var(--fg-mute)' }}>@ {rateBCV.toFixed(2)}</span>
          </div>

          {/* EF contribution note */}
          {tipo === 'Ahorro en efectivo' && usdNum > 0 && (
            <div style={{
              marginTop: 8, fontSize: 11, color: 'var(--info)',
              background: 'rgba(106,148,196,.1)', borderRadius: 8,
              padding: '4px 12px', display: 'inline-block',
            }}>
              🛡️ 30% → fondo emergencia (${efContrib.toFixed(2)})
            </div>
          )}

          {/* Ajuste note */}
          {tipo === 'Ajuste' && (
            <div style={{
              marginTop: 8, fontSize: 11, color: 'var(--amber)',
              background: 'var(--amber-d)', borderRadius: 8,
              padding: '4px 12px', display: 'inline-block',
            }}>
              ⚡ Ajuste de saldo — no afecta ingresos/gastos
            </div>
          )}
        </div>

        <Rule />

        {/* ── Categoría grid ── */}
        {!isTransfer && (
          <>
            <SLabel>Categoría</SLabel>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 8, padding: '0 16px',
            }}>
              {CATS_BY_TIPO[tipo].map(c => {
                const sel   = c === cat
                const color = catColor(c)
                return (
                  <button
                    key={c}
                    onClick={() => changeCat(c)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      padding: '9px 4px', borderRadius: 12,
                      background: sel ? `${color}16` : 'var(--ink-2)',
                      border:     sel ? `1.5px solid ${color}55` : '1px solid var(--line)',
                      transition: 'all .12s',
                    }}
                  >
                    <CatIcon cat={c} size={34} />
                    <span style={{
                      fontSize: 9, fontWeight: 500, lineHeight: 1.2,
                      color: sel ? color : 'var(--fg-mute)',
                      textAlign: 'center', maxWidth: '100%',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── Subcategoría pills ── */}
        {showSubcat && (
          <>
            <SLabel>Subcategoría</SLabel>
            <div style={{
              display: 'flex', gap: 6, padding: '0 16px',
              overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
            }}>
              <button
                onClick={() => setSubcat('')}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: subcat === '' ? 'var(--ink-3)' : 'var(--ink-2)',
                  color:      subcat === '' ? 'var(--fg)' : 'var(--fg-mute)',
                  border:     subcat === '' ? '1px solid var(--line)' : '1px solid var(--line)',
                }}
              >
                — Sin subcat.
              </button>
              {subcats.map(s => {
                const sel = s === subcat
                return (
                  <button
                    key={s}
                    onClick={() => setSubcat(s)}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: sel ? 'var(--amber)' : 'var(--ink-2)',
                      color:      sel ? 'var(--ink-0)' : 'var(--fg-dim)',
                      border:     sel ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <Rule />

        {/* ── Método de pago ── */}
        <SLabel>Método de pago</SLabel>
        <div style={{
          display: 'flex', gap: 6, padding: '0 16px',
          overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {METHODS.map(m => {
            const sel = m === method
            return (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: sel ? 'var(--amber)' : 'var(--ink-2)',
                  color:      sel ? 'var(--ink-0)' : 'var(--fg-dim)',
                  border:     sel ? 'none' : '1px solid var(--line)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m}
              </button>
            )
          })}
        </div>

        <Rule />

        {/* ── Cuenta ── */}
        {!isTransfer ? (
          <>
            <SLabel>Cuenta / Billetera</SLabel>
            <div style={{
              display: 'flex', gap: 8, padding: '0 16px',
              overflowX: 'auto', scrollbarWidth: 'none',
            }}>
              {accounts.map(acc => {
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
                      textAlign: 'left', minWidth: 120, transition: 'all .12s',
                    }}
                  >
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: acc.color, marginBottom: 2 }}>
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
          </>
        ) : (
          /* Transfer: from → to */
          <>
            <SLabel>Transferencia entre cuentas</SLabel>
            <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={account}
                onChange={e => setAccount(e.target.value)}
                style={{ ...inputSt, flex: 1 }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span style={{ color: 'var(--teal)', fontSize: 18, fontWeight: 700 }}>→</span>
              <select
                value={accountTo}
                onChange={e => setAccountTo(e.target.value)}
                style={{ ...inputSt, flex: 1 }}
              >
                {accounts.filter(a => a.id !== account).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </>
        )}

        <Rule />

        {/* ── Descripción ── */}
        <SLabel>Descripción</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Ej. Supermercado Plaza, Salario abril…"
            style={inputSt}
            maxLength={200}
          />
        </div>

        {/* ── Fecha ── */}
        <SLabel>Fecha</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ ...inputSt, colorScheme: 'dark' }}
          />
        </div>

        {/* ── Tasa BCV (editable por movimiento) ── */}
        <SLabel>Tasa BCV del movimiento</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={rateBCV}
              onChange={e => {
                const v = parseFloat(e.target.value) || 431.01
                setRateBCV(v)
                if (amountUSD) setAmountBs((parseFloat(amountUSD) * v).toFixed(2))
              }}
              style={{ ...inputSt, flex: 1, fontFamily: 'var(--f-num)', fontWeight: 600 }}
            />
            <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Bs / USD</span>
          </div>
        </div>

        {/* ── Registrado por ── */}
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
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: color,
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--ink-0)', flexShrink: 0,
                }}>
                  {label[0]}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: sel ? color : 'var(--fg-dim)' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Toggle recurrente ── */}
        <SLabel>Recurrente</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '13px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Guardar como recurrente</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
                Se registrará automáticamente cada mes
              </div>
            </div>
            <button
              onClick={() => setRecurrente(r => !r)}
              style={{
                width: 46, height: 26, borderRadius: 13, flexShrink: 0,
                background: recurrente ? 'var(--amber)' : 'var(--ink-3)',
                border: '2px solid', borderColor: recurrente ? 'var(--amber)' : 'var(--ink-4)',
                position: 'relative', transition: 'background .2s, border-color .2s',
              }}
              aria-label="Toggle recurrente"
            >
              <div style={{
                position: 'absolute', top: 3,
                left: recurrente ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                transition: 'left .2s',
              }} />
            </button>
          </div>

          {recurrente && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Día del mes</span>
              <select
                value={recDia}
                onChange={e => setRecDia(parseInt(e.target.value))}
                style={{ ...inputSt, flex: 1 }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Notas ── */}
        <SLabel>Notas (opcional)</SLabel>
        <div style={{ padding: '0 16px' }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales…"
            rows={2}
            style={{ ...inputSt, resize: 'none', lineHeight: 1.5 }}
            maxLength={200}
          />
        </div>

        {/* ── Save CTA ── */}
        <div style={{
          padding: '20px 16px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
          <button
            onClick={handleSave}
            disabled={!amountUSD || usdNum <= 0}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background:  saved ? 'var(--pos)' : ((!amountUSD || usdNum <= 0) ? 'var(--ink-3)' : 'var(--amber)'),
              fontSize: 15.5, fontWeight: 700,
              color:    saved || (!amountUSD || usdNum <= 0) ? 'var(--fg-mute)' : 'var(--ink-0)',
              letterSpacing: '.02em',
              boxShadow: saved ? '0 4px 20px rgba(88,178,106,.35)' : (usdNum > 0 ? '0 4px 20px rgba(224,168,74,.35)' : 'none'),
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
