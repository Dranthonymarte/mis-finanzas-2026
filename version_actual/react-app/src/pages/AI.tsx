import AppHeader from '../components/shell/AppHeader'

const QUICK_PROMPTS = [
  '¿Cuánto gasté en comida este mes?',
  '¿Cuál es mi categoría de mayor gasto?',
  'Analiza mi flujo de caja',
  'Sugerencias para ahorrar más',
]

export default function AI() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Asistente IA" sub="Groq · Llama" large />

      {/* Placeholder chat area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 24px 40px',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🤖</div>
        <div
          style={{
            fontSize: 20,
            fontFamily: 'var(--f-display)',
            fontWeight: 400,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          ¿En qué puedo ayudarte?
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-mute)', textAlign: 'center', maxWidth: 260 }}>
          Analizo tus finanzas y respondo preguntas sobre tus gastos, ingresos y metas.
        </div>

        {/* Quick prompts */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            marginTop: 16,
          }}
        >
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              style={{
                background: 'var(--ink-2)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--fg-dim)',
                fontWeight: 500,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
          background: 'var(--ink-1)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Pregunta algo sobre tus finanzas…"
          style={{
            flex: 1,
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--fg)',
            outline: 'none',
            fontFamily: 'var(--f-ui)',
          }}
        />
        <button
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--amber)',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-0)',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
