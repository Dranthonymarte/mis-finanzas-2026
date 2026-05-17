// ═══════════════════════════════════════════════════
// TxnDetail — /txn/:id
// Full screen, no TabBar. Back → navigate(-1).
// Capa 1: UIX mock. Capa 4: Supabase CRUD.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { ArrowLeftIcon, TrashIcon } from '../components/icons/Icons'
import { MOCK_TRANSACTIONS, MOCK_ACCOUNTS, fmt, txnGroup } from '../data/mock'

/* ── Detail row ── */
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

const labelSt: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
  textTransform: 'uppercase', color: 'var(--fg-mute)',
  padding: '18px 16px 8px',
}

export default function TxnDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [confirmDelete, setConfirmDelete] = useState(false)

  const txn = MOCK_TRANSACTIONS.find(t => t.id === id)
  const acc = txn ? MOCK_ACCOUNTS.find(a => a.id === txn.accountId) : undefined

  if (!txn) {
    navigate(-1)
    return null
  }

  const group   = txnGroup(txn.tipo)
  const isInc   = group === 'ingreso'
  const isAhorro = group === 'ahorro'
  const color   = isInc ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--neg)'
  const sign    = isInc ? '+' : '−'
  const catC    = catColor(txn.cat)

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
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
          }}
        >
          <ArrowLeftIcon />
        </button>

        <div className="font-display" style={{ fontSize: 18, lineHeight: 1 }}>
          Movimiento
        </div>

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
            <CatIcon cat={txn.cat} size={48} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="num" style={{
              fontSize: 42, fontWeight: 700, color, letterSpacing: '-.02em', lineHeight: 1,
            }}>
              {sign}{fmt(Math.abs(txn.amount))}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>{txn.desc}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 4 }}>
              {txn.cat} · {txn.date} · {txn.time}
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

        {/* ── Details card ── */}
        <div style={labelSt}>Detalles</div>
        <div style={{ margin: '0 16px', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <DetailRow label="Categoría"    value={txn.cat} />
          <DetailRow label="Fecha"        value={txn.date} />
          <DetailRow label="Hora"         value={txn.time} />
          <DetailRow label="Registrado por" value={txn.author === 'isabel' ? 'Isabel' : 'Anthony'} />
          <DetailRow label="Cuenta" value={acc?.name ?? '—'} last />
        </div>

        {/* ── Delete confirmation ── */}
        {confirmDelete && (
          <div style={{ margin: '20px 16px 0' }}>
            <div style={{
              background: 'rgba(214,106,90,.08)',
              border: '1px solid rgba(214,106,90,.3)',
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
                    // TODO Capa 4: supabase soft-delete
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
