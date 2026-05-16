// ═══════════════════════════════════════════════════
// Login — PIN keypad + Face ID
// Matches A2 mockup exactly.
// PIN defaults to '1234' for demo. Supabase in C.
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { type CSSProperties } from 'react'
import { Logo } from '../components/brand/Logo'
import { useAuthStore } from '../store/auth'

/* ── Delete icon (backspace) ── */
function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12H8m0 0l4-4m-4 4 4 4M3 12a1 1 0 0 1 .383-.776l5-4A1 1 0 0 1 10 8v8a1 1 0 0 1-1.617.776l-5-4A1 1 0 0 1 3 12z"/>
    </svg>
  )
}

/* ── Face ID icon ── */
function FaceIDIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M9 9h.01M15 9h.01M9 15c.75.75 1.5 1 3 1s2.25-.25 3-1"/>
    </svg>
  )
}

/* ── Keypad button style ── */
const keyBase: CSSProperties = {
  width:        '100%',
  aspectRatio:  '1.15',
  borderRadius: 18,
  background:   'var(--ink-2)',
  border:       '1px solid var(--line)',
  display:      'grid',
  placeItems:   'center',
  color:        'var(--fg)',
  fontSize:     26,
  fontWeight:   300,
  letterSpacing: '-.02em',
  transition:   'background .1s',
}

const KEYPAD = ['1','2','3','4','5','6','7','8','9','faceid','0','del'] as const
type Key = typeof KEYPAD[number]

const PIN_LENGTH = 4

export default function Login() {
  const navigate       = useNavigate()
  const authenticate   = useAuthStore((s) => s.authenticate)
  const userName       = useAuthStore((s) => s.userName)
  const userInitial    = useAuthStore((s) => s.userInitial)

  const [digits,  setDigits]  = useState<string[]>([])
  const [shaking, setShaking] = useState(false)
  const [error,   setError]   = useState(false)

  /* ── Auto-submit when PIN is complete ── */
  useEffect(() => {
    if (digits.length !== PIN_LENGTH) return
    const ok = authenticate(digits.join(''))
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setShaking(true)
      setError(true)
      setTimeout(() => { setShaking(false); setError(false); setDigits([]) }, 640)
    }
  }, [digits, authenticate, navigate])

  /* ── Hardware keyboard support (dev) ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key) && digits.length < PIN_LENGTH) {
        setDigits((d) => [...d, e.key])
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && digits.length > 0) {
        setDigits((d) => d.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [digits])

  const handleKey = (k: Key) => {
    if (shaking) return
    if (k === 'del') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    if (k === 'faceid') {
      /* Demo: Face ID bypasses PIN check */
      authenticate('1234')
      navigate('/', { replace: true })
      return
    }
    if (digits.length < PIN_LENGTH) {
      setDigits((d) => [...d, k])
    }
  }

  return (
    <div style={{
      minHeight:     '100dvh',
      background:    'radial-gradient(ellipse at 50% -4%, #1f1509 0%, #0a0b0d 52%)',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      paddingTop:    'env(safe-area-inset-top, 16px)',
      paddingBottom: 'env(safe-area-inset-bottom, 20px)',
    }}>
      {/* ── Logo ── */}
      <div style={{ paddingTop: 16, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Logo iconSize={28} textSize={15} />
      </div>

      {/* ── Avatar + greeting ── */}
      <div style={{ marginTop: 52, textAlign: 'center' }}>
        <div style={{
          width:        88,
          height:       88,
          borderRadius: 26,
          margin:       '0 auto 16px',
          background:   'linear-gradient(145deg, var(--teal), var(--amber))',
          display:      'grid',
          placeItems:   'center',
          fontSize:     36,
          fontWeight:   700,
          color:        'var(--ink-0)',
          boxShadow:    '0 8px 32px rgba(224,168,74,.28)',
          userSelect:   'none',
        }}>
          {userInitial}
        </div>

        <div style={{
          fontSize:      9.5,
          fontWeight:    700,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color:         'var(--fg-mute)',
          marginBottom:  7,
        }}>
          Bienvenido de vuelta
        </div>

        <div className="font-display" style={{ fontSize: 38, lineHeight: 1.1 }}>
          {userName}
        </div>
      </div>

      {/* ── PIN dots ── */}
      <div style={{ marginTop: 38, textAlign: 'center' }}>
        <div
          style={{ display: 'flex', gap: 16, justifyContent: 'center' }}
          className={shaking ? 'pin-shake' : ''}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < digits.length
            return (
              <div
                key={i}
                style={{
                  width:       14,
                  height:      14,
                  borderRadius: '50%',
                  background:  filled
                    ? (error ? 'var(--neg)' : 'var(--amber)')
                    : 'transparent',
                  border:      '2px solid',
                  borderColor: filled
                    ? (error ? 'var(--neg)' : 'var(--amber)')
                    : 'rgba(255,255,255,.22)',
                  transition:  'background .15s, border-color .15s',
                }}
              />
            )
          })}
        </div>
        <div style={{
          marginTop: 12, fontSize: 12.5,
          color: error ? 'var(--neg)' : 'var(--fg-mute)',
          transition: 'color .15s',
        }}>
          {error ? 'PIN incorrecto' : 'Introduce tu PIN o usa Face ID'}
        </div>
      </div>

      {/* ── Numeric keypad ── */}
      <div style={{
        marginTop:           36,
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                 10,
        width:               '100%',
        maxWidth:            290,
        padding:             '0 4px',
      }}>
        {KEYPAD.map((k) => {
          if (k === 'faceid') {
            return (
              <button key="faceid" onClick={() => handleKey('faceid')}
                aria-label="Face ID" style={keyBase}>
                <FaceIDIcon />
              </button>
            )
          }
          if (k === 'del') {
            return (
              <button key="del" onClick={() => handleKey('del')}
                aria-label="Borrar" style={keyBase}>
                <DeleteIcon />
              </button>
            )
          }
          return (
            <button
              key={k}
              onClick={() => handleKey(k)}
              aria-label={k}
              style={keyBase}
            >
              {k}
            </button>
          )
        })}
      </div>

      {/* ── Change account ── */}
      <div style={{ marginTop: 'auto', paddingTop: 28, fontSize: 13, color: 'var(--fg-mute)' }}>
        ¿No eres {userName}?{' '}
        <button style={{ color: 'var(--amber)', fontWeight: 600, fontSize: 13 }}>
          Cambiar cuenta
        </button>
      </div>
    </div>
  )
}
