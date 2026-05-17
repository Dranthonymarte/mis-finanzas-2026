// ═══════════════════════════════════════════════════
// TxnDetail — /txn/:id
// View + inline edit + soft-delete
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { ArrowLeftIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon } from '../components/icons/Icons'
import { MOCK_TRANSACTIONS, MOCK_ACCOUNTS, fmt, txnGroup } from '../data/mock'

// ── Editable categories (matches NewTransaction CATS_BY_TIPO for Gasto) ──
const EDIT_CATS = [
  'Alimentación', 'Restaurantes', 'Transporte', 'Entretenimiento',
  'Salud', 'Hogar', 'Servicios', 'Suscripciones', 'Ropa', 'Ocio', 'Educación',
  'Trabajo', 'Inversión',
]

/* ── View row ── */
function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 14px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--fg-mute)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{value}</span>
    </div>
  )
}

/* ── Edit field row ── */
function EditRow({
  label, children, last,
}: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--fg-mute)', width: 80, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

const inputSt: CSSProperties = {
  flex: 1, background: 'var(--ink-3)', border: '1px solid var(--line)',
  borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--fg)',
  outline: 'none',
}

const labelSt: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
  textTransform: 'uppercase', color: 'var(--fg-mute)',
  padding: '18px 16px 8px',
}

export default function TxnDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const txn = MOCK_TRANSACTIONS.find(t => t.id === id)
  const acc = txn ? MOCK_ACCOUNTS.find(a => a.id === txn.accountId) : undefined

  const [editMode,      setEditMode]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Edit state — initialized from txn
  const [editDesc,   setEditDesc]   = useState(txn?.desc ?? '')
  const [editCat,    setEditCat]    = useState(txn?.cat ?? '')
  const [editAmount, setEditAmount] = useState(txn ? String(Math.abs(txn.amount)) : '')
  const [editFecha,  setEditFecha]  = useState(txn?.date ?? '')

  if (!txn) {
    navigate(-1)
    return null
  }

  const group    = txnGroup(txn.tipo)
  const isInc    = group === 'ingreso'
  const isAhorro = group === 'ahorro'
  const color    = isInc ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--neg)'
  const sign     = isInc ? '+' : '−'
  const catC     = catColor(editMode ? editCat : txn.cat)

  function enterEdit() {
    setEditDesc(txn!.desc)
    setEditCat(txn!.cat)
    setEditAmount(String(Math.abs(txn!.amount)))
    setEditFecha(txn!.date)
    setEditMode(true)
  }

  function saveEdit() {
    console.log('[TxnDetail] update', txn!.id, { descripcion: editDesc, cat: editCat, fecha: editFecha })
    setEditMode(false)
  }

  function cancelEdit() {
    setEditMode(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 12px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'var(--ink-1)', position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <button
          onClick={() => editMode ? cancelEdit() : navigate(-1)}
          aria-label={editMode ? 'Cancelar' : 'Volver'}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
          }}
        >
          {editMode ? <CloseIcon /> : <ArrowLeftIcon />}
        </button>

        <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>
          {editMode ? 'Editar' : 'Movimiento'}
        </div>

        {editMode ? (
          <button
            onClick={saveEdit}
            aria-label="Guardar"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--pos)', border: 'none',
              display: 'grid', placeItems: 'center', color: '#fff', cursor: 'pointer',
            }}
          >
            <CheckIcon />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={enterEdit}
              aria-label="Editar"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
              }}
            >
              <EditIcon />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                display: 'grid', placeItems: 'center', color: 'var(--neg)', cursor: 'pointer',
              }}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ── Hero ── */}
        <div style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: Math.round(64 * 0.28),
            background: `${catC}22`, border: `1px solid ${catC}44`,
            display: 'grid', placeItems: 'center',
          }}>
            <CatIcon cat={editMode ? editCat : txn.cat} size={48} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 42, fontWeight: 700, color, letterSpacing: '-.02em', lineHeight: 1 }}>
              {sign}{fmt(Math.abs(editMode ? parseFloat(editAmount) || txn.amount : txn.amount))}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>
              {editMode ? editDesc : txn.desc}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 4 }}>
              {editMode ? editCat : txn.cat} · {txn.date} · {txn.time}
            </div>
          </div>
        </div>

        {/* ── Type badge ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{
            padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            background: `${isInc ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--neg)'}1a`,
            color, border: `1px solid ${isInc ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--neg)'}40`,
            letterSpacing: '.04em',
          }}>
            {txn.tipo}
          </span>
        </div>

        {/* ── EDIT MODE fields ── */}
        {editMode ? (
          <>
            <div style={labelSt}>Editar detalles</div>
            <div style={{ margin: '0 16px', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>

              <EditRow label="Monto USD">
                <input
                  type="number"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  style={{ ...inputSt, textAlign: 'right', fontWeight: 700, color }}
                />
              </EditRow>

              <EditRow label="Descripción">
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  style={inputSt}
                />
              </EditRow>

              <EditRow label="Categoría">
                <select
                  value={editCat}
                  onChange={e => setEditCat(e.target.value)}
                  style={{ ...inputSt, cursor: 'pointer' }}
                >
                  {EDIT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </EditRow>

              <EditRow label="Fecha" last>
                <input
                  type="date"
                  value={editFecha}
                  onChange={e => setEditFecha(e.target.value)}
                  style={inputSt}
                />
              </EditRow>

            </div>

            <div style={{ margin: '12px 16px' }}>
              <button
                onClick={saveEdit}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: 'var(--amber)', border: 'none',
                  fontSize: 15, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer',
                }}
              >
                Guardar cambios
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── VIEW MODE details ── */}
            <div style={labelSt}>Detalles</div>
            <div style={{ margin: '0 16px', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <DetailRow label="Categoría"      value={txn.cat} />
              <DetailRow label="Fecha"          value={txn.date} />
              <DetailRow label="Hora"           value={txn.time} />
              <DetailRow label="Registrado por" value={txn.author === 'isabel' ? 'Isabel' : 'Anthony'} />
              {txn.recurrente && <DetailRow label="Recurrente" value={`Día ${txn.recDia} de cada mes`} />}
              <DetailRow label="Cuenta" value={acc?.name ?? '—'} last />
            </div>
          </>
        )}

        {/* ── Delete confirmation ── */}
        {confirmDelete && !editMode && (
          <div style={{ margin: '20px 16px 0' }}>
            <div style={{
              background: 'rgba(214,106,90,.08)', border: '1px solid rgba(214,106,90,.3)',
              borderRadius: 14, padding: '16px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--neg)', textAlign: 'center', marginBottom: 6 }}>
                ¿Eliminar este movimiento?
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
                Se archivará. No afecta el historial contable.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                    background: 'var(--ink-2)', border: '1px solid var(--line)',
                    color: 'var(--fg-dim)', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    console.log('[TxnDetail] soft-delete', txn.id)
                    navigate(-1)
                  }}
                  style={{
                    padding: '11px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                    background: 'var(--neg)', border: 'none', color: '#fff', cursor: 'pointer',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 'calc(32px + env(safe-area-inset-bottom, 0px))' }} />
      </div>
    </div>
  )
}
