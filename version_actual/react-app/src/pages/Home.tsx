// ═══════════════════════════════════════════════════
// Home — Dashboard principal (BLOQUE 2)
// 11 secciones: header+mes+moneda, patrimonio, saldo
// disponible, quick actions, KPIs, barchart 6M,
// fondo emergencia, top gastos, pronóstico, IA, txns
// ═══════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Sparkline          from '../components/ui/Sparkline'
import Pill               from '../components/ui/Pill'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { MOCK_BALANCE_SERIES, MOCK_KPIS, txnGroup, type Transaction } from '../data/mock'
import { useAccounts }     from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { useConfig }       from '../hooks/useConfig'
import { useKPIs }         from '../hooks/useKPIs'
import { useDineroFuera }  from '../hooks/useDineroFuera'
import { useFormat }       from '../hooks/useFormat'
import { usePrefsStore, type Moneda } from '../store/prefs'
import { useAuthStore }    from '../store/auth'
import { supabase }        from '../lib/supabase'
import { generateMeses, mesLabel, mesIdToDbKey, dateToMesId } from '../lib/mes'
import { DEFAULTS } from '../hooks/useConfig'
import { BellIcon } from '../components/icons/Icons'

const MONTHS_6 = generateMeses(6)

/** Next calendar month id (for "abrir mes siguiente" button) */
function nextMesId(): string {
  const now = new Date()
  return dateToMesId(new Date(now.getFullYear(), now.getMonth() + 1, 1))
}

/* ── Bar chart custom tooltip ── */
function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  const { fmt } = useFormat()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--ink-3)', border: '1px solid var(--line)',
      borderRadius: 10, padding: '8px 12px', fontSize: 11.5,
    }}>
      <div style={{ color: 'var(--fg-mute)', fontSize: 10, marginBottom: 5, letterSpacing: '.06em' }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600, lineHeight: 1.6 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

/* ── User avatar ── */
function Avatar({ letter }: { letter: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--teal), var(--amber))',
      display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: 13, color: 'var(--ink-0)', flexShrink: 0,
    }}>{letter}</div>
  )
}

/* ── Icon circle button ── */
const iBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: 'var(--ink-2)', border: '1px solid var(--line)',
  display: 'grid', placeItems: 'center', color: 'var(--fg-dim)',
  cursor: 'pointer',
}

