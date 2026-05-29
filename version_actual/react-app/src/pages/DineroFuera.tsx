// ═══════════════════════════════════════════════════
// DineroFuera — /dinero-fuera  (BLOQUE 5)
// Deudas y préstamos del hogar — CRUD completo sobre `dinero_fuera`.
//
//   tipo='prestamo' → "Me deben"   (alguien me debe)
//   tipo='deuda'    → "Yo debo"
//
// Secciones: Me deben · Yo debo · Pagados (historial).
// Crear / Editar (Sheet) · Abonar inline · Marcar pagado · Eliminar.
// Subsección informativa solo-lectura derivada de `movimientos`.
// ═══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { type CSSProperties } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Sheet     from '../components/ui/Sheet'
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons/Icons'
import { supabase }      from '../lib/supabase'
import { useAuthStore }  from '../store/auth'
import { useFormat }     from '../hooks/useFormat'
import { useTasas }      from '../hooks/useTasas'
import { useToastStore } from '../store/toast'
import {
  useDineroFuera,
  saldoPendiente,
  type Abono,
  type DineroFueraRow,
} from '../hooks/useDineroFuera'

type Tipo   = 'prestamo' | 'deuda'
type Moneda = 'USD' | 'BS'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const inputSt: CSSProperties = {
  width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
  borderRadius: 12, padding: '11px 14px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)',
}

// ── Form state ─────────────────────────────────────
interface FormState {
  id:      string | null   // null = create, else edit
  persona: string
  monto:   string
  moneda:  Moneda
  fecha:   string
  notas:   string
  tipo:    Tipo
  pagado:  boolean
}

const EMPTY_FORM: FormState = {
  id: null, persona: '', monto: '', moneda: 'USD',
  fecha: todayISO(), notas: '', tipo: 'prestamo', pagado: false,
}

// ── Section header with total ─────────────────────
function SectionHeader({ label, total, color, fmt }: {
  label: string; total?: number; color: string; fmt: (amount: number) => string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginTop: 18, marginBottom: 2,
    }}>
      <div style={{ fontSize: 10.5, color, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </div>
      {total !== undefined && (
        <div className="num" style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(total)}</div>
      )}
    </div>
  )
}

