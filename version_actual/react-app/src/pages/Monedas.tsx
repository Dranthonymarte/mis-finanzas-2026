import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'

const LS_KEY  = 'mis_finanzas_tasas'
const LS_HIST = 'mis_finanzas_tasas_hist'

interface Rate { bcv: number; eur: number; updatedAt: string }

function loadRates(): Rate {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Rate
  } catch { /* ignore */ }
  return { bcv: 431.01, eur: 499.62, updatedAt: '' }
}

function persistRates(r: Rate) {
  localStorage.setItem(LS_KEY, JSON.stringify(r))
  try {
    const hist: Rate[] = JSON.parse(localStorage.getItem(LS_HIST) || '[]')
    hist.unshift(r)
    localStorage.setItem(LS_HIST, JSON.stringify(hist.slice(0, 20)))
  } catch { /* ignore */ }
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 18, fontWeight: 600,
  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-num)',
}

export default function Monedas() {
  const [rates,    setRates]    = useState<Rate>(loadRates)
  const [bcvInput, setBcvInput] = useState(String(loadRates().bcv))
  const [eurInput, setEurInput] = useState(String(loadRates().eur))
  const [usdInput, setUsdInput] = useState('')
  const [bsInput,  setBsInput]  = useState('')
  const [saved,    setSaved]    = useState(false)
  const [history,  setHistory]  = useState<Rate[]>([])

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(LS_HIST) || '[]') as Rate[])
    } catch { /* ignore */ }
  }, [])

  function handleSaveRates() {
    const bcv = parseFloat(bcvInput) || 431.01
    const eur = parseFloat(eurInput) || 499.62
    const next: Rate = { bcv, eur, updatedAt: new Date().toISOString() }
    setRates(next)
    persistRates(next)
    setHistory(JSON.parse(localStorage.getItem(LS_HIST) || '[]') as Rate[])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleUsdChange(v: string) {
    setUsdInput(v)
    const n = parseFloat(v)
    setBsInput(isNaN(n) ? '' : (n * rates.bcv).toFixed(2))
  }

  function handleBsChange(v: string) {
    setBsInput(v)
    const n = parseFloat(v)
    setUsdInput(isNaN(n) ? '' : (n / rates.bcv).toFixed(2))
  }

  const usdNum = parseFloat(usdInput) || 0
  const eurCalc = usdNum > 0 ? (usdNum * rates.bcv) / rates.eur : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Monedas y tasas" back />

      {/* ── Tasas actuales ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Tasas BCV
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Bs / USD (BCV)</div>
            <input type="number" value={bcvInput} onChange={e => setBcvInput(e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Bs / EUR</div>
            <input type="number" value={eurInput} onChange={e => setEurInput(e.target.value)} style={inp} />
          </div>
          <button
            onClick={handleSaveRates}
            style={{
              background: saved ? 'var(--pos)' : 'var(--amber)', color: 'var(--ink-0)',
              border: 'none', borderRadius: 10, padding: '10px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', transition: 'background .2s',
            }}
          >
            {saved ? '✓  Tasas guardadas' : 'Guardar tasas'}
          </button>
          {rates.updatedAt && (
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
              Actualizado: {new Date(rates.updatedAt).toLocaleString('es-VE')}
            </div>
          )}
        </div>
      </div>

      {/* ── Conversor ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Conversor
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>USD $</div>
            <input
              type="number"
              value={usdInput}
              onChange={e => handleUsdChange(e.target.value)}
              placeholder="0.00"
              style={{ ...inp, color: 'var(--amber)', fontSize: 20 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Bolívares Bs</div>
            <input
              type="number"
              value={bsInput}
              onChange={e => handleBsChange(e.target.value)}
              placeholder="0.00"
              style={{ ...inp, fontSize: 20 }}
            />
          </div>
          {usdNum > 0 && (
            <div style={{
              background: 'var(--ink-3)', borderRadius: 10, padding: '9px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>EUR €</span>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--f-num)', color: 'var(--info)' }}>
                €{eurCalc.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial ── */}
      {history.length > 0 && (
        <div style={{ padding: '20px 16px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Historial
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {history.slice(0, 10).map((h, i) => (
              <div
                key={i}
                style={{
                  padding: '11px 14px',
                  borderBottom: i < Math.min(history.length, 10) - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--f-num)' }}>
                    Bs {h.bcv.toFixed(2)} / USD
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>
                    {h.updatedAt ? new Date(h.updatedAt).toLocaleDateString('es-VE') : '—'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-mute)', fontFamily: 'var(--f-num)' }}>
                  Bs {h.eur.toFixed(2)} / €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
