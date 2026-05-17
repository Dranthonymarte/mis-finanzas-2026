// ═══════════════════════════════════════════════════
// ErrorBoundary  (BLOQUE 8)
// Catches render errors — shows friendly recovery UI
// ═══════════════════════════════════════════════════

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--ink-0)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', gap: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{
          fontSize: 17, fontWeight: 700, color: 'var(--fg)',
          fontFamily: 'var(--f-display)',
        }}>
          Algo salió mal
        </div>
        <div style={{
          fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.6,
          maxWidth: 300,
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '12px 14px',
          fontFamily: 'var(--f-mono)', textAlign: 'left',
          wordBreak: 'break-word',
        }}>
          {error.message}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '12px 28px', borderRadius: 12,
            background: 'var(--amber)', color: 'var(--ink-0)',
            border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        <button
          onClick={() => window.location.replace('/')}
          style={{
            fontSize: 12, color: 'var(--fg-mute)', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }
}
