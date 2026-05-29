import { useState, useEffect } from 'react'
import { type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CatIcon, { catColor } from '../components/ui/CatIcon'
import { ArrowLeftIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon } from '../components/icons/Icons'
import { useAccounts } from '../hooks/useAccounts'
import { useFormat }   from '../hooks/useFormat'
import { useConfig } from '../hooks/useConfig'
import { supabase }     from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import ConfirmSheet from '../components/ui/ConfirmSheet'

interface SupaMovimiento {
  id:          string
  descripcion: string
  tipo:        string
  cat:         string
  subcat:      string | null
  amount:      number
  amount_bs:   number | null
  fecha:       string
  author:      string | null
  mes:         string
  cuenta_id:   string | null
  created_at:  string
  rate_bcv:    number | null
  notas:       string | null
  method:      string | null
}

const METHODS_EDIT = ['Pago móvil','Transferencia','Zelle','Efectivo en dólares','Efectivo en bolívares','Tarjeta de débito','Binance']

function chipEdit(active: boolean): CSSProperties {
  return {
    padding: '7px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0,
    whiteSpace: 'nowrap' as const, cursor: 'pointer',
    background: active ? 'var(--amber)' : 'var(--ink-3)',
    color:      active ? 'var(--ink-0)' : 'var(--fg-dim)',
    border:     active ? 'none' : '1px solid var(--line)',
  }
}

function txnColor(tipo: string, esIngreso: boolean): string {
  if (esIngreso) return 'var(--pos)'
  if (tipo.includes('Ahorro'))   return 'var(--info)'
  if (tipo.includes('Transfer')) return 'var(--teal)'
  return 'var(--neg)'
}

function fmtAuthor(raw: string | null): string {
  if (!raw) return '—'
  const v = raw.toLowerCase()
  if (v === 'i' || v === 'isabel') return 'Isabel'
  return 'Anthony'
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

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


const labelSt: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
  textTransform: 'uppercase', color: 'var(--fg-mute)',
  padding: '18px 16px 8px',
}

export default function TxnDetail() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const { fmt }      = useFormat()
  const { accounts } = useAccounts()
  const { config }   = useConfig()
  const householdId  = useAuthStore(s => s.householdId)

  const [txn,           setTxn]           = useState<SupaMovimiento | null>(null)
  const [loadingTxn,    setLoadingTxn]    = useState(true)
  const [editMode,      setEditMode]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [editDesc,   setEditDesc]   = useState('')
  const [editCat,    setEditCat]    = useState('')
  const [editSubcat, setEditSubcat] = useState('')
  const [editTipo,   setEditTipo]   = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editFecha,  setEditFecha]  = useState('')
  const [editMethod, setEditMethod] = useState('')
  const [editRate,   setEditRate]   = useState('')
  const [editNotas,  setEditNotas]  = useState('')
  const [editAuthor, setEditAuthor] = useState<'anthony' | 'isabel'>('anthony')

  useEffect(() => {
    if (!id) return
    supabase
      .from('movimientos')
      .select('id,descripcion,tipo,cat,subcat,amount,amount_bs,fecha,author,mes,cuenta_id,created_at,notas,method,rate_bcv')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoadingTxn(false); return }
        const row = data as SupaMovimiento
        setTxn(row)
        setEditDesc(row.descripcion)
        setEditCat(row.cat)
        setEditSubcat(row.subcat ?? '')
        setEditTipo(row.tipo)
        setEditAmount(String(Math.abs(row.amount)))
        setEditFecha(row.fecha)
        setEditMethod(row.method ?? '')
        setEditRate(String(row.rate_bcv ?? ''))
        setEditNotas(row.notas ?? '')
        setEditAuthor((row.author === 'isabel' ? 'isabel' : 'anthony') as 'anthony' | 'isabel')
        setLoadingTxn(false)
      })
  }, [id, navigate])

  if (!id) { navigate(-1); return null }

  if (loadingTxn) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Cargando…</div>
      </div>
    )
  }

  if (!txn) return null

  const tipoObj   = (config.tipos ?? []).find(t => t.nombre === txn.tipo) ?? { nombre: txn.tipo, esIngreso: false }
  const esIngreso = tipoObj.esIngreso
  const color     = txnColor(txn.tipo, esIngreso)
  const catC      = catColor(editMode ? editCat : txn.cat)
  const acc       = accounts?.find(a => a.id === txn.cuenta_id)
  const allCats   = config.categorias[editTipo || txn.tipo] ?? config.categorias[txn.tipo] ?? [txn.cat]

  async function saveEdit() {
    if (!txn || !householdId) return
    // Soft-delete the original to preserve audit trail
    const { error: delErr } = await supabase
      .from('movimientos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', txn.id)
    if (delErr) { console.error('[TxnDetail] soft-delete:', delErr.message); return }

    // Re-create with updated fields (new UUID = new row)
    const newId      = crypto.randomUUID()
    const tipoEdObj  = (config.tipos ?? []).find(t => t.nombre === (editTipo || txn.tipo)) ?? { esIngreso: false }
    const esAhorroEd = (editTipo || txn.tipo).includes('Ahorro')
    const parsedAmt  = parseFloat(editAmount)
    const parsedRate = parseFloat(editRate)
    const signEd     = tipoEdObj.esIngreso ? 1 : esAhorroEd ? (parsedAmt > 0 ? 1 : -1) : -1
    const { error: insErr } = await supabase
      .from('movimientos')
      .insert({
        id:           newId,
        user_id:      householdId,
        household_id: householdId,
        mes:          txn.mes,
        descripcion:  editDesc || txn.descripcion,
        tipo:         editTipo || txn.tipo,
        cat:          editCat  || txn.cat,
        subcat:       editSubcat || txn.subcat || '',
        amount:       !isNaN(parsedAmt) ? signEd * Math.abs(parsedAmt) : txn.amount,
        amount_bs:    !isNaN(parsedAmt) ? (Math.abs(parsedAmt) * (!isNaN(parsedRate) && parsedRate > 0 ? parsedRate : (txn.rate_bcv ?? 1))) : (txn.amount_bs ?? 0),
        method:       editMethod || txn.method || '',
        fecha:        editFecha  || txn.fecha,
        author:       editAuthor,
        rate_type:    'bcv',
        rate_bcv:     !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : txn.rate_bcv,
        cuenta_id:    txn.cuenta_id,
        notas:        editNotas || null,
      })
    if (insErr) { console.error('[TxnDetail] recreate:', insErr.message); return }

    // Reflect changes locally
    setTxn(prev => prev ? { ...prev, id: newId, descripcion: editDesc, cat: editCat, tipo: editTipo || prev.tipo, fecha: editFecha || prev.fecha, method: editMethod || prev.method } : prev)
    setEditMode(false)
  }

  async function handleDelete() {
    const { error } = await supabase
      .from('movimientos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', txn!.id)
    if (!error) navigate(-1)
    else console.error('[TxnDetail] delete error:', error.message)
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
          onClick={() => editMode ? setEditMode(false) : navigate(-1)}
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
          <button onClick={saveEdit} aria-label="Guardar" style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--pos)', border: 'none',
            display: 'grid', placeItems: 'center', color: '#fff', cursor: 'pointer',
          }}>
            <CheckIcon />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditMode(true)} aria-label="Editar" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
            }}>
              <EditIcon />
            </button>
            <button onClick={() => setConfirmDelete(true)} aria-label="Eliminar" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              display: 'grid', placeItems: 'center', color: 'var(--neg)', cursor: 'pointer',
            }}>
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
              {fmt(Math.abs(txn.amount))}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 6 }}>
              {editMode ? editDesc : txn.descripcion}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 4 }}>
              {editMode ? editCat : txn.cat} · {txn.fecha} · {fmtTime(txn.created_at)}
            </div>
          </div>
        </div>

        {/* ── Type badge ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{
            padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            background: `${color}1a`, color,
            border: `1px solid ${color}40`,
            letterSpacing: '.04em',
          }}>
            {txn.tipo}
          </span>
        </div>

        {/* ── EDIT MODE — mismo flujo que registro ── */}
        {editMode ? (
          <>
            {/* Tipo */}
            <div style={labelSt}>Tipo</div>
            <div style={{ padding: '0 16px 4px', display: 'flex', gap: 6, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {(config.tipos ?? []).map(t => (
                <button key={t.nombre} onClick={() => { setEditTipo(t.nombre); setEditCat(''); setEditSubcat('') }} style={chipEdit(editTipo === t.nombre || (!editTipo && t.nombre === txn.tipo))}>
                  {t.nombre}
                </button>
              ))}
            </div>

            {/* Categoría */}
            {allCats.length > 0 && (
              <>
                <div style={labelSt}>Categoría</div>
                <div style={{ padding: '0 16px 4px', display: 'flex', gap: 6, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {allCats.map(c => (
                    <button key={c} onClick={() => { setEditCat(c); setEditSubcat('') }} style={chipEdit(editCat === c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Subcategoría */}
            {(() => {
              const subs = config.subcategorias?.[editCat || txn.cat] ?? []
              return subs.length > 0 ? (
                <>
                  <div style={labelSt}>Subcategoría</div>
                  <div style={{ padding: '0 16px 4px', display: 'flex', gap: 6, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {subs.map(s => (
                      <button key={s} onClick={() => setEditSubcat(s)} style={chipEdit(editSubcat === s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : null
            })()}

            {/* Monto */}
            <div style={labelSt}>Monto (USD)</div>
            <div style={{ padding: '0 16px 4px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 16px' }}>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 28, color, opacity: 0.7, marginRight: 4 }}>$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  style={{ fontFamily: 'var(--f-display)', fontSize: 36, lineHeight: 1, color, background: 'transparent', border: 'none', outline: 'none', width: '8ch', letterSpacing: '-.02em' }}
                />
              </div>
            </div>

            {/* Descripción */}
            <div style={labelSt}>Descripción</div>
            <div style={{ padding: '0 16px 4px' }}>
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción del movimiento…"
                style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)' }}
              />
            </div>

            {/* Fecha */}
            <div style={labelSt}>Fecha</div>
            <div style={{ padding: '0 16px 4px' }}>
              <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: 'var(--fg)', outline: 'none', colorScheme: 'dark' } as CSSProperties}
              />
            </div>

            {/* Método */}
            <div style={labelSt}>Método de pago</div>
            <div style={{ padding: '0 16px 4px', display: 'flex', gap: 6, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {METHODS_EDIT.map(m => (
                <button key={m} onClick={() => setEditMethod(m)} style={chipEdit(editMethod === m)}>
                  {m}
                </button>
              ))}
            </div>

            {/* Autor */}
            <div style={labelSt}>Registrado por</div>
            <div style={{ padding: '0 16px 4px', display: 'flex', gap: 6 }}>
              {(['anthony', 'isabel'] as const).map(a => (
                <button key={a} onClick={() => setEditAuthor(a)} style={chipEdit(editAuthor === a)}>
                  {a === 'anthony' ? 'Anthony' : 'Isabel'}
                </button>
              ))}
            </div>

            {/* Tasa BCV */}
            <div style={labelSt}>Tasa BCV (Bs/$)</div>
            <div style={{ padding: '0 16px 4px' }}>
              <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} placeholder="Tasa BCV"
                style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)' }}
              />
            </div>

            {/* Notas */}
            <div style={labelSt}>Notas</div>
            <div style={{ padding: '0 16px 4px' }}>
              <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Notas adicionales (opcional)…" rows={2}
                style={{ width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)', resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* Guardar */}
            <div style={{ margin: '16px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button onClick={saveEdit} style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--amber)', border: 'none', fontSize: 15, fontWeight: 700, color: 'var(--ink-0)', cursor: 'pointer' }}>
                Guardar cambios
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── VIEW MODE ── */}
            <div style={labelSt}>Detalles</div>
            <div style={{ margin: '0 16px', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <DetailRow label="Categoría"      value={txn.cat} />
              {txn.subcat && <DetailRow label="Subcategoría" value={txn.subcat} />}
              <DetailRow label="Fecha"          value={txn.fecha} />
              <DetailRow label="Hora"           value={fmtTime(txn.created_at)} />
              <DetailRow label="Registrado por" value={fmtAuthor(txn.author)} />
              <DetailRow label="Cuenta"         value={acc?.name ?? '—'} last={!txn.method && txn.rate_bcv == null} />
              {txn.method && <DetailRow label="Método" value={txn.method} last={txn.rate_bcv == null} />}
              {txn.rate_bcv != null && <DetailRow label="Tasa BCV" value={`${txn.rate_bcv.toFixed(2)} Bs/$`} />}
              <DetailRow label="Notas" value={txn.notas || '—'} last />
            </div>
          </>
        )}

        <div style={{ height: 'calc(32px + env(safe-area-inset-bottom, 0px))' }} />
      </div>

      <ConfirmSheet
        open={confirmDelete && !editMode}
        title="¿Eliminar este movimiento?"
        message="Se archivará. No afecta el historial contable."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
