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
import { useFormat }       from '../hooks/useFormat'
import { usePrefsStore, type Moneda } from '../store/prefs'
import { useAuthStore }    from '../store/auth'
import { supabase }        from '../lib/supabase'
import { generateMeses, mesLabel, mesIdToDbKey } from '../lib/mes'
import { SearchIcon, BellIcon } from '../components/icons/Icons'

const MONTHS_6 = generateMeses(6)

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
  const { fmt } = useFormat()
  const isInc = txnGroup(t.tipo) === 'ingreso'
  const isSav = txnGroup(t.tipo) === 'ahorro'
  const color = isInc ? 'var(--pos)' : isSav ? 'var(--info)' : 'var(--fg)'
  const sign  = isInc ? '+' : '−'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '11px 12px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.desc}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
          <span>{t.cat}</span>
          <span>·</span>
          <span>{t.time}</span>
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
        {sign}{fmt(Math.abs(t.amount))}
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
  const [showInsight, setShowInsight] = useState(true)

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

  // ── Ahorro acumulado all-time (tipo "Ahorro en efectivo") ──
  const [ahorroAcumulado, setAhorroAcumulado] = useState<number>(0)
  useEffect(() => {
    if (!householdId) return
    supabase
      .from('movimientos')
      .select('amount')
      .eq('user_id', householdId)
      .eq('tipo', 'Ahorro en efectivo')
      .is('deleted_at', null)
      .then(({ data }) => {
        const total = (data ?? []).reduce((s: number, r: { amount: number | string }) =>
          s + (parseFloat(String(r.amount)) || 0), 0)
        setAhorroAcumulado(total)
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

  // ── Patrimonio total (cuentas USD) ──
  const patrimony = liveAccounts
    ? liveAccounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0)
    : 0

  // ── Saldo disponible (cuentas líquidas: CHECKING + CASH) ──
  const saldoDisponible = (liveAccounts ?? [])
    .filter(a =>
      a.currency === 'USD' &&
      ['CHECKING', 'CASH', 'CORRIENTE', 'EFECTIVO'].some(t => a.type.toUpperCase().includes(t))
    )
    .reduce((s, a) => s + a.balance, 0)

  // ── Tasa ahorro ──
  const savingsRate = kpiData.ingresos > 0
    ? (kpiData.balance / kpiData.ingresos) * 100
    : 0

  // ── KPI cards ──
  const kpis = liveTxns ? [
    { ...MOCK_KPIS[0], value: kpiData.ingresos },
    { ...MOCK_KPIS[1], value: kpiData.gastos   },
    { ...MOCK_KPIS[2], value: kpiData.balance  },
    { ...MOCK_KPIS[3], value: parseFloat(savingsRate.toFixed(1)) },
  ] : MOCK_KPIS

  // ── Bar chart 6M: 5 meses estáticos + mes activo real ──
  const incomeVsExp = useMemo(() => {
    const base = [
      { month: 'Nov', ingresos: 2650, gastos: 1890 },
      { month: 'Dic', ingresos: 2400, gastos: 2100 },
      { month: 'Ene', ingresos: 2800, gastos: 1950 },
      { month: 'Feb', ingresos: 2550, gastos: 1820 },
      { month: 'Mar', ingresos: 2900, gastos: 2050 },
    ]
    const cur = mesLabel(mesActivo).split(' ')[0].substring(0, 3)
    base.push({ month: cur, ingresos: kpiData.ingresos, gastos: kpiData.gastos })
    return base
  }, [kpiData.ingresos, kpiData.gastos, mesActivo])

  // ── Fondo emergencia — leer de fondo_emergencia DB; fallback a cuentas AHORRO ──
  const efAccountsBalance = (liveAccounts ?? [])
    .filter(a => a.type.toUpperCase().includes('AHORRO'))
    .reduce((s, a) => s + a.balance, 0)
  const emergencyBalance = efDbBalance ?? efAccountsBalance
  const emergencyTarget = kpiData.gastos * 3
  const emergencyPct    = emergencyTarget > 0 ? Math.min(100, (emergencyBalance / emergencyTarget) * 100) : 0
  const emergencyMonths = kpiData.gastos > 0 ? (emergencyBalance / kpiData.gastos).toFixed(1) : '0'

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
        <button onClick={() => navigate('/buscar')} style={iBtn} aria-label="Buscar"><SearchIcon /></button>
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
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone="pos" size="xs">↑ +$342.18</Pill>
          <Pill tone="pos" size="xs">+2.4%</Pill>
          <span style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}>vs. mes anterior</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <Sparkline data={MOCK_BALANCE_SERIES} color="var(--amber)" w={350} h={36} fill stroke={1.8} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--fg-mute)' }}>
            <span>Nov</span><span>Dic</span><span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span>
          </div>
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
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 3 }}>Cuentas líquidas</div>
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
      <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {kpis.map(k => {
          const good = k.neg ? k.delta < 0 : k.delta > 0
          return (
            <div key={k.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {k.label}
                </span>
                <Pill tone={good ? 'pos' : 'neg'} size="xs">
                  {k.delta > 0 ? '+' : ''}{k.delta}%
                </Pill>
              </div>
              <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>
                {k.suffix ? `${k.value}${k.suffix}` : fmt(k.value)}
              </div>
              <div style={{ marginTop: 5 }}>
                <Sparkline data={k.spark} color={k.neg ? 'var(--neg)' : 'var(--amber)'} w={140} h={18} fill stroke={1.4} />
              </div>
            </div>
          )
        })}
      </div>

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
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 4 }}>
                Fondo de emergencia
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(emergencyBalance)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 2 }}>Meta: 3 meses</div>
              <div className="num" style={{
                fontSize: 18, fontWeight: 700,
                color: emergencyPct >= 100 ? 'var(--pos)' : emergencyPct >= 50 ? 'var(--amber)' : 'var(--neg)',
              }}>
                {emergencyMonths}m
              </div>
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

      {/* ─── 10. ANÁLISIS IA ─── */}
      {showInsight && (
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
              <PillBtn onClick={() => setShowInsight(false)}>Descartar</PillBtn>
            </div>
          </div>
        </div>
      )}

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