export default function DineroFuera() {
  const householdId = useAuthStore(s => s.householdId)
  const userId      = useAuthStore(s => s.userId)
  const { fmt }     = useFormat()
  const { tasas }   = useTasas()
  const addToast    = useToastStore(s => s.addToast)

  // meDebenActivo / reload son parte del contrato del hook (Patrimonio
  // los consumirá en otra tarea); aquí solo necesitamos rows/loading.
  const { rows, setRows, loading } = useDineroFuera()

  // ── Form (create/edit) sheet ──
  const [formOpen, setFormOpen] = useState(false)
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)

  // ── Abono inline state ──
  const [abonoId,  setAbonoId]  = useState<string | null>(null)
  const [abonoVal, setAbonoVal] = useState('')

  // ── Confirmation state ──
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState<'pagado' | 'reabrir' | 'delete'>('pagado')


  // ── Sections ──────────────────────────────────────
  const meDeben = useMemo(
    () => rows.filter(r => r.tipo === 'prestamo' && !r.pagado),
    [rows],
  )
  const yoDebo = useMemo(
    () => rows.filter(r => r.tipo === 'deuda' && !r.pagado),
    [rows],
  )
  const pagados = useMemo(
    () => rows.filter(r => r.pagado),
    [rows],
  )

  const totalMeDeben = meDeben.reduce((s, r) => s + saldoPendiente(r), 0)
  const totalYoDebo  = yoDebo.reduce((s, r) => s + saldoPendiente(r), 0)

  // ── Open form (create / edit) ─────────────────────
  function openCreate() {
    setForm({ ...EMPTY_FORM, fecha: todayISO() })
    setFormOpen(true)
  }

  function openEdit(r: DineroFueraRow) {
    setForm({
      id:      r.id,
      persona: r.nombre ?? '',
      monto:   String(r.monto_original ?? ''),
      moneda:  'USD',  // monto_original siempre se guarda en USD
      fecha:   r.fecha_inicio ?? todayISO(),
      notas:   r.concepto ?? '',
      tipo:    (r.tipo === 'deuda' ? 'deuda' : 'prestamo'),
      pagado:  r.pagado,
    })
    setFormOpen(true)
  }

  // ── Save (insert or update) ───────────────────────
  async function handleSave() {
    if (saving) return
    const persona = form.persona.trim()
    const montoIn = parseFloat(form.monto)
    if (!persona)                 { addToast('Indica la persona', 'warn'); return }
    if (!montoIn || montoIn <= 0) { addToast('Monto inválido', 'warn');    return }
    if (!householdId)             { addToast('Sesión no resuelta', 'error'); return }

    // Convertir Bs → USD con la misma tasa BCV que usa NewTransaction
    const montoUSD = form.moneda === 'BS'
      ? +(montoIn / tasas.bcv).toFixed(2)
      : +montoIn.toFixed(2)

    const fechaPago = form.pagado ? todayISO() : null
    setSaving(true)

    if (form.id) {
      // ── UPDATE ──
      const patch = {
        nombre:         persona,
        concepto:       form.notas.trim() || null,
        monto_original: montoUSD,
        fecha_inicio:   form.fecha || null,
        tipo:           form.tipo,
        pagado:         form.pagado,
        fecha_pago:     fechaPago,
      }
      const { error } = await supabase
        .from('dinero_fuera')
        .update(patch)
        .eq('id', form.id)
      if (error) {
        setSaving(false)
        addToast('No se pudo guardar', 'error')
        return
      }
      setRows(prev => prev.map(r => (r.id === form.id ? { ...r, ...patch } : r)))
      addToast('Registro actualizado', 'info')
    } else {
      // ── INSERT ──
      const newRow: DineroFueraRow = {
        id:                crypto.randomUUID(),
        tipo:              form.tipo,
        nombre:            persona,
        concepto:          form.notas.trim() || null,
        monto_original:    montoUSD,
        monto_abonado:     0,
        abonos:            [],
        fecha_inicio:      form.fecha || null,
        fecha_vencimiento: null,
        fecha_pago:        fechaPago,
        pagado:            form.pagado,
      }
      const { error } = await supabase
        .from('dinero_fuera')
        .insert({ ...newRow, user_id: userId, household_id: householdId })
      if (error) {
        setSaving(false)
        addToast('No se pudo crear', 'error')
        return
      }
      setRows(prev => [newRow, ...prev])
      addToast('Registro creado', 'info')
    }

    setSaving(false)
    setFormOpen(false)
    setForm(EMPTY_FORM)
  }

  // ── Abono inline ──────────────────────────────────
  async function handleAbono(id: string) {
    const monto = parseFloat(abonoVal)
    if (!monto || monto <= 0) return
    setSaving(true)
    const row = rows.find(r => r.id === id)!
    const nuevosAbonos: Abono[] = [
      ...(row.abonos ?? []),
      { fecha: todayISO(), monto },
    ]
    const nuevoAbonado = (row.monto_abonado ?? 0) + monto
    const { error } = await supabase
      .from('dinero_fuera')
      .update({ monto_abonado: nuevoAbonado, abonos: nuevosAbonos })
      .eq('id', id)
    if (error) {
      addToast('No se pudo abonar', 'error')
    } else {
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, monto_abonado: nuevoAbonado, abonos: nuevosAbonos } : r,
      ))
    }
    setAbonoId(null)
    setAbonoVal('')
    setSaving(false)
  }

  // ── Marcar pagado / reabrir ───────────────────────
  async function handleTogglePagado(id: string, pagado: boolean) {
    const fecha_pago = pagado ? todayISO() : null
    const { error } = await supabase
      .from('dinero_fuera')
      .update({ pagado, fecha_pago })
      .eq('id', id)
    if (error) {
      addToast('No se pudo actualizar', 'error')
    } else {
      setRows(prev => prev.map(r =>
        r.id === id ? { ...r, pagado, fecha_pago } : r,
      ))
      addToast(pagado ? 'Marcado como pagado' : 'Reabierto', 'info')
    }
    setConfirmId(null)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('dinero_fuera')
      .delete()
      .eq('id', id)
    if (error) {
      addToast('No se pudo eliminar', 'error')
    } else {
      setRows(prev => prev.filter(r => r.id !== id))
      addToast('Registro eliminado', 'info')
    }
    setConfirmId(null)
  }

  const confirmRow = confirmId ? rows.find(r => r.id === confirmId) : undefined

  // ── Record card ───────────────────────────────────
  function RecordCard({ r }: { r: DineroFueraRow }) {
    const saldo     = saldoPendiente(r)
    const pct       = Math.min(100, r.monto_original > 0 ? (r.monto_abonado / r.monto_original) * 100 : 0)
    const isDebt    = r.tipo === 'deuda'
    const showAbono = abonoId === r.id
    const accent    = isDebt ? 'var(--neg)' : 'var(--pos)'

    return (
      <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, opacity: r.pagado ? 0.85 : 1 }}>

        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: isDebt ? 'rgba(214,106,90,.15)' : 'rgba(88,178,106,.15)',
            display: 'grid', placeItems: 'center', fontSize: 16,
          }}>
            {isDebt ? '↑' : '↓'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.nombre}</div>
            {r.concepto && (
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{r.concepto}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, color: accent }}>
              {fmt(saldo)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>de {fmt(r.monto_original)}</div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: 4, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 999, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 10 }}>
          <span>{pct.toFixed(0)}% pagado</span>
          {r.pagado && r.fecha_pago && (
            <span>Pagado: {new Date(r.fecha_pago + 'T12:00:00').toLocaleDateString('es-VE')}</span>
          )}
        </div>

        {/* ── Actions ── */}
        {showAbono ? (
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
            {!r.pagado && (
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
            )}
            {r.pagado ? (
              <button
                onClick={() => { setConfirmMode('reabrir'); setConfirmId(r.id) }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8,
                  background: 'var(--ink-3)', border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
                }}
              >
                ↩ Reabrir
              </button>
            ) : (
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
            )}
            <button
              onClick={() => openEdit(r)}
              style={{
                padding: '7px 10px', borderRadius: 8,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                color: 'var(--fg-dim)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
              title="Editar registro"
              aria-label="Editar"
            >
              <EditIcon />
            </button>
            <button
              onClick={() => { setConfirmMode('delete'); setConfirmId(r.id) }}
              style={{
                padding: '7px 10px', borderRadius: 8,
                background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                color: 'var(--neg)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
              title="Eliminar registro"
              aria-label="Eliminar"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader
        title="Dinero fuera"
        back
        right={
          <button
            onClick={openCreate}
            aria-label="Agregar registro"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--amber)', border: 'none',
              display: 'grid', placeItems: 'center', color: 'var(--ink-0)', cursor: 'pointer',
            }}
          >
            <PlusIcon />
          </button>
        }
      />

      {/* ── Summary ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--pos)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Me deben</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--pos)' }}>{fmt(totalMeDeben)}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--neg)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Yo debo</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--neg)' }}>{fmt(totalYoDebo)}</div>
        </div>
      </div>

      {/* ── Lists ── */}
      <div style={{ padding: '0 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '28px 0', fontSize: 13 }}>Cargando…</div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Sin registros. Toca <span style={{ color: 'var(--amber)', fontWeight: 700 }}>+</span> para agregar.
          </div>
        )}

        {/* ── Me deben ── */}
        {!loading && meDeben.length > 0 && (
          <>
            <SectionHeader label="Me deben" total={totalMeDeben} color="var(--pos)" fmt={fmt} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {meDeben.map(r => <RecordCard key={r.id} r={r} />)}
            </div>
          </>
        )}

        {/* ── Yo debo ── */}
        {!loading && yoDebo.length > 0 && (
          <>
            <SectionHeader label="Yo debo" total={totalYoDebo} color="var(--neg)" fmt={fmt} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {yoDebo.map(r => <RecordCard key={r.id} r={r} />)}
            </div>
          </>
        )}

        {/* ── Pagados (historial) ── */}
        {!loading && pagados.length > 0 && (
          <>
            <SectionHeader label={`Pagados · ${pagados.length}`} color="var(--fg-mute)" fmt={fmt} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {pagados.map(r => <RecordCard key={r.id} r={r} />)}
            </div>
          </>
        )}

      </div>

      <div style={{ height: 32 }} />

      {/* ── Create / Edit sheet ────────────────────── */}
      <Sheet open={formOpen} onClose={() => { setFormOpen(false); setForm(EMPTY_FORM) }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {form.id ? 'Editar registro' : 'Nuevo registro'}
        </div>

        {/* Tipo: Me deben / Yo debo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([
            { id: 'prestamo' as const, label: 'Me deben', color: 'var(--pos)' },
            { id: 'deuda'    as const, label: 'Yo debo',  color: 'var(--neg)' },
          ]).map(o => {
            const sel = form.tipo === o.id
            return (
              <button
                key={o.id}
                onClick={() => setForm(f => ({ ...f, tipo: o.id }))}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: sel ? `${o.color}1f` : 'var(--ink-2)',
                  color:      sel ? o.color : 'var(--fg-mute)',
                  border:     sel ? `1.5px solid ${o.color}55` : '1px solid var(--line)',
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>

        {/* Persona */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6 }}>
            Persona
          </div>
          <input
            type="text" value={form.persona}
            onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
            placeholder="Ej. Luis Eduardo Primo Isa"
            style={inputSt} maxLength={120}
          />
        </div>

        {/* Monto + moneda */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6 }}>
            Monto
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              placeholder="0.00"
              style={{ ...inputSt, flex: 1, fontFamily: 'var(--f-num)', fontWeight: 600 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['USD', 'BS'] as Moneda[]).map(m => {
                const sel = form.moneda === m
                return (
                  <button
                    key={m}
                    onClick={() => setForm(f => ({ ...f, moneda: m }))}
                    style={{
                      padding: '0 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 700,
                      background: sel ? 'var(--amber)' : 'var(--ink-2)',
                      color:      sel ? 'var(--ink-0)' : 'var(--fg-mute)',
                      border:     sel ? 'none' : '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
          {form.moneda === 'BS' && parseFloat(form.monto) > 0 && (
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 6 }}>
              ≈ ${(parseFloat(form.monto) / tasas.bcv).toFixed(2)} USD @ {tasas.bcv.toFixed(2)}
            </div>
          )}
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6 }}>
            Fecha
          </div>
          <input
            type="date" value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            style={{ ...inputSt, colorScheme: 'dark' }}
          />
        </div>

        {/* Notas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6 }}>
            Notas (opcional)
          </div>
          <textarea
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Concepto o detalle…" rows={2}
            style={{ ...inputSt, resize: 'none', lineHeight: 1.5 }} maxLength={200}
          />
        </div>

        {/* Estado: pendiente / pagado */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 6 }}>
            Estado
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { v: false, label: 'Pendiente' },
              { v: true,  label: 'Pagado'    },
            ]).map(o => {
              const sel = form.pagado === o.v
              return (
                <button
                  key={String(o.v)}
                  onClick={() => setForm(f => ({ ...f, pagado: o.v }))}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                    background: sel ? 'var(--ink-3)' : 'var(--ink-2)',
                    color:      sel ? 'var(--fg)' : 'var(--fg-mute)',
                    border:     sel ? '1.5px solid var(--line)' : '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setFormOpen(false); setForm(EMPTY_FORM) }}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'var(--amber)', border: 'none',
              fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >{saving ? 'Guardando…' : (form.id ? 'Guardar' : 'Crear')}</button>
        </div>
      </Sheet>

      {/* ── Confirmation sheet ────────────────────── */}
      <Sheet open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {confirmMode === 'delete' ? '🗑' : confirmMode === 'reabrir' ? '↩' : '✓'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {confirmMode === 'delete'
              ? '¿Eliminar registro?'
              : confirmMode === 'reabrir'
                ? '¿Reabrir registro?'
                : '¿Marcar como pagado?'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-mute)' }}>
            {confirmRow?.nombre} — {fmt(confirmRow?.monto_original ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 6 }}>
            {confirmMode === 'delete'
              ? 'Esta acción eliminará el registro permanentemente.'
              : confirmMode === 'reabrir'
                ? 'Volverá a la lista activa como pendiente.'
                : 'Se moverá al historial de pagados.'}
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
            onClick={() => {
              if (!confirmId) return
              if (confirmMode === 'delete')  handleDelete(confirmId)
              else if (confirmMode === 'reabrir') handleTogglePagado(confirmId, false)
              else handleTogglePagado(confirmId, true)
            }}
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
