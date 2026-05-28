// ═══════════════════════════════════════════════════
// Buscar — /buscar  (BLOQUE 6)
// Global transaction search with advanced filters.
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useFormat }    from '../hooks/useFormat'
import { useAccounts }  from '../hooks/useAccounts'
import { ArrowLeftIcon, SearchIcon } from '../components/icons/Icons'
import CatIcon from '../components/ui/CatIcon'
import { txnGroup } from '../data/mock'

interface SearchRow {
  id:          string
  descripcion: string
  tipo:        string
  cat:         string
  subcat:      string | null
  amount:      number
  fecha:       string
  mes:         string
  cuenta_id:   string | null
  rate_type:   string | null
}

const TIPOS = [
  'Gasto', 'Ingreso Fijo', 'Ingreso Variable',
  'Ahorro en efectivo', 'Prestamo recibido', 'Prestamo pagado', 'Ajuste',
]

export default function Buscar() {
  const navigate    = useNavigate()
  const householdId = useAuthStore(s => s.householdId)
  const { fmt }     = useFormat()
  const { accounts } = useAccounts()
  const inputRef    = useRef<HTMLInputElement>(null)

  const [query,      setQuery]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterTipo,  setFilterTipo]  = useState('')
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')
  const [filterCuenta, setFilterCuenta] = useState('')
  const [filterBCV,   setFilterBCV]   = useState('')
  const [results, setResults] = useState<SearchRow[]>([])
  const [loading, setLoading] = useState(false)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const activeFilterCount = [filterTipo, filterFrom, filterTo, filterCuenta, filterBCV].filter(Boolean).length

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    const hasFilters = !!(filterTipo || filterFrom || filterTo || filterCuenta || filterBCV)
    if ((q.length < 2 && !hasFilters) || !householdId) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      let qb = supabase
        .from('movimientos')
        .select('id,descripcion,tipo,cat,subcat,amount,fecha,mes,cuenta_id,rate_type')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('fecha', { ascending: false })
        .limit(80)

      if (q.length >= 2) qb = qb.or(`descripcion.ilike.%${q}%,cat.ilike.%${q}%`)
      if (filterTipo)   qb = qb.eq('tipo', filterTipo)
      if (filterFrom)   qb = qb.gte('fecha', filterFrom)
      if (filterTo)     qb = qb.lte('fecha', filterTo)
      if (filterCuenta) qb = qb.eq('cuenta_id', filterCuenta)
      if (filterBCV === 'bcv')    qb = qb.eq('rate_type', 'bcv')
      if (filterBCV === 'no-bcv') qb = qb.neq('rate_type', 'bcv')

      const { data } = await qb
      setResults((data ?? []) as SearchRow[])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, filterTipo, filterFrom, filterTo, filterCuenta, filterBCV, householdId])

  const sel: React.CSSProperties = {
    background: 'var(--ink-3)', border: '1px solid var(--line)',
    borderRadius: 10, padding: '7px 10px', fontSize: 13,
    color: 'var(--fg)', outline: 'none', width: '100%',
    fontFamily: 'var(--f-ui)',
  }
  const dateInput: React.CSSProperties = {
    ...sel, colorScheme: 'dark',
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{
        padding: '12px 12px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingRight: 'max(20px, calc(16px + env(safe-area-inset-right, 0px)))',
        background: 'var(--ink-1)',
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: showFilters ? 10 : 0 }}>
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
            <span style={{ color: 'var(--fg-mute)', display: 'grid' }}><SearchIcon /></span>
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
              <button onClick={() => { setQuery(''); setResults([]) }}
                style={{ background: 'none', border: 'none', color: 'var(--fg-mute)', cursor: 'pointer', padding: 0, fontSize: 16 }}>
                ✕
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              flexShrink: 0, height: 36, padding: '0 12px', borderRadius: 10,
              background: activeFilterCount > 0 ? 'var(--amber)' : 'var(--ink-2)',
              border: '1px solid var(--line)',
              color: activeFilterCount > 0 ? 'var(--ink-0)' : 'var(--fg-dim)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            ⚙ {activeFilterCount > 0 ? activeFilterCount : ''}
          </button>
        </div>

        {/* ── Filter panel ── */}
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Tipo</div>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={sel}>
                <option value="">Todos</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Cuenta</div>
              <select value={filterCuenta} onChange={e => setFilterCuenta(e.target.value)} style={sel}>
                <option value="">Todas</option>
                {(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Desde</div>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={dateInput} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Hasta</div>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={dateInput} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>Tasa</div>
              <select value={filterBCV} onChange={e => setFilterBCV(e.target.value)} style={sel}>
                <option value="">Todas</option>
                <option value="bcv">Solo BCV</option>
                <option value="no-bcv">Sin BCV</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <button
                  onClick={() => { setFilterTipo(''); setFilterFrom(''); setFilterTo(''); setFilterCuenta(''); setFilterBCV('') }}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 10,
                    background: 'none', border: '1px solid var(--line)',
                    color: 'var(--fg-mute)', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>Buscando…</div>
        )}
        {!loading && query.trim().length < 2 && !activeFilterCount && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Escribe al menos 2 caracteres o aplica filtros
          </div>
        )}
        {!loading && (query.trim().length >= 2 || activeFilterCount > 0) && results.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '32px 0', fontSize: 13 }}>
            Sin resultados
          </div>
        )}
        {results.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </div>
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
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
                      display: 'grid', gridTemplateColumns: '36px 1fr auto',
                      gap: 10, alignItems: 'center', padding: '11px 14px',
                      borderBottom: i < results.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <CatIcon cat={r.cat} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.descripcion}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
                        {r.cat}{r.subcat ? ` · ${r.subcat}` : ''} · {r.mes} · {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
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
