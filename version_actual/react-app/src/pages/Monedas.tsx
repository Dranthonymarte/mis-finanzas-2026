import { useState, useEffect } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useAuthStore } from '../store/auth'
import { useTasas, saveTasas, fetchTasasHistory } from '../hooks/useTasas'

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 18, fontWeight: 600,
  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-num)',
  boxSizing: 'border-box',
}

interface HistRow { fecha: string; rate_bcv: number; rate_eur: number | null }

export default function Monedas() {
  const householdId = useAuthStore(s => s.householdId)
  const { tasas }   = useTasas()

  const [bcvInput,   setBcvInput]   = useState('')
  const [eurInput,   setEurInput]   = useState('')
  const [usdInput,   setUsdInput]   = useState('')
  const [bsInput,    setBsInput]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [fetching,   setFetching]   = useState(false)
  const [fetchMsg,   setFetchMsg]   = useState<string | null>(null)
  const [history,    setHistory]    = useState<HistRow[]>([])

  // Sync inputs when tasas loads from Supabase
  useEffect(() => {
    setBcvInput(String(tasas.bcv))
    setEurInput(String(tasas.eur))
  }, [tasas.bcv, tasas.eur])

  useEffect(() => {
    fetchTasasHistory().then(setHistory)
  }, [])

  // Fetch BCV rate from public API (ve.dolarapi.com)
  async function handleFetchRate() {
    setFetching(true)
    setFetchMsg(null)
    try {
      const res  = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { promedio?: number; fechaActualizacion?: string }
      const rate = data.promedio
      if (!rate || rate <= 0) throw new Error('Tasa inválida')
      setBcvInput(rate.toFixed(2))
      const dateLabel = data.fechaActualizacion
        ? new Date(data.fechaActualizacion).toLocaleDateString('es-VE')
        : 'hoy'
      setFetchMsg(`✓ Tasa BCV actualizada al ${dateLabel}: Bs ${rate.toFixed(2)}`)
    } catch {
      setFetchMsg('⚠ No se pudo obtener la tasa. Actualiza manualmente.')
    } finally {
      setFetching(false)
    }
  }

  async function handleSaveRates() {
    if (!householdId) return
    const bcv = parseFloat(bcvInput)
    const eur = parseFloat(eurInput)
    if (!bcv || !eur) return
    setSaving(true)
    await saveTasas(householdId, bcv, eur)
    setSaving(false)
    setSaved(true)
    fetchTasasHistory().then(setHistory)
    setTimeout(() => setSaved(false), 2000)
  }

  const bcv = parseFloat(bcvInput) || tasas.bcv
  const eur = parseFloat(eurInput) || tasas.eur

  function handleUsdChange(v: string) {
    setUsdInput(v)
    const n = parseFloat(v)
    setBsInput(isNaN(n) ? '' : (n * bcv).toFixed(2))
  }

  function handleBsChange(v: string) {
    setBsInput(v)
    const n = parseFloat(v)
    setUsdInput(isNaN(n) ? '' : (n / bcv).toFixed(2))
  }

  const usdNum  = parseFloat(usdInput) || 0
  const eurCalc = usdNum > 0 ? (usdNum * bcv) / eur : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Monedas y tasas" back />

      {/* ── Tasas BCV ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Tasas BCV
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Auto-fetch button */}
          <button
            onClick={handleFetchRate}
            disabled={fetching}
            style={{
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              borderRadius: 10, padding: '9px 12px', fontSize: 12.5,
              fontWeight: 600, cursor: fetching ? 'default' : 'pointer',
              color: 'var(--fg-dim)', display: 'flex', alignItems: 'center',
              gap: 8, opacity: fetching ? .7 : 1,
            }}
          >
            <span style={{ fontSize: 16 }}>🌐</span>
            {fetching ? 'Consultando BCV…' : 'Obtener tasa BCV automáticamente'}
          </button>

          {fetchMsg && (
            <div style={{
              fontSize: 11.5, padding: '8px 10px', borderRadius: 8,
              background: fetchMsg.startsWith('✓') ? 'rgba(63,185,80,.1)' : 'rgba(214,106,90,.1)',
              color: fetchMsg.startsWith('✓') ? 'var(--pos)' : 'var(--neg)',
            }}>
              {fetchMsg}
            </div>
          )}

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
            disabled={saving}
            style={{
              background: saved ? 'var(--pos)' : 'var(--amber)', color: 'var(--ink-0)',
              border: 'none', borderRadius: 10, padding: '10px', fontSize: 13,
              fontWeight: 600, cursor: saving ? 'default' : 'pointer',
              opacity: saving ? .7 : 1, transition: 'background .2s',
            }}
          >
            {saved ? '✓  Tasas guardadas' : saving ? 'Guardando…' : 'Guardar tasas'}
          </button>
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
              type="number" value={usdInput}
              onChange={e => handleUsdChange(e.target.value)}
              placeholder="0.00"
              style={{ ...inp, color: 'var(--amber)', fontSize: 20 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Bolívares Bs</div>
            <input
              type="number" value={bsInput}
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
            {history.map((h, i) => (
              <div
                key={h.fecha}
                style={{
                  padding: '11px 14px',
                  borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--f-num)' }}>
                    Bs {h.rate_bcv.toFixed(2)} / USD
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 2 }}>
                    {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-VE')}
                  </div>
                </div>
                {h.rate_eur && (
                  <span style={{ fontSize: 12, color: 'var(--fg-mute)', fontFamily: 'var(--f-num)' }}>
                    Bs {h.rate_eur.toFixed(2)} / €
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}
