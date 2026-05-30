// ═══════════════════════════════════════════════════
// Home — Dashboard principal (BLOQUE 2)
// 11 secciones: header+mes+moneda, patrimonio, saldo
// disponible, quick actions, KPIs, barchart 6M,
// fondo emergencia, top gastos, pronóstico, IA, txns
// ═══════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Sparkline          from '../components/ui/Sparkline'
import Pill               from '../components/ui/Pill'
import CatIcon            from '../components/ui/CatIcon'
import { catColor }       from '../components/ui/catColor'
import Sheet              from '../components/ui/Sheet'
import { MOCK_BALANCE_SERIES, MOCK_KPIS, txnGroup, type Transaction } from '../data/mock'
import { useAccounts }     from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { useConfig, type MetaAhorro } from '../hooks/useConfig'
import { useKPIs }         from '../hooks/useKPIs'
import { useDineroFuera }  from '../hooks/useDineroFuera'
import { useFormat }       from '../hooks/useFormat'
import { usePrefsStore, type Moneda } from '../store/prefs'
import { useAuthStore }    from '../store/auth'
import { supabase }        from '../lib/supabase'
import { generateMeses, generateMesesByYear, mesLabel, dateToMesId } from '../lib/mes'
import { useTasas } from '../hooks/useTasas'
import { DEFAULTS } from '../hooks/useConfig'
import { BellIcon } from '../components/icons/Icons'

// ── Shortcuts config ──────────────────────────────────────────
const SC_KEY = 'finanzas_shortcuts_v1'
const ALL_SC = [
  { id: 'analisis',    label: 'Análisis',    emoji: '📊', path: '/analisis' },
  { id: 'transfer',    label: 'Transferir',  emoji: '⇄',  path: '/transfer' },
  { id: 'calc',        label: 'Calcular',    emoji: '🧮', path: '/calculadora' },
  { id: 'recurrentes', label: 'Recurrentes', emoji: '🔁', path: '/recurrentes' },
  { id: 'dinerofuera', label: 'Dinero fuera', emoji: '🤝', path: '/dinero-fuera' },
  { id: 'pareja',      label: 'Pareja',      emoji: '💑', path: '/pareja' },
  { id: 'tasas',       label: 'Tasas',       emoji: '💱', path: '/monedas' },
  { id: 'escanear',    label: 'Escanear',    emoji: '📷', path: '/escanear' },
  { id: 'voz',         label: 'Voz',         emoji: '🎤', path: '/voz' },
  { id: 'buscar',      label: 'Buscar',      emoji: '🔍', path: '/buscar' },
  { id: 'ia',          label: 'IA',          emoji: '✦',  path: '/ia' },
]
const DEFAULT_SC = ['analisis', 'transfer', 'dinerofuera', 'recurrentes', 'pareja']
function loadSC(): string[] {
  try { return JSON.parse(localStorage.getItem(SC_KEY) ?? 'null') ?? DEFAULT_SC }
  catch { return DEFAULT_SC }
}

