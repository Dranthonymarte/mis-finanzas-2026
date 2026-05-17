import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'

interface Meta {
  id: string
  emoji: string
  nombre: string
  meta: number
  actual: number
  plazo: string
}

const DEMO_METAS: Meta[] = [
  { id: '1', emoji: '✈️', nombre: 'Viaje a Japón',         meta: 3000,  actual: 1240, plazo: 'Dic 2026' },
  { id: '2', emoji: '🛡️', nombre: 'Fondo de emergencia',   meta: 5000,  actual: 3200, plazo: 'Jun 2026' },
  { id: '3', emoji: '🏠', nombre: 'Inicial apartamento',   meta: 15000, actual: 2800, plazo: 'Ene 2028' },
]

export default function Metas() {
  const [metas] = useState<Meta[]>(DEMO_METAS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Metas de ahorro" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metas.map(m => {
          const pct      = Math.min(100, (m.actual / m.meta) * 100)
          const remaining = m.meta - m.actual
          const tone     = pct >= 80 ? 'pos' : pct >= 40 ? 'amber' : 'mute'

          return (
            <div
              key={m.id}
              style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>Objetivo: {m.plazo}</div>
                </div>
                <Pill tone={tone} size="xs">{pct.toFixed(0)}%</Pill>
              </div>

              <div style={{ height: 6, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: pct >= 80 ? 'var(--pos)' : 'var(--amber)',
                  borderRadius: 999, transition: 'width .3s',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ color: 'var(--fg-mute)' }}>${m.actual.toLocaleString('en-US')} ahorrado</span>
                <span style={{ color: 'var(--fg-mute)' }}>Faltan ${remaining.toLocaleString('en-US')}</span>
              </div>
            </div>
          )
        })}

        <button
          style={{
            background: 'var(--ink-2)', border: '1px dashed var(--ink-4)',
            borderRadius: 16, padding: '14px',
            color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', width: '100%',
          }}
        >
          <span style={{ fontSize: 18 }}>+</span>
          Nueva meta
        </button>
      </div>

      <div style={{ padding: '20px 16px 24px' }}>
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '12px 14px',
          fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1.6,
        }}>
          Conectando con tus datos reales… Las metas se cargarán desde Supabase en la próxima actualización.
        </div>
      </div>
    </div>
  )
}
