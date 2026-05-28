// ═══════════════════════════════════════════════════
// Calculadora — básica + conversión USD·VES·EUR
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useTasas } from '../hooks/useTasas'

type ConvDir = 'USD' | 'VES' | 'EUR'

const BTNS = [
  ['C', '±', '⌫', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.',  '='],        // '0' spans 2 cols → 2+1+1 = 4 ✓
]

const btnBase: React.CSSProperties = {
  width: '100%', aspectRatio: '1', borderRadius: 18,
  fontSize: 20, fontWeight: 600, border: 'none',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
  transition: 'opacity .1s',
}

export default function Calculadora() {
  const { tasas } = useTasas()

  // ── Calculator state ─────────────────────────────
  const [display,  setDisplay]  = useState('0')
  const [prev,     setPrev]     = useState<number | null>(null)
  const [op,       setOp]       = useState<string | null>(null)
  const [lastOp,   setLastOp]   = useState<string | null>(null)  // para repetir = (patrón iOS)
  const [lastArg,  setLastArg]  = useState<number | null>(null)  // segundo operando al repetir =
  const [fresh,    setFresh]    = useState(false)   // next digit starts new number

  function pressDigit(d: string) {
    if (fresh) { setDisplay(d === '.' ? '0.' : d); setFresh(false); return }
    if (d === '.' && display.includes('.')) return
    setDisplay(display === '0' && d !== '.' ? d : display + d)
  }

  function pressOp(o: string) {
    const cur = parseFloat(display)
    if (prev !== null && op && !fresh) {
      const res = calc(prev, cur, op)
      setDisplay(fmtNum(res))
      setPrev(res)
    } else {
      setPrev(cur)
    }
    setOp(o)
    setLastOp(null)   // nueva operación anula el repeat
    setFresh(true)
  }

  function pressEq() {
    const cur = parseFloat(display)
    // Caso normal: hay prev + op pendientes
    if (prev !== null && op !== null) {
      const res = calc(prev, cur, op)
      setDisplay(fmtNum(res))
      setLastOp(op)     // guardar para repetición
      setLastArg(cur)   // guardar segundo operando
      setPrev(null)
      setOp(null)
      setFresh(true)
      return
    }
    // Caso repeat: usuario presiona = de nuevo → repetir última operación (patrón iOS)
    if (lastOp !== null && lastArg !== null) {
      const res = calc(cur, lastArg, lastOp)
      setDisplay(fmtNum(res))
      setFresh(true)
    }
  }

  function pressSpecial(k: string) {
    if (k === 'C')  {
      setDisplay('0'); setPrev(null); setOp(null)
      setLastOp(null); setLastArg(null); setFresh(false)
    }
    if (k === '±')  { setDisplay(fmtNum(-parseFloat(display))) }
    if (k === '%')  { setDisplay(fmtNum(parseFloat(display) / 100)) }
    if (k === '⌫') {
      if (fresh) { setDisplay('0'); setFresh(false); return }
      const next = display.length > 1 ? display.slice(0, -1) : '0'
      setDisplay(next)
    }
  }

  function handleBtn(k: string) {
    if ('0123456789.'.includes(k)) pressDigit(k)
    else if ('÷×−+'.includes(k))  pressOp(k)
    else if (k === '=')            pressEq()
    else                           pressSpecial(k)
  }

  // ── Converter state ──────────────────────────────
  const [convAmount, setConvAmount] = useState('')
  const [convFrom,   setConvFrom]   = useState<ConvDir>('USD')

  const amount = parseFloat(convAmount) || 0
  const usdVal = convFrom === 'USD' ? amount
               : convFrom === 'VES' ? amount / tasas.bcv
               : amount * (tasas.bcv / tasas.eur)   // EUR→USD approx via BCV/EUR ratio

  const convResult: Record<ConvDir, number> = {
    USD: usdVal,
    VES: usdVal * tasas.bcv,
    EUR: usdVal * tasas.eur / tasas.bcv,
  }

  function fmt(n: number) {
    return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const DIRS: ConvDir[] = ['USD', 'VES', 'EUR']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--ink-0)' }}>
      <AppHeader title="Calculadora" back />

      {/* ── Display ── */}
      <div style={{
        padding: '20px 20px 8px', textAlign: 'right',
        background: 'var(--ink-1)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', minHeight: 18, marginBottom: 4 }}>
          {prev !== null && op ? `${fmtNum(prev)} ${op}` : ''}
        </div>
        <div className="num" style={{
          fontSize: display.length > 12 ? 26 : display.length > 8 ? 32 : 40,
          fontWeight: 300, color: 'var(--fg)', letterSpacing: '-.02em',
          overflowX: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {display}
        </div>
      </div>

      {/* ── Pad ── */}
      <div style={{ padding: '10px 16px', background: 'var(--ink-1)' }}>
        {BTNS.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
            {row.map(k => {
              const isOp  = '÷×−+='.includes(k)
              const isClear = k === 'C'
              const is0   = k === '0'
              const bg = isOp ? 'var(--amber)'
                       : isClear ? 'var(--neg)'
                       : 'var(--ink-3)'
              const fg = isOp || isClear ? 'var(--ink-0)' : 'var(--fg)'
              return (
                <button
                  key={k}
                  onClick={() => handleBtn(k)}
                  style={{
                    ...btnBase,
                    background: bg, color: fg,
                    fontSize: k === '⌫' ? 18 : 20,
                    gridColumn: is0 ? 'span 2' : undefined,
                    aspectRatio: is0 ? '2/1' : '1',
                    borderRadius: is0 ? 18 : 18,
                  }}
                >
                  {k}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />

      {/* ── Converter ── */}
      <div style={{ padding: '16px 16px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-mute)', marginBottom: 12 }}>
          Conversor
        </div>

        {/* From selector + input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {DIRS.map(d => (
            <button
              key={d}
              onClick={() => setConvFrom(d)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: convFrom === d ? 'var(--amber)' : 'var(--ink-2)',
                color:      convFrom === d ? 'var(--ink-0)' : 'var(--fg-dim)',
                border:     convFrom === d ? 'none' : '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >{d}</button>
          ))}
        </div>

        <input
          type="number"
          value={convAmount}
          onChange={e => setConvAmount(e.target.value)}
          placeholder="Monto a convertir"
          style={{
            width: '100%', background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '11px 14px', fontSize: 18, fontWeight: 600,
            color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DIRS.filter(d => d !== convFrom).map(d => (
            <div key={d} style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-mute)', letterSpacing: '.08em' }}>{d}</span>
                <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2 }}>
                  {d === 'VES' ? `Tasa BCV: ${tasas.bcv}` : d === 'EUR' ? `Tasa EUR: ${tasas.eur}` : 'Base'}
                </div>
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--amber)' }}>
                {fmt(convResult[d])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }} />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────
function calc(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default:  return b
  }
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return 'Error'
  // Máximo 12 dígitos significativos, sin notación científica para rangos normales
  const rounded = parseFloat(n.toPrecision(12))
  const s = rounded.toString()
  if (s.includes('e') || s.includes('E')) {
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 8, useGrouping: false })
  }
  return s
}
