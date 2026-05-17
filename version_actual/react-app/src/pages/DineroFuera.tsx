import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { fmt } from '../data/mock'

interface Abono { fecha: string; monto: number }

interface DineroFueraRow {
  id:               string
  tipo:             string
  nombre:           string
  concepto:         string | null
  monto_original:   number
  monto_abonado:    number
  abonos:           Abono[]
  fecha_inicio:     string | null
  fecha_vencimiento: string | null
  pagado:           boolean
}

export default function DineroFuera() {
  const householdId = useAuthStore(s => s.householdId)
  const [rows,    setRows]    = useState<DineroFueraRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'all' | 'debt' | 'loan'>('all')

  useEffect(() => {
    if (!householdId) { setLoading(false); return }
    supabase
      .from('dinero_fuera')
      .select('id,tipo,nombre,concepto,monto_original,monto_abonado,abonos,fecha_inicio,fecha_vencimiento,pagado')
      .eq('household_id', householdId)
      .eq('pagado', false)
      .order('fecha_inicio', { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as DineroFueraRow[])
        setLoading(false)
      })
  }, [householdId])

  const filtered = tab === 'all' ? rows : rows.filter(r => r.tipo === tab)

  const totalDebt = rows.filter(r => r.tipo === 'debt').reduce((s, r) => s + (r.monto_original - r.monto_abonado), 0)
  const totalLoan = rows.filter(r => r.tipo === 'loan').reduce((s, r) => s + (r.monto_original - r.monto_abonado), 0)

  const TABS: { id: 'all' | 'debt' | 'loan'; label: string }[] = [
    { id: 'all',  label: 'Todos'        },
    { id: 'debt', label: 'Debo'         },
    { id: 'loan', label: 'Me deben'     },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Dinero fuera" back />

      {/* ── Summary ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--neg)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Debo</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--f-num)', color: 'var(--neg)' }}>{fmt(totalDebt)}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--pos)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Me deben</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--f-num)', color: 'var(--pos)' }}>{fmt(totalLoan)}</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 16px 0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'var(--amber)' : 'var(--ink-2)',
              color:      tab === t.id ? 'var(--ink-0)' : 'var(--fg-dim)',
              border:     tab === t.id ? 'none' : '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── List ── */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Cargando…</div>}
        {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Sin registros</div>}

        {filtered.map(r => {
          const saldo = r.monto_original - r.monto_abonado
          const pct   = Math.min(100, r.monto_original > 0 ? (r.monto_abonado / r.monto_original) * 100 : 0)
          const isDebt = r.tipo === 'debt'

          return (
            <div key={r.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: isDebt ? 'rgba(214,106,90,.15)' : 'rgba(88,178,106,.15)',
                  display: 'grid', placeItems: 'center', fontSize: 16,
                }}>
                  {isDebt ? '↑' : '↓'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.nombre}</div>
                  {r.concepto && <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{r.concepto}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--f-num)', color: isDebt ? 'var(--neg)' : 'var(--pos)' }}>{fmt(saldo)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>de {fmt(r.monto_original)}</div>
                </div>
              </div>

              <div style={{ height: 4, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: isDebt ? 'var(--neg)' : 'var(--pos)', borderRadius: 999 }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-mute)' }}>
                <span>{pct.toFixed(0)}% pagado</span>
                {r.fecha_vencimiento && (
                  <span>Vence: {new Date(r.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE')}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
