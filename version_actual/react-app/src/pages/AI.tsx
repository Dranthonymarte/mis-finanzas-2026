import { useState, useRef, useEffect } from 'react'
import Sparkline from '../components/ui/Sparkline'
import { type ChatMsg, MOCK_CHAT } from '../data/mock'

const BOT_RESPONSES = [
  'Basado en tus datos, este mes gastaste más de lo habitual en esa categoría.',
  'Tu tasa de ahorro está por encima del promedio. ¡Sigue así!',
  'Detecté un patrón recurrente en tus gastos. ¿Quieres que lo analice?',
  'Según tu historial, podrías alcanzar esa meta en unos 4 meses.',
]

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
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>(MOCK_CHAT)
  const [typing,   setTyping]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')

    const userMsg: ChatMsg = {
      role: 'user',
      text: msg,
      time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    setTimeout(() => {
      const botMsg: ChatMsg = {
        role: 'bot',
        text: BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)],
        time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, botMsg])
      setTyping(false)
    }, 1100)
  }

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
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'var(--amber)', color: 'var(--ink-0)',
              display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
            }}>✦</div>
            <div style={{
              padding: '11px 16px',
              borderRadius: '4px 16px 16px 16px',
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-mute)',
                  animation: `typingDot .9s ${i * .2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
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
            onClick={() => handleSend(chip)}
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
        {/* mic — sets focus to input (voice Bloque 5) */}
        <button
          onClick={() => document.getElementById('ai-input')?.focus()}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', cursor: 'pointer',
            fontSize: 17,
          }}
          aria-label="Entrada de voz"
        >
          🎙
        </button>
        <input
          id="ai-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
          placeholder="Pregunta sobre tus finanzas…"
          style={{
            flex: 1, background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '10px 14px', fontSize: 13.5,
            color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-ui)',
          }}
        />
        {/* send */}
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || typing}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() && !typing ? 'var(--amber)' : 'var(--ink-3)',
            border: 'none', display: 'grid', placeItems: 'center',
            color: input.trim() && !typing ? 'var(--ink-0)' : 'var(--fg-mute)',
            fontSize: 18, cursor: input.trim() && !typing ? 'pointer' : 'default',
            transition: 'background .15s',
          }}
          aria-label="Enviar"
        >
          ↑
        </button>
      </div>

      {/* typing animation */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: .25; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>

    </div>
  )
}
