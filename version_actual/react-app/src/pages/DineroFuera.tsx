// ═══════════════════════════════════════════════════
// DineroFuera — /dinero-fuera  (BLOQUE 5)
// Deudas y préstamos del hogar.
// Abono inline · Marcar pagado · useFormat
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Sheet        from '../components/ui/Sheet'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useFormat }    from '../hooks/useFormat'

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
  derived?:         boolean   // from movimientos (Prestamo recibido/pagado) — read-only
}

export default function DineroFuera() {
  const householdId = useAuthStore(s => s.householdId)
  const { fmt }     = useFormat()

  const [rows,      setRows]      = useState<DineroFueraRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'all' | 'debt' | 'loan'>('all')
  const [showPaid,  setShowPaid]  = useState(false)

  // ── Abono inline state ──
  const [abonoId,   setAbonoId]   = useState<string | null>(null)
  const [abonoVal,  setAbonoVal]  = useState('')
  const [saving,    setSaving]    = useState(false)

  // ── Confirmation state ──
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState<'pagado' | 'delete'>('pagado')

  const [derivedRows, setDerivedRows] = useState<DineroFueraRow[]>([])

  useEffect(() => {
    if (!householdId) { setLoading(false); return }
    let q = supabase
      .from('dinero_fuera')
      .select('id,tipo,nombre,concepto,monto_original,monto_abonado,abonos,fecha_inicio,fecha_vencimiento,pagado')
      .eq('household_id', householdId)
      .order('fecha_inicio', { ascending: false })
    if (!showPaid) q = q.eq('pagado', false)
    q.then(({ data }) => {
      setRows((data ?? []) as DineroFueraRow[])
      setLoading(false)
    })
  }, [householdId, showPaid])

  // ── Derive loan/debt entries from movimientos (Prestamo recibido/pagado) ──
  // Historical data lives here, NOT in dinero_fuera. Grouped by descripcion
  // (the person's name, e.g. "Luis Eduardo", "Prima Isa"). Read-only.
  useEffect(() => {
    if (!householdId) return
    supabase
      .from('movimientos')
      .select('descripcion,tipo,amount,fecha')
      .eq('household_id', householdId)
      .in('tipo', ['Prestamo recibido', 'Prestamo pagado'])
      .is('deleted_at', null)
      .then(({ data }) => {
        const byName = new Map<string, { neto: number; first: string | null }>()
        for (const m of data ?? []) {
          const name = (m.descripcion as string | null)?.trim() || 'Sin nombre'
          const amt  = Math.abs(parseFloat(String(m.amount)) || 0)
          // 'Prestamo recibido' = me deben (loan) per usuario; 'pagado' lo reduce
          const signed = m.tipo === 'Prestamo recibido' ? amt : -amt
          const cur = byName.get(name) ?? { neto: 0, first: (m.fecha as string | null) }
          cur.neto += signed
          byName.set(name, cur)
        }
        const derived: DineroFueraRow[] = [...byName.entries()]
          .filter(([, v]) => Math.abs(v.neto) > 0.009)
          .map(([name, v], i) => ({
            id:               `mov-${i}-${name}`,
            tipo:             'loan',
            nombre:           name,
            concepto:         'Desde movimientos',
            monto_original:   Math.abs(v.neto),
            monto_abonado:    0,
            abonos:           [],
            fecha_inicio:     v.first,
            fecha_vencimiento: null,
            pagado:           false,
            derived:          true,
          }))
        setDerivedRows(derived)
      })
  }, [householdId])

  async function handleAbono(id: string) {
    const monto = parseFloat(abonoVal)
    if (!monto || monto <= 0) return
    setSaving(true)
    const row = rows.find(r => r.id === id)!
    const nuevosAbonos: Abono[] = [...(row.abonos ?? []), { fecha: new Date().toISOString().slice(0, 10), monto }]
    const nuevoAbonado = row.monto_abonado + monto
    const { error } = await supabase
      .from('dinero_fuera')
      .update({ monto_abonado: nuevoAbonado, abonos: nuevosAbonos })
      .eq('id', id)
    if (!error) {
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, monto_abonado: nuevoAbonado, abonos: nuevosAbonos } : r
      ))
    }
    setAbonoId(null)
    setAbonoVal('')
    setSaving(false)
  }

  async function handlePagado(id: string) {
    const { error } = await supabase
      .from('dinero_fuera')
      .update({ pagado: true })
      .eq('id', id)
    if (!error) {
      setRows(prev => prev.filter(r => r.id !== id))
      setConfirmId(null)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('dinero_fuera')
      .delete()
      .eq('id', id)
    if (!error) {
      setRows(prev => prev.filter(r => r.id !== id))
      setConfirmId(null)
    }
  }

  const allRows    = [...rows, ...derivedRows]
  const filtered   = tab === 'all' ? allRows : allRows.filter(r => r.tipo === tab)
  const totalDebt  = allRows.filter(r => r.tipo === 'debt').reduce((s, r) => s + (r.monto_original - r.monto_abonado), 0)
  const totalLoan  = allRows.filter(r => r.tipo === 'loan').reduce((s, r) => s + (r.monto_original - r.monto_abonado), 0)

  const TABS: { id: 'all' | 'debt' | 'loan'; label: string }[] = [
    { id: 'all',  label: 'Todos'    },
    { id: 'debt', label: 'Debo'     },
    { id: 'loan', label: 'Me deben' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Dinero fuera" back />

      {/* ── Summary ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--neg)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Debo</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--neg)' }}>{fmt(totalDebt)}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--pos)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Me deben</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos)' }}>{fmt(totalLoan)}</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 16px 0', alignItems: 'center' }}>
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
        <button
          onClick={() => { setLoading(true); setShowPaid(p => !p) }}
          style={{
            marginLeft: 'auto', padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: showPaid ? 'rgba(88,178,106,.15)' : 'var(--ink-2)',
            color:      showPaid ? 'var(--pos)' : 'var(--fg-mute)',
            border:     showPaid ? '1px solid rgba(88,178,106,.3)' : '1px solid var(--line)',
            cursor: 'pointer',
          }}
        >
          {showPaid ? '✓ Con pagados' : 'Ver pagados'}
        </button>
      </div>

      {/* ── List ── */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Cargando…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '24px 0', fontSize: 13 }}>Sin registros</div>
        )}

        {filtered.map(r => {
          const saldo  = r.monto_original - r.monto_abonado
          const pct    = Math.min(100, r.monto_original > 0 ? (r.monto_abonado / r.monto_original) * 100 : 0)
          const isDebt = r.tipo === 'debt'
          const showAbono = abonoId === r.id

          return (
            <div key={r.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>

              {/* ── Header row ── */}
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
                  {r.concepto && (
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{r.concepto}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 15, fontWeight: 700, color: isDebt ? 'var(--neg)' : 'var(--pos)' }}>
                    {fmt(saldo)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>de {fmt(r.monto_original)}</div>
                </div>
              </div>

              {/* ── Progress bar ── */}
              <div style={{ height: 4, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: isDebt ? 'var(--neg)' : 'var(--pos)', borderRadius: 999, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 10 }}>
                <span>{pct.toFixed(0)}% pagado</span>
                {r.fecha_vencimiento && (
                  <span>Vence: {new Date(r.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE')}</span>
                )}
              </div>

              {/* ── Actions (read-only for derived movimientos) ── */}
              {r.derived ? (
                <div style={{
                  fontSize: 11, color: 'var(--fg-mute)', textAlign: 'center',
                  background: 'var(--ink-3)', borderRadius: 8, padding: '7px 10px',
                }}>
                  Derivado de movimientos · solo lectura
                </div>
              ) : showAbono ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>$</span>
                  <input
                    type="number"
                    value={abonoVal}
                    onChange={e => setAbonoVal(e.target.value)}
                    placeholder="Monto"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAbono(r.id) }}
                    style={{
                      flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
                      borderRadius: 8, padding: '7px 10px', fontSize: 13,
                      color: 'var(--fg)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleAbono(r.id)}
                    disabled={saving}
                    style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--amber)', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}
                  >OK</button>
                  <button
                    onClick={() => { setAbonoId(null); setAbonoVal('') }}
                    style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--ink-3)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--fg-mute)', cursor: 'pointer' }}
                  >✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setAbonoId(r.id); setAbonoVal('') }}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8,
                      background: 'var(--ink-3)', border: '1px solid var(--line)',
                      fontSize: 12, fontWeight: 600, color: 'var(--amber)', cursor: 'pointer',
                    }}
                  >
                    + Abonar
                  </button>
                  <button
                    onClick={() => { setConfirmMode('pagado'); setConfirmId(r.id) }}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8,
                      background: 'rgba(88,178,106,.12)', border: '1px solid rgba(88,178,106,.3)',
                      fontSize: 12, fontWeight: 600, color: 'var(--pos)', cursor: 'pointer',
                    }}
                  >
                    ✓ Pagado
                  </button>
                  <button
                    onClick={() => { setConfirmMode('delete'); setConfirmId(r.id) }}
                    style={{
                      padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                      fontSize: 13, color: 'var(--neg)', cursor: 'pointer',
                    }}
                    title="Eliminar registro"
                  >
                    🗑
                  </button>
                </div>
              )}

            </div>
          )
        })}
      </div>

      <div style={{ height: 32 }} />

      {/* ── Confirmation sheet ── */}
      <Sheet open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {confirmMode === 'delete' ? '🗑' : '✓'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {confirmMode === 'delete' ? '¿Eliminar registro?' : '¿Marcar como pagado?'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-mute)' }}>
            {allRows.find(r => r.id === confirmId)?.nombre} — {fmt(allRows.find(r => r.id === confirmId)?.monto_original ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 6 }}>
            {confirmMode === 'delete'
              ? 'Esta acción eliminará el registro permanentemente.'
              : 'Esta acción ocultará el registro de la lista activa.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setConfirmId(null)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            onClick={() => confirmId && (confirmMode === 'delete' ? handleDelete(confirmId) : handlePagado(confirmId))}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: confirmMode === 'delete' ? 'var(--neg)' : 'var(--pos)',
              border: 'none',
              fontSize: 14, fontWeight: 700, color: '#0a0b0d', cursor: 'pointer',
            }}
          >Confirmar</button>
        </div>
      </Sheet>
    </div>
  )
}
