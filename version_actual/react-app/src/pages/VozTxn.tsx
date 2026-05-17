// ═══════════════════════════════════════════════════
// VozTxn — /voz  (BLOQUE 6)
// Web Speech API (es-VE) → parse amount + desc
// Pre-fills /new-txn via sessionStorage
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import { MicIcon } from '../components/icons/Icons'
import { useFormat } from '../hooks/useFormat'

// Extracts the first number in the text (integer or decimal)
function parseAmount(text: string): number | null {
  const m = text.match(/\d+(?:[.,]\d+)?/)
  if (!m) return null
  return parseFloat(m[0].replace(',', '.'))
}

// Strips the detected number + money words to get the description
function parseDesc(text: string, amount: number | null): string {
  if (amount == null) return text.trim()
  return text
    .replace(/\d+(?:[.,]\d+)?/, '')
    .replace(/dólares?|usd|bs\.?|bolívares?|bsf?|\$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export default function VozTxn() {
  const navigate  = useNavigate()
  const { fmt }   = useFormat()

  const [listening,  setListening]  = useState(false)
  const [transcript, setTranscript] = useState('')
  const [amount,     setAmount]     = useState<number | null>(null)
  const [desc,       setDesc]       = useState('')
  const [supported,  setSupported]  = useState(true)
  const [pulseStep,  setPulseStep]  = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null)
  const pulseRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w   = window as any
    const SR  = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new SR()
    r.lang            = 'es-VE'
    r.continuous      = false
    r.interimResults  = true
    r.maxAlternatives = 1

    r.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results)
        .map((res: SpeechRecognitionResult) => res[0].transcript)
        .join(' ')
      setTranscript(t)
      const a = parseAmount(t)
      setAmount(a)
      setDesc(parseDesc(t, a))
    }
    r.onend = () => {
      setListening(false)
      if (pulseRef.current) clearInterval(pulseRef.current)
      setPulseStep(0)
    }
    recognizerRef.current = r

    return () => { if (pulseRef.current) clearInterval(pulseRef.current) }
  }, [])

  function toggleListen() {
    if (listening) {
      recognizerRef.current?.stop()
    } else {
      setTranscript('')
      setAmount(null)
      setDesc('')
      try {
        recognizerRef.current?.start()
        setListening(true)
        let step = 0
        pulseRef.current = setInterval(() => {
          step = (step + 1) % 4
          setPulseStep(step)
        }, 400)
      } catch {
        // already started
      }
    }
  }

  function handleUse() {
    sessionStorage.setItem(
      'voz_prefill',
      JSON.stringify({ amount: amount != null ? String(amount) : '', desc }),
    )
    navigate('/new-txn')
  }

  const dots = '   '.split('').map((_, i) => i < pulseStep ? '●' : '○').join(' ')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="Registro por voz" back />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 28px', gap: 28,
      }}>

        {!supported ? (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '24px 20px',
            textAlign: 'center', color: 'var(--fg-mute)', fontSize: 14, lineHeight: 1.6,
          }}>
            Tu navegador no soporta reconocimiento de voz.
            <br />Usa <strong>Chrome en Android</strong> o <strong>Safari en iOS</strong>.
          </div>
        ) : (
          <>
            {/* ── Mic button ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button
                onClick={toggleListen}
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: listening ? 'var(--neg)' : 'var(--amber)',
                  border: 'none', cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--ink-0)',
                  boxShadow: listening
                    ? '0 0 0 14px rgba(214,106,90,.18), 0 0 0 28px rgba(214,106,90,.07)'
                    : '0 8px 24px rgba(0,0,0,.35)',
                  transition: 'background .2s, box-shadow .3s',
                }}
                aria-label={listening ? 'Detener' : 'Comenzar grabación'}
              >
                <span style={{ transform: 'scale(1.4)' }}>
                  <MicIcon />
                </span>
              </button>

              <div style={{ fontSize: 13, color: 'var(--fg-mute)', letterSpacing: '.04em' }}>
                {listening ? dots : 'Toca para hablar'}
              </div>
            </div>

            {/* ── Transcript card ── */}
            {transcript && (
              <div style={{
                background: 'var(--ink-2)', border: '1px solid var(--line)',
                borderRadius: 16, padding: '16px', width: '100%', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  Escuché
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>{transcript}</div>

                {amount != null && (
                  <div className="num" style={{
                    marginTop: 12, fontSize: 30, fontWeight: 700,
                    color: 'var(--amber)',
                  }}>
                    {fmt(amount)}
                  </div>
                )}

                {desc && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg-mute)' }}>
                    Descripción: <em>{desc}</em>
                  </div>
                )}
              </div>
            )}

            {/* ── Use button ── */}
            {amount != null && (
              <button
                onClick={handleUse}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12,
                  background: 'var(--amber)', color: 'var(--ink-0)',
                  border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Usar en nuevo movimiento →
              </button>
            )}

            {/* ── Tip ── */}
            {!transcript && (
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', lineHeight: 1.6 }}>
                Di algo como:<br />
                <em>"Veinte dólares de gasolina"</em>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
