import { useState, useRef, useEffect } from 'react'
import Sparkline from '../components/ui/Sparkline'
import { MOCK_CHAT } from '../data/mock'

const QUICK_CHIPS = [
  '¿Cuánto gasté en comida?',
  '¿Mi categoría más cara?',
  'Flujo de caja abril',
  'Cómo llegar a mi meta',
]

/* ── Inline chart for restaurant message ── */
function MiniChart() {
  const data = [180, 210, 195, 240, 264]
  return (
    <div style={{ marginTop: 10, background: 'var(--ink-3)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        Restaurantes — últimas 5 semanas
      </div>
      <Sparkline data={data} color="var(--neg)" w={220} h={32} fill stroke={1.6} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, fontSize: 9, color: 'var(--fg-mute)',
      }}>
        {['Ene', 'Feb', 'Mar', 'Abr', 'May'].map(m => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Chat bubble ── */
function Bubble({ msg }: { msg: typeof MOCK_CHAT[0] }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8, marginBottom: 14,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'var(--amber)', color: 'var(--ink-0)',
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
        }}>✦</div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          padding: isUser ? '9px 14px' : '11px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--amber)' : 'var(--ink-2)',
          border: isUser ? 'none' : '1px solid var(--line)',
          fontSize: isUser ? 13.5 : 14,
          color: isUser ? 'var(--ink-0)' : 'var(--fg)',
          fontFamily: isUser ? 'var(--f-ui)' : 'var(--f-display)',
          lineHeight: 1.5,
          fontWeight: isUser ? 500 : 400,
        }}>
          {msg.text}
          {msg.chart && <MiniChart />}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--fg-mute)', marginTop: 3,
          textAlign: isUser ? 'right' : 'left', paddingInline: 4,
        }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

export default function AI() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'var(--amber)', color: 'var(--ink-0)',
            display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700,
          }}>✦</div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1 }}>Asistente IA</div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', lineHeight: 1.2 }}>Groq · Llama 3.1</div>
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'var(--pos)', fontWeight: 600,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--pos)', display: 'inline-block',
            }} />
            en línea
          </div>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 4px' }}>
        {MOCK_CHAT.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick chips ── */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 16px',
        overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', flexShrink: 0,
      }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setInput(chip)}
            style={{
              padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
              whiteSpace: 'nowrap', cursor: 'pointer',
              background: 'var(--amber-d)', color: 'var(--amber)',
              border: '1px solid var(--amber-d)',
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: '8px 16px 16px', borderTop: '1px solid var(--line)',
        background: 'var(--ink-1)', flexShrink: 0,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* mic */}
        <button style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
          fontSize: 17,
        }}>
          🎙
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta sobre tus finanzas…"
          style={{
            flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '10px 14px', fontSize: 13.5,
            color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)',
          }}
        />
        {/* send */}
        <button style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: input.trim() ? 'var(--amber)' : 'var(--ink-3)',
          border: 'none', display: 'grid', placeItems: 'center',
          color: input.trim() ? 'var(--ink-0)' : 'var(--fg-mute)',
          fontSize: 18, cursor: 'pointer', transition: 'background .15s',
        }}>
          ↑
        </button>
      </div>

    </div>
  )
}