/* ── Pill button ── */
function PillBtn({
  primary, children, onClick,
}: { primary?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 11.5,
        background: primary ? 'var(--amber)' : 'transparent',
        color:      primary ? 'var(--ink-0)' : 'var(--fg-dim)',
        border:     primary ? 'none' : '1px solid var(--line)',
        fontWeight: 500, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/* ── TxnRow preview ── */
function TxnRowPreview({ t, last }: { t: Transaction; last: boolean }) {
  const { fmt }  = useFormat()
  const navigate = useNavigate()
  const group = txnGroup(t.tipo)
  const isInc = group === 'ingreso'
  const isSav = group === 'ahorro'
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
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.desc}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
          {t.cat && <span>{t.cat}</span>}
          {t.cat && t.time && <span>·</span>}
          {t.time && <span>{t.time}</span>}
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
        {fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

/* ── Section label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
      textTransform: 'uppercase', color: 'var(--fg-mute)',
      paddingBottom: 8,
    }}>
      {children}
    </div>
  )
}

export default function Home() {
  const navigate  = useNavigate()
  const mesActivo      = usePrefsStore(s => s.mesActivo)
  const setMesActivo   = usePrefsStore(s => s.setMesActivo)
  const ocultarMontos  = usePrefsStore(s => s.ocultarMontos)
  const toggleOcultar  = usePrefsStore(s => s.toggleOcultarMontos)
  const moneda         = usePrefsStore(s => s.moneda)
  const setMoneda      = usePrefsStore(s => s.setMoneda)
  const householdId    = useAuthStore(s => s.householdId)
  const userName       = useAuthStore(s => s.userName)

  const { accounts: liveAccounts }  = useAccounts()
  const { transactions: liveTxns }  = useTransactions(mesActivo)
  const { config }                  = useConfig()
  const kpiData                     = useKPIs(liveTxns, config)
  const { fmt, fmtShort }           = useFormat()
  const { meDebenActivo }           = useDineroFuera()

  // ── Stats consolidadas: 5M historial + ahorro + ingresos históricos (1 RPC) ──
  interface MonthKPI { month: string; ingresos: number; gastos: number }
  const [histKPIs,          setHistKPIs]          = useState<MonthKPI[]>([])
  const [ahorroAcumulado,   setAhorroAcumulado]   = useState<number>(0)
  const [ingresosHistoricos, setIngresosHistoricos] = useState<number>(0)

  useEffect(() => {
    if (!householdId) return
    const months5     = generateMeses(6).slice(0, 5)
    const incomeTipos = DEFAULTS.tipos.filter(t => t.esIngreso).map(t => t.nombre)
    supabase.rpc('get_home_stats', {
      p_household_id: householdId,
      p_income_tipos: incomeTipos,
      p_months:       months5.map(m => m.dbKey),
    }).then(({ data }) => {
      if (!data) return
      setAhorroAcumulado(parseFloat(String(data.ahorro_acumulado)) || 0)
      setIngresosHistoricos(parseFloat(String(data.ingresos_historicos)) || 0)
      const dbKeyToLabel = Object.fromEntries(months5.map(m => [m.dbKey, m.label.split(' ')[0]]))
      const rows = (data.hist_kpis ?? []) as Array<{ mes: string; ingresos: number; gastos: number }>
      setHistKPIs(months5.map(m => {
        const row = rows.find(r => r.mes === m.dbKey)
        return { month: dbKeyToLabel[m.dbKey] ?? m.dbKey, ingresos: row?.ingresos ?? 0, gastos: row?.gastos ?? 0 }
      }))
    })
  }, [householdId])

  // ── Fondo emergencia desde tabla fondo_emergencia ──
  const [efDbBalance, setEfDbBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!householdId) return
    const dbKey = mesIdToDbKey(mesActivo)
    supabase
      .from('fondo_emergencia')
      .select('monto')
      .eq('user_id', householdId)
      .eq('mes', dbKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.monto != null) setEfDbBalance(parseFloat(String(data.monto)))
      })
  }, [householdId, mesActivo])

  // ── Saldo disponible = cuentas líquidas (excluye AHORRO) ──
  // (fmt() luego convierte USD → moneda activa: USD/BS/EUR)
  const saldoDisponible = (liveAccounts ?? [])
    .filter(a => !a.type.toUpperCase().includes('AHORRO'))
    .reduce((s, a) => s + (a.balanceUSD ?? a.balance), 0)

  // ── Patrimonio = TODAS las cuentas (incl. ahorro) + me deben ──
  const totalActivos = (liveAccounts ?? [])
    .reduce((s, a) => s + (a.balanceUSD ?? a.balance), 0)
  const patrimony = totalActivos + meDebenActivo

  // ── Tasa ahorro = ahorro del mes / ingresos ──
  const savingsRate = kpiData.ingresos > 0
    ? (kpiData.ahorro / kpiData.ingresos) * 100
    : 0

  // ── KPI cards ──
  // [2] neto  = ingresos − gastos (signo explícito, rojo/verde en render)
  // [3] ahorro = suma tipo 'Ahorro en efectivo' mes activo; tasa fusionada en subtexto
  const kpis = liveTxns ? [
    { ...MOCK_KPIS[0], value: kpiData.ingresos },
    { ...MOCK_KPIS[1], value: kpiData.gastos   },
    { ...MOCK_KPIS[2], id: 'neto',   label: 'Neto',   value: kpiData.balance },
    { ...MOCK_KPIS[3], id: 'ahorro', label: 'Ahorro', value: kpiData.ahorro, suffix: undefined },
  ] : MOCK_KPIS

  // ── Bar chart 6M: 5 meses reales + mes activo ──
  const incomeVsExp = useMemo(() => {
    const base = histKPIs.length === 5
      ? histKPIs
      : [
          { month: 'Nov', ingresos: 0, gastos: 0 },
          { month: 'Dic', ingresos: 0, gastos: 0 },
          { month: 'Ene', ingresos: 0, gastos: 0 },
          { month: 'Feb', ingresos: 0, gastos: 0 },
          { month: 'Mar', ingresos: 0, gastos: 0 },
        ]
    const cur = mesLabel(mesActivo).split(' ')[0]
    return [...base, { month: cur, ingresos: kpiData.ingresos, gastos: kpiData.gastos }]
  }, [histKPIs, kpiData.ingresos, kpiData.gastos, mesActivo])

  const [showEfInfo, setShowEfInfo] = useState(false)

  // ── Fondo emergencia = 30% de ingresos históricos acumulados ──
  // No asociado a cuentas. Reserva automática calculada sobre ingresos.
  const fondoEmergenciaTotal = ingresosHistoricos * 0.30
  const fondoEmergenciaMes   = kpiData.ingresos   * 0.30
  const emergencyBalance     = fondoEmergenciaTotal
  const emergencyTarget      = efDbBalance ?? (kpiData.gastos > 0 ? kpiData.gastos * 3 : 3000)
  const efContribMes         = fondoEmergenciaMes
  // ── Meta editable (persisted in localStorage) ──
  const [efMeta, setEfMeta] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem('mf-ef-meta') || '') || 0 } catch { return 0 }
  })
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaInput,   setMetaInput]   = useState('')
  const displayTarget = efMeta > 0 ? efMeta : emergencyTarget
  const emergencyPct      = displayTarget > 0 ? Math.min(100, (emergencyBalance / displayTarget) * 100) : 0
  const emergencyMonths   = kpiData.gastos > 0 ? (emergencyBalance / kpiData.gastos).toFixed(1) : '0'

  // ── Top 4 categorías de gasto ──
  const topGastos = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const t of liveTxns ?? []) {
      if (txnGroup(t.tipo) === 'gasto')
        totals[t.cat] = (totals[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([cat, value]) => ({ cat, value }))
  }, [liveTxns])

  // ── Pronóstico 30D — incluye recurrentes pendientes del mes ──
  const today        = new Date()
  const daysElapsed  = Math.max(1, today.getDate())
  const daysInMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dailySpend   = kpiData.gastos / daysElapsed

  // Recurrentes mensuales cuyos recDia aún no han llegado este mes
  const tiposEsIngreso = new Set(config.tipos.filter(t => t.esIngreso).map(t => t.nombre))
  const recsPendientes = config.recurrentes.filter(r =>
    r.recurrencia_dias <= 31 && (r.recDia ?? 15) > today.getDate()
  )
  const recIngresoPend = recsPendientes
    .filter(r => tiposEsIngreso.has(r.tipo))
    .reduce((s, r) => s + Math.abs(r.monto), 0)
  const recGastoPend   = recsPendientes
    .filter(r => !tiposEsIngreso.has(r.tipo))
    .reduce((s, r) => s + Math.abs(r.monto), 0)

  const projected30  = dailySpend * 30 + recGastoPend
  const savedByEOM   = (kpiData.ingresos + recIngresoPend) - (dailySpend * daysInMonth + recGastoPend)

  const recentTxns = (liveTxns ?? []).slice(0, 5)
  const [openKpiInfo, setOpenKpiInfo] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ─── 1. HEADER ─── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px', gap: 10 }}>
        <Avatar letter={(userName?.[0] ?? 'A').toUpperCase()} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1 }}>Hola,</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>{userName ?? 'Tú'}</div>
        </div>
        <button onClick={toggleOcultar} style={iBtn} aria-label="Ocultar montos">
          <span style={{ fontSize: 16 }}>{ocultarMontos ? '🙈' : '👁'}</span>
        </button>
        <button
          onClick={() => navigate('/notificaciones')}
          style={{ ...iBtn, position: 'relative' }} aria-label="Notificaciones"
        >
          <BellIcon />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)',
          }} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          style={iBtn} aria-label="Configuración"
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>⚙</span>
        </button>
      </div>

      {/* Selector de mes */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 4px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {MONTHS_6.map(m => {
          const isActive = m.id === mesActivo
          return (
            <button
              key={m.id}
              onClick={() => setMesActivo(m.id)}
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: isActive ? 'var(--amber)' : 'var(--ink-2)',
                color:      isActive ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     isActive ? 'none' : '1px solid var(--line)',
              }}
            >
              {m.label}
            </button>
          )
        })}
        {/* Abrir mes siguiente */}
        {(() => {
          const nid = nextMesId()
          const isActive = mesActivo === nid
          return (
            <button
              onClick={() => setMesActivo(nid)}
              title="Abrir mes siguiente"
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: isActive ? 'var(--amber)' : 'rgba(224,168,74,.1)',
                color:      isActive ? 'var(--ink-0)' : 'var(--amber)',
                border:     isActive ? 'none' : '1px dashed rgba(224,168,74,.4)',
              }}
            >
              {isActive ? mesLabel(nid).split(' ')[0] : '+ Nuevo mes'}
            </button>
          )
        })()}
      </div>

      {/* Pills moneda */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 6px' }}>
        {(['USD','BS','EUR'] as Moneda[]).map(m => (
          <button
            key={m}
            onClick={() => setMoneda(m)}
            style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: moneda === m ? 'var(--amber)' : 'var(--ink-2)',
              color:      moneda === m ? 'var(--ink-0)' : 'var(--fg-mute)',
              border:     moneda === m ? 'none' : '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >{m}</button>
        ))}
      </div>

      {/* ─── 2. PATRIMONIO HERO ─── */}
      <div style={{ padding: '14px 22px 8px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
          Patrimonio neto · {moneda}
        </div>
        <div className="font-display" style={{ fontSize: 44, lineHeight: 1, letterSpacing: '-.02em', marginTop: 6 }}>
          {fmt(patrimony)}
        </div>
        <div style={{ marginTop: 16 }}>
          <Sparkline data={MOCK_BALANCE_SERIES} color="var(--amber)" w={350} h={36} fill stroke={1.8} />
        </div>
      </div>

      {/* ─── 3. SALDO DISPONIBLE + NETO MES ─── */}
      <div style={{ padding: '4px 16px 8px' }}>
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '12px 0',
          display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
        }}>
          <div style={{ padding: '0 14px' }}>
            <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Saldo disponible
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
              {fmt(saldoDisponible)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 3 }}>Activos disponibles</div>
          </div>
          <div style={{ background: 'var(--line)', margin: '4px 0' }} />
          <div style={{ padding: '0 14px' }}>
            <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Neto {mesLabel(mesActivo).split(' ')[0]}
            </div>
            <div className="num" style={{
              fontSize: 18, fontWeight: 700,
              color: kpiData.balance >= 0 ? 'var(--pos)' : 'var(--neg)',
            }}>
              {kpiData.balance >= 0 ? '+' : ''}{fmt(kpiData.balance)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 3 }}>
              Ing − Gas
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. QUICK ACTIONS ─── */}
      <div style={{ padding: '4px 16px 4px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { emoji: '＋', l: 'Añadir',     c: 'var(--amber)', onClick: () => navigate('/new-txn')  },
          { emoji: '⇄',  l: 'Transferir', c: 'var(--teal)',  onClick: () => navigate('/transfer') },
          { emoji: '⊡',  l: 'Escanear',  c: 'var(--info)',  onClick: () => {}                    },
          { emoji: '✦',  l: 'IA',         c: '#b0a3c7',     onClick: () => navigate('/ia')        },
        ].map(a => (
          <button
            key={a.l}
            onClick={a.onClick}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20, color: a.c, lineHeight: 1 }}>{a.emoji}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-dim)', fontWeight: 500 }}>{a.l}</span>
          </button>
        ))}
      </div>

      {/* ─── 5. KPI CARDS 2×2 ─── */}
      {(() => {
        const KPI_INFO: Record<string, string> = {
          ingresos: 'Todo el dinero que entró este mes: salarios, ventas, transferencias recibidas, etc.',
          gastos:   'Todo lo que gastaste este mes en compras, servicios, facturas y pagos.',
          neto:     'Ingresos menos gastos. Positivo = ahorraste. Negativo = gastaste más de lo que ingresaste.',
          ahorro:   'Movimientos registrados como "Ahorro en efectivo". La tasa es ahorro ÷ ingresos del mes.',
        }
        return (
          <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kpis.map(k => {
              const good     = k.neg ? k.delta < 0 : k.delta > 0
              const infoOpen = openKpiInfo === k.id

              let value: React.ReactNode
              let color = 'inherit'
              let extraRow: React.ReactNode = null

              if (k.id === 'neto') {
                const isPos = kpiData.balance >= 0
                color = isPos ? 'var(--pos)' : 'var(--neg)'
                value = (isPos ? '+' : '') + fmt(kpiData.balance)
              } else if (k.id === 'ahorro') {
                value = fmt(kpiData.ahorro)
                extraRow = (
                  <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', marginTop: 4 }}>
                    {savingsRate.toFixed(1)}% de ingresos
                  </div>
                )
              } else {
                value = k.suffix ? `${k.value}${k.suffix}` : fmt(k.value)
              }

              return (
                <div key={k.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                        {k.label}
                      </span>
                      <button
                        onClick={() => setOpenKpiInfo(infoOpen ? null : k.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-mute)', fontSize: 11, padding: '0 2px', lineHeight: 1, opacity: 0.65 }}
                        aria-label={`Qué es ${k.label}`}
                      >ℹ</button>
                    </div>
                    <Pill tone={good ? 'pos' : 'neg'} size="xs">
                      {k.delta > 0 ? '+' : ''}{k.delta}%
                    </Pill>
                  </div>
                  {infoOpen && (
                    <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 6, lineHeight: 1.5, background: 'var(--ink-3)', borderRadius: 8, padding: '6px 8px' }}>
                      {KPI_INFO[k.id]}
                    </div>
                  )}
                  <div className="num" style={{ fontSize: 17, fontWeight: 600, color }}>
                    {value}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <Sparkline
                      data={k.spark}
                      color={k.id === 'neto' ? color : k.id === 'ahorro' ? 'var(--amber)' : k.neg ? 'var(--neg)' : 'var(--amber)'}
                      w={140} h={18} fill stroke={1.4}
                    />
                  </div>
                  {extraRow}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ─── 5b. AHORRO ACUMULADO ─── */}
      {ahorroAcumulado > 0 && (
        <div style={{ padding: '4px 16px' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '12px 14px',
            display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
          }}>
            <div style={{ padding: '0 8px 0 0' }}>
              <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                💰 Ahorro acumulado
              </div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos)' }}>
                {fmt(ahorroAcumulado)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2 }}>Todos los meses</div>
            </div>
            <div style={{ background: 'var(--line)', margin: '4px 0' }} />
            <div style={{ padding: '0 0 0 14px' }}>
              <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Este mes
              </div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: kpiData.ahorro > 0 ? 'var(--pos)' : 'var(--fg-mute)' }}>
                {fmt(kpiData.ahorro)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2 }}>Cochinito</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. INGRESOS VS GASTOS 6M ─── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '14px 14px 10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
              Ingresos vs Gastos
            </span>
            <div style={{ display: 'flex', gap: 10, fontSize: 9.5, fontWeight: 600 }}>
              <span style={{ color: '#58b26a' }}>● Ing</span>
              <span style={{ color: '#d66a5a' }}>● Gas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={incomeVsExp} barCategoryGap="35%" barGap={3} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#5c616d', fontSize: 9.5 }} axisLine={false} tickLine={false} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#58b26a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos"   name="Gastos"   fill="#d66a5a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── 7. FONDO EMERGENCIA ─── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 4 }}>
                Reserva recomendada
                <button onClick={() => setShowEfInfo(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-mute)', fontSize: 11, padding: '0 2px', lineHeight: 1 }} aria-label="Qué es esto">ℹ</button>
              </div>
              {showEfInfo && (
                <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 6, lineHeight: 1.5, maxWidth: 220 }}>
                  Es el colchón financiero ideal: 30% de todos tus ingresos acumulados ({fmt(ingresosHistoricos)}). Cubre 3–4 meses de imprevistos si perdieras ingresos.
                </div>
              )}
              <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(emergencyBalance)}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2 }}>
                30% de ingresos acumulados · Este mes: {fmt(fondoEmergenciaMes)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {editingMeta ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={metaInput}
                    autoFocus
                    onChange={e => setMetaInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = parseFloat(metaInput)
                        if (!isNaN(v) && v > 0) { localStorage.setItem('mf-ef-meta', String(v)); setEfMeta(v) }
                        setEditingMeta(false)
                      }
                      if (e.key === 'Escape') setEditingMeta(false)
                    }}
                    onBlur={() => {
                      const v = parseFloat(metaInput)
                      if (!isNaN(v) && v > 0) { localStorage.setItem('mf-ef-meta', String(v)); setEfMeta(v) }
                      setEditingMeta(false)
                    }}
                    placeholder="Meta USD"
                    style={{
                      width: 80, background: 'var(--ink-3)', border: '1px solid var(--amber)',
                      borderRadius: 7, padding: '4px 7px', fontSize: 12, color: 'var(--fg)',
                      outline: 'none', textAlign: 'right',
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setMetaInput(String(efMeta > 0 ? efMeta : Math.round(displayTarget))); setEditingMeta(true) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: 0,
                  }}
                  title="Toca para editar meta"
                >
                  <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 2 }}>
                    Meta: {fmt(displayTarget)} ✎
                  </div>
                  <div className="num" style={{
                    fontSize: 18, fontWeight: 700,
                    color: emergencyPct >= 100 ? 'var(--pos)' : emergencyPct >= 50 ? 'var(--amber)' : 'var(--neg)',
                  }}>
                    {emergencyMonths}m
                  </div>
                </button>
              )}
            </div>
          </div>
          <div style={{ height: 7, background: 'var(--ink-3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width .4s ease',
              width: `${emergencyPct}%`,
              background: emergencyPct >= 100 ? 'var(--pos)' : emergencyPct >= 66 ? 'var(--amber)' : 'var(--neg)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9.5, color: 'var(--fg-mute)' }}>
            <span>0m</span><span>1m</span><span>2m</span>
            <span style={{ color: emergencyPct >= 100 ? 'var(--pos)' : 'inherit' }}>3m ✓</span>
          </div>
          {efContribMes > 0 && (
            <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', marginTop: 6, textAlign: 'center' }}>
              Aporte sugerido este mes: {fmt(efContribMes)}
            </div>
          )}
        </div>
      </div>

      {/* ─── 8. TOP GASTOS POR CATEGORÍA ─── */}
      {topGastos.length > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px',
          }}>
            <SectionLabel>Top gastos — {mesLabel(mesActivo)}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topGastos.map(({ cat, value }) => {
                const pct   = kpiData.gastos > 0 ? (value / kpiData.gastos) * 100 : 0
                const color = catColor(cat)
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <CatIcon cat={cat} size={22} />
                      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--fg-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat}
                      </span>
                      <span className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmt(value)}</span>
                      <span style={{ fontSize: 10, color: 'var(--fg-mute)', minWidth: 28, textAlign: 'right' }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--ink-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. PRONÓSTICO 30D ─── */}
      {kpiData.gastos > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 10 }}>
              Pronóstico de gasto
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr' }}>
              {([
                { label: 'Ritmo diario',   value: fmtShort(dailySpend),              color: 'var(--fg)'  },
                null,
                { label: 'Próx. 30 días',  value: fmtShort(projected30),             color: 'var(--neg)' },
                null,
                { label: 'Ahorro est.',    value: fmtShort(Math.abs(savedByEOM)),    color: savedByEOM >= 0 ? 'var(--pos)' : 'var(--neg)' },
              ] as Array<{ label: string; value: string; color: string } | null>).map((col, i) =>
                col === null
                  ? <div key={i} style={{ background: 'var(--line)', margin: '2px 0' }} />
                  : (
                    <div key={col.label} style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 14, fontWeight: 700, color: col.color }}>
                        {savedByEOM < 0 && col.label === 'Ahorro est.' ? '−' : ''}{col.value}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--fg-mute)', marginTop: 3, lineHeight: 1.2 }}>
                        {col.label}
                      </div>
                    </div>
                  )
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
              {daysElapsed}d transcurridos de {daysInMonth} · {fmt(dailySpend)}/día
            </div>
          </div>
        </div>
      )}

      {/* ─── 9b. KPI INSIGHTS ─── */}
      {liveTxns && liveTxns.length > 0 && (() => {
        const superavit    = kpiData.ingresos - kpiData.gastos
        const savRate      = kpiData.ingresos > 0 ? (kpiData.ahorro / kpiData.ingresos) * 100 : 0
        const efPct        = emergencyTarget > 0 ? Math.min(100, (emergencyBalance / emergencyTarget) * 100) : 0
        const topCat       = topGastos[0]
        const topPct       = topCat && kpiData.gastos > 0 ? (topCat.value / kpiData.gastos) * 100 : 0

        // savProxy: máx entre ahorro directo y superávit positivo del mes
        const savProxy = Math.max(kpiData.ahorro, Math.max(0, kpiData.balance))
        const savRateScore = kpiData.ingresos > 0 ? (savProxy / kpiData.ingresos) * 100 : 0
        // Score: superávit(25) + ahorro≥20%(25) + ef≥20%(25) + gastos<ingresos(25)
        const score = Math.round(
          (superavit > 0 ? 25 : 0) +
          (savRateScore >= 20 ? 25 : savRateScore > 0 ? savRateScore / 20 * 25 : 0) +
          (efPct >= 100 ? 25 : efPct / 100 * 25) +
          (kpiData.gastos < kpiData.ingresos ? 25 : 0)
        )

        const insights: Array<{ icon: string; text: string; color?: string }> = []
        if (superavit > 0) insights.push({ icon: '✅', text: `Superávit de ${fmt(superavit)} — excelente gestión este mes.`, color: 'var(--pos)' })
        else insights.push({ icon: '⚠️', text: `Déficit de ${fmt(Math.abs(superavit))} — gastos superan ingresos.`, color: 'var(--neg)' })
        if (kpiData.ingresos > 0) {
          insights.push({
            icon: savRate >= 20 ? '✅' : '⚠️',
            text: `Tasa de ahorro: ${savRate.toFixed(0)}%${savRate < 20 ? '. Meta recomendada: 20%.' : ' — dentro de la meta.'}`,
            color: savRate >= 20 ? 'var(--pos)' : 'var(--amber)',
          })
        }
        if (efPct < 100 && emergencyBalance > 0) {
          insights.push({ icon: '🆘', text: `Fondo de emergencia al ${efPct.toFixed(0)}%. Meta: ${fmt(emergencyTarget)}. Considera reforzarlo.`, color: 'var(--amber)' })
        }
        if (topCat) {
          insights.push({ icon: '📊', text: `Top gasto: "${topCat.cat}" — ${fmt(topCat.value)} (${topPct.toFixed(0)}% del total).` })
        }

        return (
          <div style={{ padding: '12px 16px 4px' }}>
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
                  Score financiero
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                  background: score >= 75 ? 'rgba(88,178,106,.15)' : score >= 50 ? 'rgba(224,168,74,.15)' : 'rgba(214,106,90,.15)',
                  color:      score >= 75 ? 'var(--pos)'           : score >= 50 ? 'var(--amber)'          : 'var(--neg)',
                }}>
                  {score}/100
                </div>
              </div>
              <div style={{ height: 5, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width .5s',
                  width: `${score}%`,
                  background: score >= 75 ? 'var(--pos)' : score >= 50 ? 'var(--amber)' : 'var(--neg)',
                }} />
              </div>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '5px 0',
                  borderBottom: i < insights.length - 1 ? '1px solid var(--ink-3)' : 'none',
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{ins.icon}</span>
                  <span style={{ fontSize: 12, lineHeight: 1.4, color: ins.color ?? 'var(--fg-dim)' }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ─── 10. ANÁLISIS IA ─── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          padding: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, var(--amber-d) 0%, transparent 75%), var(--ink-2)',
          border: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: 'var(--amber)', color: 'var(--ink-0)',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
            }}>✦</div>
            <span style={{ fontSize: 9.5, letterSpacing: '.12em', color: 'var(--amber)', textTransform: 'uppercase', fontWeight: 600 }}>
              Análisis IA
            </span>
            <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 'auto' }}>en vivo</span>
          </div>
          <div className="font-display" style={{ fontSize: 15, lineHeight: 1.45 }}>
            {kpiData.gastos > kpiData.ingresos
              ? <>Tus gastos superan los ingresos este mes.{' '}
                  <span style={{ color: 'var(--neg)' }}>Revisa tu presupuesto.</span></>
              : <>Tasa de ahorro{' '}
                  <span style={{ color: 'var(--pos)' }}>{savingsRate.toFixed(0)}%</span>
                  {' '}en {mesLabel(mesActivo)}. {savingsRate >= 20 ? '🎯 Excelente.' : '¡Sigue así!'}</>
            }
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <PillBtn primary onClick={() => navigate('/ia')}>Preguntar IA</PillBtn>
          </div>
        </div>
      </div>

      {/* ─── 11. ÚLTIMAS TRANSACCIONES ─── */}
      <div style={{ padding: '14px 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 400 }}>Últimos movimientos</h2>
          <button
            onClick={() => navigate('/txn')}
            style={{ fontSize: 11.5, color: 'var(--amber)', fontWeight: 600, cursor: 'pointer' }}
          >
            Ver todos →
          </button>
        </div>
        {recentTxns.length > 0 ? (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {recentTxns.map((t, i, arr) => (
              <TxnRowPreview key={t.id} t={t} last={i === arr.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '28px', textAlign: 'center', color: 'var(--fg-mute)', fontSize: 13,
          }}>
            Sin movimientos en {mesLabel(mesActivo)}
          </div>
        )}
      </div>

    </div>
  )
}
