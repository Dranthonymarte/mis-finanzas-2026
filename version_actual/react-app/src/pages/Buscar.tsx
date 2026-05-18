// ═══════════════════════════════════════════════════
// Buscar — /buscar  (BLOQUE 6)
// Global transaction search across all months.
// Debounced ilike query on descripcion + cat.
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useFormat }    from '../hooks/useFormat'
import { ArrowLeftIcon, SearchIcon } from '../components/icons/Icons'
import CatIcon from '../components/ui/CatIcon'
import { txnGroup } from '../data/mock'

interface SearchRow {
  id:          string
  descripcion: string
  tipo:        string
  cat:         string
  amount:      number
  fecha:       string
  mes:         string
}

export default function Buscar() {
  const navigate    = useNavigate()
  const householdId = useAuthStore(s => s.householdId)
  const { fmt }     = useFormat()
  const inputRef    = useRef<HTMLInputElement>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchRow[]>([])
  const [loading, setLoading] = useState(false)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !householdId) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('movimientos')
        .select('id,descripcion,tipo,cat,amount,fecha,mes')
        .eq('user_id', householdId)   // Vanilla data: user_id = household UUID
        .is('deleted_at', null)
        .or(`descripcion.ilike.%${q}%,cat.ilike.%${q}%`)
        .order('fecha', { ascending: false })
        .limit(60)
      setResults((data ?? []) as SearchRow[])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, householdId])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 12px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: 'var(--ink-1)',
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center',
            color: 'var(--fg-dim)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeftIcon />
        </button>

        {/* Search input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '8px 12px',
        }}>
          <span style={{ color: 'var(--fg-mute)', display: 'grid' }}>
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Descripción o categoría…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--fg)', fontFamily: 'var(--f-ui)',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              style={{
                background: 'none', border: 'none', color: 'var(--fg-mute)',
                cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Buscando…
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Escribe al menos 2 caracteres
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Sin resultados para «{query.trim()}»
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </div>
            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {results.map((r, i) => {
                const grp   = txnGroup(r.tipo)
                const isInc = grp === 'ingreso'
                const isSav = grp === 'ahorro'
                const color = isInc ? 'var(--pos)' : isSav ? 'var(--info)' : 'var(--fg)'
                const sign  = isInc ? '+' : '−'

                return (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/txn/${r.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr auto',
                      gap: 10, alignItems: 'center',
                      padding: '11px 14px',
                      borderBottom: i < results.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <CatIcon cat={r.cat} />

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.descripcion}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
                        {r.cat}
                        {' · '}
                        {r.mes}
                        {' · '}
                        {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                      {sign}{fmt(Math.abs(r.amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
