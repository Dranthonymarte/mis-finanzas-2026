import { useState, useEffect, useRef, useMemo } from 'react'
import { type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CatIcon from '../components/ui/CatIcon'
import { catColor } from '../components/ui/catColor'
import { ArrowLeftIcon, CheckIcon } from '../components/icons/Icons'
import { useAccounts } from '../hooks/useAccounts'
import { useConfig } from '../hooks/useConfig'
import { useTasas } from '../hooks/useTasas'
import { useAuthStore } from '../store/auth'
import { supabase } from '../lib/supabase'
import { haptic } from '../lib/haptic'
import { mesIdToDbKey, dateToMesId } from '../lib/mes'

// ── Offline queue ──────────────────────────────────
const QUEUE_KEY = 'mf_offline_queue'
function queueOffline(mov: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const q: Record<string, unknown>[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...q, mov]))
  } catch { /* noop */ }
}
async function flushOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const q: Record<string, unknown>[] = JSON.parse(raw)
    if (!q.length) return
    const { error } = await supabase.from('movimientos').insert(q)
    if (!error) localStorage.removeItem(QUEUE_KEY)
  } catch { /* noop */ }
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

// ── Tipos que no muestran subcategoría ────────────
const TIPOS_SIN_SUBCAT = new Set([
  'Ajuste', 'Prestamo recibido', 'Prestamo pagado', 'Transferencia Interna',
])

