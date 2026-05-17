// ═══════════════════════════════════════════════════
// CsvImport — /csv-import  (BLOQUE 6)
// Upload CSV → preview → bulk insert movimientos
// Expected columns: fecha,descripcion,cat,tipo,amount
// ═══════════════════════════════════════════════════

import { useState, useRef } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useFormat }    from '../hooks/useFormat'
import { mesIdToDbKey, dateToMesId } from '../lib/mes'

interface CsvRow {
  fecha:       string
  descripcion: string
  cat:         string
  tipo:        string
  amount:      number
  _valid:      boolean
  _error:      string
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  const idx     = (k: string) => headers.indexOf(k)

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))

    const fecha       = cols[idx('fecha')]                                    ?? ''
    const descripcion = cols[idx('descripcion')] ?? cols[idx('description')] ?? ''
    const cat         = cols[idx('cat')]         ?? cols[idx('categoria')]    ?? 'Otros'
    const tipo        = cols[idx('tipo')]                                     ?? 'Gasto'
    const raw         = cols[idx('amount')]      ?? cols[idx('monto')]        ?? '0'
    const amount      = parseFloat(raw.replace(/[^0-9.-]/g, ''))

    const dateOk   = !!fecha && !isNaN(Date.parse(fecha))
    const amountOk = !isNaN(amount) && amount !== 0
    const _valid   = dateOk && amountOk
    const _error   = !fecha ? 'fecha requerida'
                   : !dateOk ? 'fecha inválida'
                   : !amountOk ? 'monto inválido'
                   : ''

    return { fecha, descripcion, cat, tipo, amount, _valid, _error }
  })
}

export default function CsvImport() {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)
  const { fmt }     = useFormat()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [rows,      setRows]      = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported,  setImported]  = useState<number | null>(null)
  const [error,     setError]     = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRows(parseCSV(text))
      setImported(null)
      setError('')
    }
    reader.readAsText(file, 'utf-8')
    // Reset input so re-selecting same file triggers onChange
    e.target.value = ''
  }

  async function handleImport() {
    const valid = rows.filter(r => r._valid)
    if (!valid.length || !userId || !householdId) return
    setImporting(true)
    setError('')

    const movs = valid.map(r => ({
      id:           crypto.randomUUID(),
      user_id:      userId,
      household_id: householdId,
      mes:          mesIdToDbKey(dateToMesId(new Date(r.fecha + 'T12:00:00'))),
      descripcion:  r.descripcion || r.cat,
      tipo:         r.tipo,
      cat:          r.cat,
      amount:       r.amount,
      amount_bs:    0,
      fecha:        r.fecha,
      author:       'anthony',
      rate_type:    'bcv',
    }))

    const { error: err } = await supabase.from('movimientos').insert(movs)
    if (err) {
      setError(err.message)
      setImporting(false)
      return
    }
    setImported(valid.length)
    setRows([])
    setImporting(false)
  }

  const validCount = rows.filter(r => r._valid).length
  const preview    = rows.slice(0, 20)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Importar CSV" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Format hint ── */}
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '12px 14px',
          fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--fg)', marginBottom: 4, fontSize: 13 }}>
            Formato CSV esperado
          </div>
          <code style={{ fontFamily: 'var(--f-num)', fontSize: 11, color: 'var(--amber)' }}>
            fecha,descripcion,cat,tipo,amount
          </code>
          <div style={{ marginTop: 4, fontSize: 11 }}>
            fecha: YYYY-MM-DD · amount: número decimal positivo para ingresos, negativo para gastos
          </div>
        </div>

        {/* ── File picker ── */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
            borderRadius: 14, padding: '18px',
            color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', width: '100%',
          }}
        >
          <span style={{ fontSize: 22 }}>📂</span>
          Seleccionar archivo CSV
        </button>

        {/* ── Success banner ── */}
        {imported != null && (
          <div style={{
            background: 'rgba(88,178,106,.12)', border: '1px solid rgba(88,178,106,.3)',
            borderRadius: 12, padding: '12px 14px',
            fontSize: 13, color: 'var(--pos)', fontWeight: 600, textAlign: 'center',
          }}>
            ✓ {imported} movimiento{imported !== 1 ? 's' : ''} importado{imported !== 1 ? 's' : ''}
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.3)',
            borderRadius: 12, padding: '12px 14px',
            fontSize: 13, color: 'var(--neg)',
          }}>
            {error}
          </div>
        )}

        {/* ── Preview table ── */}
        {rows.length > 0 && (
          <>
            <div style={{
              fontSize: 11, color: 'var(--fg-mute)',
              letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4,
            }}>
              Vista previa · {validCount}/{rows.length} válidos
            </div>

            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {preview.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderBottom: i < preview.length - 1 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: r._valid ? 1 : 0.45,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.descripcion || r.cat || '—'}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 1 }}>
                      {r.fecha} · {r.cat} · {r.tipo}
                    </div>
                    {r._error && (
                      <div style={{ fontSize: 10, color: 'var(--neg)', marginTop: 1 }}>
                        ⚠ {r._error}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    color: r.amount >= 0 ? 'var(--pos)' : 'var(--neg)',
                  }}>
                    {r.amount >= 0 ? '+' : '−'}{fmt(Math.abs(r.amount))}
                  </div>
                </div>
              ))}
              {rows.length > 20 && (
                <div style={{
                  padding: '10px 14px', fontSize: 11.5,
                  color: 'var(--fg-mute)', textAlign: 'center',
                }}>
                  … y {rows.length - 20} fila{rows.length - 20 !== 1 ? 's' : ''} más
                </div>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              style={{
                padding: '13px', borderRadius: 12,
                background: importing || validCount === 0 ? 'var(--ink-3)' : 'var(--amber)',
                color: importing || validCount === 0 ? 'var(--fg-mute)' : 'var(--ink-0)',
                border: 'none', fontSize: 14, fontWeight: 700,
                cursor: importing || validCount === 0 ? 'default' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {importing
                ? 'Importando…'
                : validCount === 0
                  ? 'Sin filas válidas'
                  : `Importar ${validCount} movimiento${validCount !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
