// ═══════════════════════════════════════════════════
// Onboarding — 3-slide intro carousel
// Matches A1 mockup (slide 2 shown there).
// Completes by calling completeOnboarding() → /login
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { useAuthStore } from '../store/auth'

/* ── Slide data ─────────────────────────────────── */
const SLIDES = [
  {
    tag:    'Control total',
    line1:  'Conoce tu dinero',
    line2:  '',
    accent: 'real.',
    body:   'Conecta tus cuentas, registra cada movimiento y ve exactamente a dónde va tu dinero.',
  },
  {
    tag:    'Todo en uno',
    line1:  'Tu dinero,',
    line2:  'con ',
    accent: 'claridad.',
    body:   'Registra movimientos, conecta cuentas y deja que la IA te ayude a entender tus gastos sin esfuerzo.',
  },
  {
    tag:    'IA financiera',
    line1:  'Consejos que',
    line2:  '',
    accent: 'realmente ayudan.',
    body:   'Tu asistente IA analiza tus patrones de gasto y te da insights personalizados para alcanzar tus metas.',
  },
]

/* ── Slide 0 preview ── monthly KPI bars ────────── */
function MoneyPreview() {
  const rows = [
    { label: 'Ingresos', value: '$3,250', color: 'var(--pos)', pct: 100 },
    { label: 'Gastos',   value: '$1,842', color: 'var(--neg)', pct: 57  },
    { label: 'Ahorro',   value: '$1,408', color: 'var(--amber)', pct: 43 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {rows.map((r) => (
        <div key={r.label} style={{
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 14, padding: '13px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--fg-dim)' }}>{r.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: r.color }}>{r.value}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Slide 1 preview ── dashboard card stack ────── */
function DashboardPreview() {
  return (
    <div style={{
      background: 'linear-gradient(160deg, #1d2129, #21262f)',
      border: '1px solid rgba(224,168,74,.18)',
      borderRadius: 22, padding: '18px 18px 14px',
      boxShadow: '0 24px 64px rgba(0,0,0,.7)',
      width: '100%',
    }}>
      {/* Balance row */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 9, color: 'var(--fg-mute)', letterSpacing: '.16em',
          textTransform: 'uppercase', marginBottom: 3,
        }}>
          Patrimonio
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>$14,286</div>
      </div>

      {/* Insight IA card */}
      <div style={{
        background: 'rgba(224,168,74,.1)', border: '1px solid rgba(224,168,74,.22)',
        borderRadius: 12, padding: '9px 12px', display: 'flex', gap: 9, marginBottom: 10,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6, background: 'var(--amber)',
          display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
          color: 'var(--ink-0)', flexShrink: 0,
        }}>+</div>
        <div>
          <div style={{
            fontSize: 8, fontWeight: 700, color: 'var(--amber)',
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 2,
          }}>Insight IA</div>
          <div style={{ fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.4 }}>
            Gastaste 32% más en restaurantes esta semana
          </div>
        </div>
      </div>

      {/* Goal progress card */}
      <div style={{
        background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '9px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Viaje Japón</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)' }}>27%</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>$1,240</div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: '27%', background: 'var(--amber)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  )
}

/* ── Slide 2 preview ── AI chat bubbles ─────────── */
function AIPreview() {
  const msgs = [
    { role: 'bot',  text: 'Gastaste $264 en restaurantes. Es 32% más que marzo.' },
    { role: 'user', text: '¿Si reduzco a la mitad?' },
    { role: 'bot',  text: 'Ahorrarías $1,584 al año — suficiente para llegar a Japón en 4 meses. 🇯🇵' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            padding: '9px 13px', maxWidth: '84%',
            borderRadius: m.role === 'user'
              ? '14px 14px 3px 14px'
              : '3px 14px 14px 14px',
            background: m.role === 'user' ? 'var(--amber)' : 'rgba(255,255,255,.06)',
            border:     m.role === 'bot' ? '1px solid rgba(255,255,255,.08)' : 'none',
            fontSize: 12, lineHeight: 1.5,
            color: m.role === 'user' ? 'var(--ink-0)' : 'var(--fg-dim)',
          }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main component ─────────────────────────────── */
export default function Onboarding() {
  const navigate          = useNavigate()
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding)
  const [slide, setSlide]  = useState(0)

  const goToLogin = () => {
    completeOnboarding()
    navigate('/login', { replace: true })
  }

  const goNext = () => {
    if (slide < SLIDES.length - 1) {
      setSlide((s) => s + 1)
    } else {
      goToLogin()
    }
  }

  const s = SLIDES[slide]

  return (
    <div style={{
      minHeight:      '100dvh',
      background:     'radial-gradient(ellipse at 50% -8%, #2a1f0a 0%, #0a0b0d 52%)',
      display:        'flex',
      flexDirection:  'column',
      paddingTop:     'env(safe-area-inset-top, 12px)',
      paddingBottom:  'env(safe-area-inset-bottom, 20px)',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 22px 0',
      }}>
        <Logo iconSize={30} textSize={16} />
        <button
          onClick={goToLogin}
          style={{ fontSize: 13.5, color: 'var(--fg-mute)', fontWeight: 500, letterSpacing: '-.01em' }}
        >
          Saltar
        </button>
      </div>

      {/* ── Preview area ── */}
      <div style={{
        padding: '28px 26px 16px',
        minHeight: 224,
        display: 'flex',
        alignItems: 'center',
      }}>
        {slide === 0 && <MoneyPreview />}
        {slide === 1 && <DashboardPreview />}
        {slide === 2 && <AIPreview />}
      </div>

      {/* ── Slide content ── */}
      <div style={{ flex: 1, padding: '4px 28px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '.15em',
          textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 12,
        }}>
          {s.tag}
        </div>

        {/* Title lines */}
        <div style={{ marginBottom: 14 }}>
          {s.line1 && (
            <div className="font-display" style={{ fontSize: 34, lineHeight: 1.12 }}>
              {s.line1}
            </div>
          )}
          <div className="font-display" style={{ fontSize: 34, lineHeight: 1.12 }}>
            {s.line2}
            <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>
              {s.accent}
            </span>
          </div>
        </div>

        <p style={{
          fontSize: 14, color: 'var(--fg-mute)', lineHeight: 1.65,
          margin: 0, maxWidth: 320,
        }}>
          {s.body}
        </p>

        {/* Pagination dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 28 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                height: 6, borderRadius: 3, padding: 0,
                width:      i === slide ? 22 : 6,
                background: i === slide ? 'var(--amber)' : 'rgba(255,255,255,.2)',
                transition: 'width .22s ease, background .22s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: '20px 22px 8px' }}>
        <button
          onClick={goNext}
          style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: 'var(--amber)', fontSize: 15.5, fontWeight: 700,
            color: 'var(--ink-0)', letterSpacing: '.02em',
            boxShadow: '0 4px 22px rgba(224,168,74,.38)',
          }}
        >
          {slide < SLIDES.length - 1 ? 'Continuar' : 'Comenzar'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--fg-mute)' }}>
          Ya tengo cuenta ·{' '}
          <button
            onClick={goToLogin}
            style={{ color: 'var(--amber)', fontWeight: 600, fontSize: 13 }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