// ── Color y signo por tipo ─────────────────────────
function tipoMeta(nombre: string, esIngreso: boolean): { color: string; sign: '' | '+' | '−' } {
  if (esIngreso) return { color: 'var(--pos)', sign: '+' }
  if (nombre.includes('Ahorro'))       return { color: 'var(--info)', sign: '' }
  if (nombre.includes('Transfer'))     return { color: 'var(--teal)', sign: '' }
  if (nombre.includes('Ajuste'))       return { color: 'var(--amber)', sign: '' }
  return { color: 'var(--neg)', sign: '−' }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

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

export default function NewTransaction() {
  const navigate    = useNavigate()
  const userName    = useAuthStore(s => s.userName)
  const householdId = useAuthStore(s => s.householdId)

  const { accounts: liveAccounts }       = useAccounts()
  const { config, updateConfig }         = useConfig()
  // BUG-7: destructure loading flag to know when tasas has loaded from DB
  const { tasas, loading: tasasLoading }  = useTasas()

  const accounts = useMemo(() => liveAccounts ?? [], [liveAccounts])
  const tipos    = config.tipos

  // ── Form state ─────────────────────────────────
  const [tipo,       setTipo]       = useState(tipos[0]?.nombre ?? 'Gasto')
  const [cat,        setCat]        = useState('')
  const [subcat,     setSubcat]     = useState('')
  const [amountUSD,  setAmountUSD]  = useState('')
  const [amountBs,   setAmountBs]   = useState('')
  const [method,     setMethod]     = useState(METHODS[0])
  const [account,    setAccount]    = useState('')
  const [accountTo,  setAccountTo]  = useState('')
  const [desc,       setDesc]       = useState('')
  const [fecha,      setFecha]      = useState(todayISO())
  const [autor,      setAutor]      = useState<'anthony' | 'isabel'>('anthony')
  const [recurrente, setRecurrente] = useState(false)
  const [recDia,     setRecDia]     = useState(1)
  const [notes,      setNotes]      = useState('')
  // Prefill con la tasa cacheada (useTasas es cache-first → tasas.bcv ya es un
  // valor real al montar). La casilla muestra la tasa del día de inmediato; el
  // efecto de abajo la sincroniza al valor de DB salvo que el usuario la edite.
  const [rateBCV,        setRateBCV]        = useState(tasas.bcv)
  const [rateStr,        setRateStr]        = useState(() => (tasas.bcv > 0 ? String(tasas.bcv) : ''))
  const [userEditedRate, setUserEditedRate] = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [confirm,       setConfirm]       = useState(false)  // confirmation sheet
  const [ahorroPositivo, setAhorroPositivo] = useState(true)

  // Sync BCV rate when tasas loads FROM DB — but not if user already edited it manually
  useEffect(() => {
    if (!userEditedRate && !tasasLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync DB-loaded BCV rate into form unless user edited it
      setRateBCV(tasas.bcv)
      setRateStr(String(tasas.bcv))
    }
  }, [tasas.bcv, tasasLoading, userEditedRate])

  // Read voice prefill from VozTxn (/voz page)
  useEffect(() => {
    const raw = sessionStorage.getItem('voz_prefill')
    if (!raw) return
    try {
      const { amount, desc: d } = JSON.parse(raw) as { amount: string; desc: string }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot prefill from VozTxn handoff (sessionStorage), runs once on mount
      if (amount) { setAmountUSD(amount); setAmountBs((parseFloat(amount) * tasas.bcv).toFixed(2)) }
      if (d)      setDesc(d)
    } catch { /* ignore malformed */ }
    sessionStorage.removeItem('voz_prefill')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Flush offline queue when online
  useEffect(() => {
    if (navigator.onLine) void flushOfflineQueue()
    const onOnline = () => void flushOfflineQueue()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // Set default account once — useRef prevents circular re-renders
  const initialAccountSet = useRef(false)
  useEffect(() => {
    if (!initialAccountSet.current && accounts.length > 0) {
      setAccount(accounts[0].id)
      setAccountTo(accounts[1]?.id ?? accounts[0].id)
      initialAccountSet.current = true
    }
  }, [accounts])

  // Sync tipo when config loads
  const initialTipoSet = useRef(false)
  useEffect(() => {
    if (!initialTipoSet.current && tipos.length > 0) {
      const first = tipos[0].nombre
      setTipo(first)
      const firstCat = config.categorias[first]?.[0] ?? ''
      setCat(firstCat)
      setSubcat(config.subcategorias[firstCat]?.[0] ?? '')
      initialTipoSet.current = true
    }
  }, [tipos, config.categorias, config.subcategorias])

  // ── Cascade: tipo → cat → subcat ──────────────
  function changeTipo(nombre: string) {
    setTipo(nombre)
    const firstCat = config.categorias[nombre]?.[0] ?? ''
    setCat(firstCat)
    setSubcat(config.subcategorias[firstCat]?.[0] ?? '')
  }

  function changeCat(c: string) {
    setCat(c)
    setSubcat(config.subcategorias[c]?.[0] ?? '')
  }

  // ── Bidirectional USD ↔ Bs ─────────────────────
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

  // ── Fetch historical rate when date changes ──
  async function fetchHistoricalRate(fechaSel: string) {
    const { data } = await supabase
      .from('tasas_historicas')
      .select('rate_bcv')
      .eq('household_key', 'anthony-isabel-2026')
      .lte('fecha', fechaSel)
      .order('fecha', { ascending: false })
      .limit(1)
    if (data?.[0]?.rate_bcv) {
      setRateBCV(data[0].rate_bcv)
      setRateStr(String(data[0].rate_bcv))
      setUserEditedRate(true)
    }
  }

  async function fetchBCVRate() {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      if (!res.ok) return
      const json = await res.json() as { promedio?: number; precio?: number }
      const rate = json.promedio ?? json.precio
      if (rate && rate > 0) { setRateBCV(rate); setRateStr(String(rate)); setUserEditedRate(true) }
    } catch { /* network error — silent */ }
  }

  const usdNum     = parseFloat(amountUSD) || 0
  const isTransfer = tipo === 'Transferencia Interna'
  const esAhorro   = tipo.includes('Ahorro')
  const tipoObj    = tipos.find(t => t.nombre === tipo) ?? { nombre: tipo, esIngreso: false }
  const meta       = tipoMeta(tipoObj.nombre, tipoObj.esIngreso)
  const cats       = config.categorias[tipo] ?? []
  const subcats    = config.subcategorias[cat] ?? []
  const showSubcat = !TIPOS_SIN_SUBCAT.has(tipo) && subcats.length > 0

  // ── Save ──────────────────────────────────────
  function handleSave() {
    if (!amountUSD || usdNum <= 0) return
    setConfirm(true)  // show confirmation sheet first
  }

  async function executeSave() {
    if (!amountUSD || usdNum <= 0) return
    setConfirm(false)
    // "may-26" → "Mayo" — DB stores Spanish month name
    const mes  = mesIdToDbKey(dateToMesId(new Date(fecha + 'T12:00:00')))
    const sign = tipoObj.esIngreso ? 1 : esAhorro ? (ahorroPositivo ? 1 : -1) : -1
    const movId = crypto.randomUUID()
    const mov  = {
      id:           movId,
      user_id:      householdId,   // RLS: movimientos.user_id = active_household_id()
      household_id: householdId,
      mes,
      descripcion:  desc || cat,
      tipo,
      cat,
      subcat:       subcat || '',  // NOT NULL — send '' instead of null
      amount:       sign * usdNum,
      amount_bs:    parseFloat(amountBs) || 0,
      method,
      fecha,
      author:       autor,
      rate_type:    'bcv' as const,
      rate_bcv:     rateBCV > 0 ? rateBCV : null,
      cuenta_id:    account || null,
      notas:        notes || null,
      // NOTE: 'recurrente' is NOT a DB column — stored in config.recurrentes JSONB
    }
    setSaved(true)
    const { error } = await supabase.from('movimientos').insert(mov)
    if (error) {
      const isOffline = !navigator.onLine || error.message?.includes('network') || error.message?.includes('fetch')
      if (isOffline) {
        queueOffline(mov as Record<string, unknown>)
        // Mostrar como guardado — se sincronizará cuando haya red
        haptic('success')
        setTimeout(() => navigate(-1), 400)
        return
      }
      console.error('[NewTxn] insert error:', error.message)
      haptic('error')
      setSaved(false)
      return
    }
    haptic('success')
    // If marked recurrente, append to config.recurrentes JSONB
    if (recurrente) {
      const nuevos = [
        ...config.recurrentes,
        {
          id:               movId,
          descripcion:      desc || cat,
          monto:            sign * usdNum,
          tipo,
          cat,
          recurrencia_dias: 30,      // monthly period
          recDia,                    // day of month (1-28) for the trigger
        },
      ]
      await updateConfig('recurrentes', nuevos)
    }
    setTimeout(() => navigate(-1), 400)
  }

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

        {/* ── Tipo selector ── */}
        <div style={{
          display: 'flex', gap: 6, padding: '14px 16px 0',
          overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {tipos.map(t => {
            const m   = tipoMeta(t.nombre, t.esIngreso)
            const sel = t.nombre === tipo
            const shortLabels: Record<string, string> = {
              'Ingreso Fijo':          'Ing. Fijo',
              'Ingreso Variable':      'Ing. Variable',
              'Ahorro en efectivo':    'Ahorro',
              'Transferencia Interna': 'Transferencia',
              'Prestamo recibido':     'Préstamo +',
              'Prestamo pagado':       'Préstamo −',
            }
            return (
              <button
                key={t.nombre}
                onClick={() => changeTipo(t.nombre)}
                style={{
                  flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                  fontSize: 12, fontWeight: 600,
                  background: sel ? `${m.color}18` : 'var(--ink-2)',
                  color:      sel ? m.color : 'var(--fg-mute)',
                  border:     sel ? `1.5px solid ${m.color}55` : '1px solid var(--line)',
                  transition: 'all .12s',
                }}
              >
                {shortLabels[t.nombre] ?? t.nombre}
              </button>
            )
          })}
        </div>

        {/* ── Amount hero ── */}
        <div style={{ padding: '16px 16px 10px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 40, color: meta.color, opacity: 0.55, lineHeight: 1 }}>
              {meta.sign || '$'}
            </span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
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
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Bs</span>
            <input
              type="number" inputMode="decimal" min="0"
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
          {tipo === 'Ajuste' && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)', background: 'var(--amber-d)', borderRadius: 8, padding: '4px 12px', display: 'inline-block' }}>
              ⚡ Ajuste de saldo — no afecta ingresos/gastos
            </div>
          )}
          {tasas.bcv > 0 && (
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 3, paddingLeft: 2 }}>
              Tasa BCV: {tasas.bcv.toFixed(2)} Bs/$
            </div>
          )}
        </div>

        <Rule />

        {/* ── Categoría grid ── */}
        {!isTransfer && cats.length > 0 && (
          <>
            <SLabel>Categoría</SLabel>
            {/* Gastos: 2-row horizontal scroll. Ingresos/Ahorro: static 4-col grid */}
            {(!tipoObj.esIngreso && !tipoObj.nombre.includes('Ahorro')) ? (
              <div style={{
                display: 'grid',
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(2, auto)',
                gap: 6,
                overflowX: 'auto',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                paddingBottom: 2,
                padding: '0 16px 2px',
              }}>
                {cats.map(c => {
                  const sel   = c === cat
                  const color = catColor(c)
                  return (
                    <button
                      key={c}
                      onClick={() => changeCat(c)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        padding: '9px 8px', borderRadius: 12, width: 76,
                        background: sel ? `${color}16` : 'var(--ink-2)',
                        border:     sel ? `1.5px solid ${color}55` : '1px solid var(--line)',
                        transition: 'all .12s', whiteSpace: 'nowrap',
                      }}
                    >
                      <CatIcon cat={c} size={34} />
                      <span style={{
                        fontSize: 9, fontWeight: 500, lineHeight: 1.2,
                        color: sel ? color : 'var(--fg-mute)',
                        textAlign: 'center', maxWidth: 68,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 16px' }}>
                {cats.map(c => {
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
            )}
          </>
        )}

        {/* ── Subcategoría pills ── */}
        {showSubcat && (
          <>
            <SLabel>Subcategoría</SLabel>
            <div style={{ display: 'flex', gap: 6, padding: '0 16px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSubcat('')}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: subcat === '' ? 'var(--ink-3)' : 'var(--ink-2)',
                  color:      subcat === '' ? 'var(--fg)' : 'var(--fg-mute)',
                  border: '1px solid var(--line)',
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
        <div style={{ display: 'flex', gap: 6, padding: '0 16px', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
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
            <div style={{ display: 'flex', gap: 8, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
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
          <>
            <SLabel>Transferencia entre cuentas</SLabel>
            <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={account} onChange={e => setAccount(e.target.value)} style={{ ...inputSt, flex: 1 }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span style={{ color: 'var(--teal)', fontSize: 18, fontWeight: 700 }}>→</span>
              <select value={accountTo} onChange={e => setAccountTo(e.target.value)} style={{ ...inputSt, flex: 1 }}>
                {accounts.filter(a => a.id !== account).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </>
        )}

        <Rule />

        {/* ── Ahorro +/− toggle ── */}
        {esAhorro && (
          <div style={{ padding: '0 16px', marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[true, false].map(pos => (
                <button
                  key={String(pos)}
                  type="button"
                  onClick={() => setAhorroPositivo(pos)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: ahorroPositivo === pos ? (pos ? 'rgba(88,178,106,.18)' : 'rgba(214,106,90,.18)') : 'var(--ink-2)',
                    border: ahorroPositivo === pos ? `1.5px solid ${pos ? 'var(--pos)' : 'var(--neg)'}` : '1px solid var(--line)',
                    color: ahorroPositivo === pos ? (pos ? 'var(--pos)' : 'var(--neg)') : 'var(--fg-mute)',
                    cursor: 'pointer',
                  }}
                >
                  {pos ? '+ Depositar' : '− Retirar'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Descripción ── */}
        <SLabel>Descripción</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Ej. Supermercado Plaza, Salario abril…"
            style={inputSt} maxLength={200}
          />
        </div>

        {/* ── Fecha ── */}
        <SLabel>Fecha</SLabel>
        <div style={{ padding: '0 16px' }}>
          <input
            type="date" value={fecha}
            onChange={e => { setFecha(e.target.value); void fetchHistoricalRate(e.target.value) }}
            style={{ ...inputSt, colorScheme: 'dark' }}
          />
        </div>

        {/* ── Tasa BCV ── */}
        <SLabel>Tasa BCV del movimiento</SLabel>
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number" inputMode="decimal" value={rateStr}
              onChange={e => {
                const raw = e.target.value
                setRateStr(raw)               // keep raw text so partial/empty input is allowed
                setUserEditedRate(true)
                const v = parseFloat(raw)
                if (!isNaN(v) && v > 0) {
                  setRateBCV(v)
                  if (amountUSD) setAmountBs((parseFloat(amountUSD) * v).toFixed(2))
                }
              }}
              onBlur={() => {
                // Normalize on blur: empty/invalid → fall back to current rate
                const v = parseFloat(rateStr)
                if (isNaN(v) || v <= 0) { setRateStr(String(rateBCV)) }
              }}
              style={{ ...inputSt, flex: 1, fontFamily: 'var(--f-num)', fontWeight: 600 }}
            />
            <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Bs / USD</span>
            <button
              type="button"
              onClick={() => void fetchBCVRate()}
              style={{
                padding: '4px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                color: 'var(--amber)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Obtener BCV
            </button>
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
                key={id} onClick={() => setAutor(id)}
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

        {/* ── Recurrente ── */}
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
                position: 'absolute', top: 3, left: recurrente ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                transition: 'left .2s',
              }} />
            </button>
          </div>
          {recurrente && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-mute)', whiteSpace: 'nowrap' }}>Día del mes</span>
              <select value={recDia} onChange={e => setRecDia(parseInt(e.target.value))} style={{ ...inputSt, flex: 1 }}>
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
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales…" rows={2}
            style={{ ...inputSt, resize: 'none', lineHeight: 1.5 }} maxLength={200}
          />
        </div>

        {/* ── Save CTA ── */}
        <div style={{ padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={handleSave}
            disabled={!amountUSD || usdNum <= 0}
            style={{
              width: '100%', padding: '16px', borderRadius: 16,
              background:  saved ? 'var(--pos)' : ((!amountUSD || usdNum <= 0) ? 'var(--ink-3)' : 'var(--amber)'),
              fontSize: 15.5, fontWeight: 700,
              color:    saved || (!amountUSD || usdNum <= 0) ? 'var(--fg-mute)' : 'var(--ink-0)',
              letterSpacing: '.02em',
              boxShadow: saved ? '0 4px 20px rgba(88,178,106,.35)' : (usdNum > 0 ? '0 4px 20px rgba(var(--amber-rgb),.35)' : 'none'),
              transition: 'background .2s, box-shadow .2s',
            }}
          >
            {saved ? '✓  Guardado' : 'Guardar movimiento'}
          </button>
        </div>

      </div>

      {/* ── Confirmation sheet ────────────────────── */}
      {confirm && (
        <>
          <div
            onClick={() => setConfirm(false)}
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
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Confirmar movimiento
              </div>
              <div className="num" style={{ fontSize: 40, fontWeight: 700, color: meta.color, lineHeight: 1 }}>
                ${amountUSD}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>{desc || cat || tipo}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 4 }}>
                {tipo} · {cat}{subcat ? ` · ${subcat}` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 4 }}>
                {new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                {' · '}BCV {rateBCV.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$
              </div>
              {recurrente && (
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>
                  🔁 Se guardará como recurrente (día {recDia})
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'var(--ink-3)', border: '1px solid var(--line)',
                  fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={executeSave}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'var(--amber)', border: 'none',
                  fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