const MONTHS_BY_YEAR = generateMesesByYear()

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
  const { tasas } = useTasas()
  const moneda    = usePrefsStore(s => s.moneda)
  const ocultarMontos = usePrefsStore(s => s.ocultarMontos)
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
            <span style={{
              display: 'inline-flex', width: 14, height: 14, borderRadius: '50%',
              background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
              color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {t.author === 'isabel' ? 'I' : 'A'}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
          {fmt(Math.abs(t.amount))}
        </div>
        {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
          <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            ≈ Bs {(Math.abs(t.amount) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </div>
        )}
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
  const activeYear     = mesActivo.split('-')[1]
  const { tasas }      = useTasas()
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

  // ── Stats consolidadas: 5M historial + ahorro (1 RPC) ──
  interface MonthKPI { month: string; ingresos: number; gastos: number }
  const [histKPIs,        setHistKPIs]        = useState<MonthKPI[]>([])
  const [ahorroAcumulado, setAhorroAcumulado] = useState<number>(0)

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
      const dbKeyToLabel = Object.fromEntries(months5.map(m => [m.dbKey, m.label.split(' ')[0]]))
      const rows = (data.hist_kpis ?? []) as Array<{ mes: string; ingresos: number; gastos: number }>
      setHistKPIs(months5.map(m => {
        const row = rows.find(r => r.mes === m.dbKey)
        return { month: dbKeyToLabel[m.dbKey] ?? m.dbKey, ingresos: row?.ingresos ?? 0, gastos: row?.gastos ?? 0 }
      }))
    })
  }, [householdId])

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

  // ── KPI cards — delta real vs mes anterior ──
  const prevKPIs  = histKPIs.at(-1)
  const safeDelta = (cur: number, prev: number) =>
    prev === 0 ? 0 : Math.round(((cur - prev) / Math.abs(prev)) * 100)
  const sparkFromHist = (key: 'ingresos' | 'gastos') =>
    histKPIs.length > 0
      ? [...histKPIs.map(h => h[key]), kpiData[key]]
      : MOCK_KPIS[key === 'ingresos' ? 0 : 1].spark

  const prevNeto = (prevKPIs?.ingresos ?? 0) - (prevKPIs?.gastos ?? 0)

  const kpis = liveTxns ? [
    { ...MOCK_KPIS[0], value: kpiData.ingresos, delta: safeDelta(kpiData.ingresos, prevKPIs?.ingresos ?? 0), spark: sparkFromHist('ingresos') },
    { ...MOCK_KPIS[1], value: kpiData.gastos,   delta: safeDelta(kpiData.gastos,   prevKPIs?.gastos   ?? 0), spark: sparkFromHist('gastos')   },
    { ...MOCK_KPIS[2], id: 'neto',   label: 'Neto',   value: kpiData.balance, delta: safeDelta(kpiData.balance, prevNeto) },
    { ...MOCK_KPIS[3], id: 'ahorro', label: 'Ahorro', value: kpiData.ahorro,  delta: 0, suffix: undefined },
  ] : MOCK_KPIS

  // ── Alertas de presupuesto — cats ≥80% del límite mensual ──
  const budgetAlerts = useMemo(() => {
    if (!liveTxns || Object.keys(config.presupuestos).length === 0) return []
    const spentByCat: Record<string, number> = {}
    for (const t of liveTxns) {
      if (txnGroup(t.tipo) === 'gasto')
        spentByCat[t.cat] = (spentByCat[t.cat] ?? 0) + Math.abs(t.amount)
    }
    return Object.entries(config.presupuestos)
      .map(([cat, limit]) => ({ cat, limit, spent: spentByCat[cat] ?? 0 }))
      .filter(({ limit, spent }) => limit > 0 && spent / limit >= 0.8)
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  }, [liveTxns, config.presupuestos])

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

  const [shortcuts,    setShortcuts]    = useState<string[]>(loadSC)
  const [showScEditor, setShowScEditor] = useState(false)
  const [showPronosticoInfo, setShowPronosticoInfo] = useState(false)

  const saveSC = useCallback((ids: string[]) => {
    setShortcuts(ids)
    localStorage.setItem(SC_KEY, JSON.stringify(ids))
  }, [])

  // ── Metas de ahorro ──────────────────────────────────────────────
  // Data lives in config_usuario.metas_ahorro (JSON array), same source as /metas page
  const metas: MetaAhorro[] = useMemo(
    () => config.metasAhorro.filter(m => !m.completada).slice(0, 3),
    [config.metasAhorro]
  )

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

  /* ── KPI carousel ── */
  const [kpiPage, setKpiPage] = useState(0)  // 0 = ingresos+gastos, 1 = neto+ahorro
  const kpiScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setKpiPage(p => {
        const next = (p + 1) % 2
        kpiScrollRef.current?.scrollTo({ left: next * kpiScrollRef.current.clientWidth, behavior: 'smooth' })
        return next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
          style={iBtn} aria-label="Notificaciones"
        >
          <BellIcon />
        </button>
        <button
          onClick={() => navigate('/settings')}
          style={iBtn} aria-label="Configuración"
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>⚙</span>
        </button>
      </div>

      {/* ── Selector de mes (agrupado por año) ── */}
      {/* Year pills — only current year forward */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 4px' }}>
        {MONTHS_BY_YEAR.filter(yg => parseInt('20' + yg.year) >= new Date().getFullYear()).map(yg => {
          const isActiveYear = yg.year === activeYear
          return (
            <button
              key={yg.year}
              onClick={() => setMesActivo(yg.months[yg.months.length - 1].id)}
              style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: isActiveYear ? 'var(--fg)' : 'var(--ink-2)',
                color:      isActiveYear ? 'var(--ink-0)' : 'var(--fg-mute)',
                border:     isActiveYear ? 'none' : '1px solid var(--line)',
              }}
            >
              {yg.yearLabel}
            </button>
          )
        })}
      </div>
      {/* Month pills (filtered by active year) */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 4px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {(MONTHS_BY_YEAR.find(yg => yg.year === activeYear)?.months ?? []).map(m => {
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
                background: isActive ? 'var(--amber)' : 'rgba(var(--amber-rgb),.1)',
                color:      isActive ? 'var(--ink-0)' : 'var(--amber)',
                border:     isActive ? 'none' : '1px dashed rgba(var(--amber-rgb),.4)',
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
        {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
          <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 5, fontWeight: 500 }}>
            ≈ Bs {(patrimony * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </div>
        )}
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
            {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
              <div style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2, fontWeight: 500 }}>
                ≈ Bs {(saldoDisponible * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
              </div>
            )}
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
              {fmt(kpiData.balance)}
            </div>
            {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
              <div style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2, fontWeight: 500 }}>
                ≈ Bs {(Math.abs(kpiData.balance) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 3 }}>
              Ing − Gas
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3b. ALERTAS DE PRESUPUESTO ─── */}
      {budgetAlerts.length > 0 && (
        <div style={{ padding: '4px 16px 0' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 2 }}>
              Alertas de presupuesto
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {budgetAlerts.map(({ cat, limit, spent }) => {
                const pct  = Math.min(999, Math.round((spent / limit) * 100))
                const over = spent >= limit
                return (
                  <div
                    key={cat}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                      background: over ? 'rgba(214,106,90,.14)' : 'rgba(var(--amber-rgb),.12)',
                      color:      over ? 'var(--neg)' : 'var(--amber)',
                      border:     over ? '1px solid rgba(214,106,90,.3)' : '1px solid rgba(var(--amber-rgb),.3)',
                    }}
                  >
                    <span>{over ? '🔴' : '⚠️'}</span>
                    <span>{cat} al {pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. ACCESOS DIRECTOS (horizontal scroll) ─── */}
      <div style={{
        display: 'flex', gap: 8, padding: '4px 16px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {shortcuts.map(id => {
          const sc = ALL_SC.find(s => s.id === id)
          if (!sc) return null
          return (
            <button
              key={sc.id}
              onClick={() => navigate(sc.path)}
              style={{
                flexShrink: 0, width: 64, background: 'var(--ink-2)',
                border: '1px solid var(--line)', borderRadius: 14, padding: '10px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{sc.emoji}</span>
              <span style={{ fontSize: 10, color: 'var(--fg-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {sc.label}
              </span>
            </button>
          )
        })}

        {/* Gear — abre editor de accesos */}
        <button
          onClick={() => setShowScEditor(true)}
          style={{
            flexShrink: 0, width: 64, background: 'var(--ink-2)',
            border: '1px dashed var(--ink-4)', borderRadius: 14, padding: '10px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--fg-mute)' }}>⚙</span>
          <span style={{ fontSize: 10, color: 'var(--fg-mute)', fontWeight: 500 }}>Ajustar</span>
        </button>
      </div>

      {/* Sheet — editor de accesos directos */}
      <Sheet open={showScEditor} onClose={() => setShowScEditor(false)}>
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Accesos directos</div>
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginBottom: 16 }}>
            Selecciona hasta 8 accesos para tu dashboard
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALL_SC.map(sc => {
              const active = shortcuts.includes(sc.id)
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    if (active) saveSC(shortcuts.filter(s => s !== sc.id))
                    else if (shortcuts.length < 8) saveSC([...shortcuts, sc.id])
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: active ? 'rgba(var(--amber-rgb),.12)' : 'var(--ink-3)',
                    border: active ? '1px solid rgba(var(--amber-rgb),.35)' : '1px solid var(--line)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{sc.emoji}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{sc.label}</span>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: active ? 'var(--amber)' : 'var(--ink-4)',
                    border: active ? 'none' : '1px solid var(--line)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 12, color: active ? 'var(--ink-0)' : 'transparent',
                  }}>✓</span>
                </button>
              )
            })}
          </div>
        </div>
      </Sheet>

      {/* ─── 5. KPI CAROUSEL ─── */}
      {(() => {
        const KPI_INFO: Record<string, string> = {
          ingresos: 'Todo el dinero que entró este mes: salarios, ventas, transferencias recibidas, etc. El % compara con el mes anterior.',
          gastos:   'Todo lo que gastaste este mes en compras, servicios, facturas y pagos. El % compara con el mes anterior.',
          neto:     'Ingresos menos gastos. Positivo = ahorraste. Negativo = gastaste más de lo que ingresaste. El % compara con el neto del mes anterior.',
          ahorro:   'Movimientos registrados como "Ahorro en efectivo". La tasa es ahorro ÷ ingresos del mes.',
        }

        function KpiCard({ k }: { k: typeof kpis[0] }) {
          const good     = k.neg ? k.delta < 0 : k.delta > 0
          const infoOpen = openKpiInfo === k.id
          let value: React.ReactNode
          let color = 'inherit'
          let extraRow: React.ReactNode = null
          if (k.id === 'neto') {
            const isPos = kpiData.balance >= 0
            color = isPos ? 'var(--pos)' : 'var(--neg)'
            value = (isPos ? '+' : '') + fmt(kpiData.balance)
          } else if (k.id === 'ingresos') {
            color = 'var(--pos)'
            value = fmt(Math.abs(k.value))
          } else if (k.id === 'gastos') {
            color = 'var(--neg)'
            value = fmt(Math.abs(k.value))
          } else if (k.id === 'ahorro') {
            color = 'var(--info)'
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
            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 12, padding: 12, flex: '0 0 calc(50% - 4px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    {k.label}
                  </span>
                  <button
                    onClick={() => setOpenKpiInfo(infoOpen ? null : k.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1,
                      color: 'var(--fg-mute)', fontSize: 11, fontWeight: 700,
                      width: 16, height: 16, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label={`Qué es ${k.label}`}
                  >ℹ</button>
                </div>
                <Pill tone={k.delta === 0 ? 'mute' : good ? 'pos' : 'neg'} size="xs" title="vs. mes anterior">
                  {k.delta === 0 ? '—' : `${k.delta > 0 ? '+' : ''}${k.delta}%`}
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
        }

        /* ── 2 slides: [ingresos, gastos] | [neto, ahorro] ── */
        const slides = [[kpis[0], kpis[1]], [kpis[2], kpis[3]]] as (typeof kpis[0])[][]

        return (
          <div style={{ padding: '12px 16px 4px' }}>
            {/* scroll container */}
            <div
              ref={kpiScrollRef}
              onScroll={e => {
                const el = e.currentTarget
                const page = Math.round(el.scrollLeft / el.clientWidth)
                setKpiPage(page)
              }}
              style={{
                display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory',
                msOverflowStyle: 'none', scrollbarWidth: 'none', paddingBottom: 2,
              }}
            >
              {slides.map((pair, si) => (
                <div
                  key={si}
                  style={{
                    display: 'flex', gap: 8,
                    flex: '0 0 100%', scrollSnapAlign: 'start',
                  }}
                >
                  {pair.map(k => k && <KpiCard key={k.id} k={k} />)}
                </div>
              ))}
            </div>
            {/* dot pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
              {slides.map((_, si) => (
                <button
                  key={si}
                  onClick={() => {
                    kpiScrollRef.current?.scrollTo({ left: si * (kpiScrollRef.current.clientWidth), behavior: 'smooth' })
                    setKpiPage(si)
                  }}
                  style={{
                    width: kpiPage === si ? 16 : 6, height: 6, borderRadius: 999,
                    background: kpiPage === si ? 'var(--amber)' : 'var(--ink-4)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all .25s ease',
                  }}
                  aria-label={`Página ${si + 1}`}
                />
              ))}
            </div>
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

      {/* ─── 5c. ALERTAS DE PRESUPUESTO ─── */}
      {budgetAlerts.length > 0 && (
        <div style={{ padding: '4px 16px' }}>
          <div style={{
            background: 'rgba(212,106,74,.08)', border: '1px solid rgba(212,106,74,.22)',
            borderRadius: 14, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 9.5, color: 'var(--neg)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
              ⚠️ Presupuesto excedido
            </div>
            {budgetAlerts.map((a, i) => {
              const pct = Math.round((a.spent / a.limit) * 100)
              return (
                <div
                  key={a.cat}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginTop: i > 0 ? 8 : 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.cat}
                    </div>
                    <div style={{ marginTop: 4, height: 4, borderRadius: 4, background: 'var(--ink-3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${Math.min(pct, 100)}%`,
                        background: pct >= 100 ? 'var(--neg)' : 'var(--warn)',
                        transition: 'width .4s',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pct >= 100 ? 'var(--neg)' : 'var(--warn)', flexShrink: 0 }}>
                    {pct}%
                  </div>
                </div>
              )
            })}
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

      {/* ─── 7. METAS DE AHORRO ─── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
              Metas de ahorro
            </span>
            <button
              onClick={() => navigate('/metas')}
              style={{ fontSize: 10.5, color: 'var(--amber)', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              Ver todas →
            </button>
          </div>
          {metas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '10px 0 4px', fontSize: 12.5, color: 'var(--fg-mute)' }}>
              Sin metas activas ·{' '}
              <button
                onClick={() => navigate('/metas')}
                style={{ color: 'var(--amber)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, padding: 0 }}
              >
                + Crear meta →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {metas.map(m => {
                const pct   = m.objetivo > 0 ? Math.min(100, (m.actual / m.objetivo) * 100) : 0
                const color = pct >= 80 ? 'var(--pos)' : 'var(--amber)'
                return (
                  <div key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--fg-dim)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {m.emoji ? `${m.emoji} ` : ''}{m.nombre}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--ink-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 3 }}>
                      {fmt(m.actual)} / {fmt(m.objetivo)}
                    </div>
                  </div>
                )
              })}
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
                      <div style={{ textAlign: 'right' }}>
                        <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--neg)' }}>{fmt(Math.abs(value))}</div>
                        {moneda !== 'BS' && tasas.bcv > 0 && !ocultarMontos && (
                          <div style={{ fontSize: 9.5, color: 'var(--fg-dim)', fontWeight: 500 }}>
                            ≈ Bs {(Math.abs(value) * tasas.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                          </div>
                        )}
                      </div>
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
      {dailySpend > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
                Pronóstico de gasto
              </div>
              <button
                onClick={() => setShowPronosticoInfo(v => !v)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: 'none',
                  background: showPronosticoInfo ? 'var(--amber)' : 'var(--ink-3)',
                  color: showPronosticoInfo ? 'var(--ink-0)' : 'var(--fg-mute)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              >ℹ</button>
            </div>
            {showPronosticoInfo && (
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', lineHeight: 1.5, marginBottom: 12, padding: '8px 10px', background: 'var(--ink-3)', borderRadius: 8 }}>
                Basado en tus gastos del mes hasta hoy. Si mantienes este ritmo, así terminarás el mes.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr' }}>
              {([
                { label: 'Gasto diario promedio', value: fmtShort(dailySpend),           color: 'var(--fg)'  },
                null,
                { label: 'Proyección 30 días',    value: fmtShort(projected30),          color: 'var(--neg)' },
                null,
                { label: 'Ahorro est.',           value: fmtShort(Math.abs(savedByEOM)), color: savedByEOM >= 0 ? 'var(--pos)' : 'var(--neg)' },
              ] as Array<{ label: string; value: string; color: string } | null>).map((col, i) =>
                col === null
                  ? <div key={i} style={{ background: 'var(--line)', margin: '2px 0' }} />
                  : (
                    <div key={col.label} style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 14, fontWeight: 700, color: col.color }}>
                        {col.value}
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
        const topCat       = topGastos[0]
        const topPct       = topCat && kpiData.gastos > 0 ? (topCat.value / kpiData.gastos) * 100 : 0

        // savProxy: máx entre ahorro directo y superávit positivo del mes
        const savProxy = Math.max(kpiData.ahorro, Math.max(0, kpiData.balance))
        const savRateScore = kpiData.ingresos > 0 ? (savProxy / kpiData.ingresos) * 100 : 0
        // Score: superávit(25) + ahorro≥20%(25) + metas con progreso(25) + gastos<ingresos(25)
        const hasMetaProgress = metas.length > 0 && metas.some(m => m.actual > 0)
        const score = Math.round(
          (superavit > 0 ? 25 : 0) +
          (savRateScore >= 20 ? 25 : savRateScore > 0 ? savRateScore / 20 * 25 : 0) +
          (hasMetaProgress ? 25 : 0) +
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
        if (metas.length > 0) {
          const metaCompleta = metas.find(m => m.objetivo > 0 && m.actual >= m.objetivo)
          if (metaCompleta) {
            insights.push({ icon: '🎯', text: `Meta "${metaCompleta.nombre}" completada. ¡Excelente disciplina!`, color: 'var(--pos)' })
          } else {
            const topMeta = metas[0]
            const pctMeta = topMeta.objetivo > 0 ? Math.min(100, (topMeta.actual / topMeta.objetivo) * 100) : 0
            insights.push({ icon: '🎯', text: `Meta "${topMeta.nombre}" al ${pctMeta.toFixed(0)}% — ${fmt(topMeta.objetivo - topMeta.actual)} restantes.`, color: 'var(--amber)' })
          }
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
