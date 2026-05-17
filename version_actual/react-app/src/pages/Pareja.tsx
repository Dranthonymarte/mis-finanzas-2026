import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'

const MEMBERS = [
  { inicial: 'A', nombre: 'Anthony', rol: 'Propietario', color: '#6a94c4' },
  { inicial: 'I', nombre: 'Isabel',  rol: 'Pareja',      color: '#b0a3c7' },
]

export default function Pareja() {
  const [email, setEmail] = useState('')
  const [sent,  setSent]  = useState(false)

  function handleInvite() {
    if (!email.trim()) return
    setSent(true)
    setTimeout(() => { setSent(false); setEmail('') }, 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Finanzas en pareja" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Members ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Tu hogar
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {MEMBERS.map(m => (
              <div key={m.nombre} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 15, background: m.color,
                  display: 'grid', placeItems: 'center',
                  fontSize: 22, fontWeight: 700, color: 'var(--ink-0)',
                }}>
                  {m.inicial}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nombre}</div>
                <Pill tone="pos" size="xs">{m.rol}</Pill>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11.5, color: 'var(--fg-mute)', textAlign: 'center' }}>
            Household activo · datos compartidos
          </div>
        </div>

        {/* ── Invite ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Invitar pareja</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={{
                flex: 1, background: 'var(--ink-1)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={handleInvite}
              style={{
                padding: '9px 14px',
                background: sent ? 'var(--pos)' : 'var(--amber)',
                color: 'var(--ink-0)', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .2s',
                whiteSpace: 'nowrap',
              }}
            >
              {sent ? '✓ Enviado' : 'Invitar'}
            </button>
          </div>
        </div>

        {/* ── Shared summary ── */}
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Resumen compartido · Abril
          </div>
          {[
            { label: 'Anthony gastó', value: '$487.18', color: 'var(--fg)' },
            { label: 'Isabel gastó',  value: '$126.04', color: 'var(--fg)' },
            { label: 'Total hogar',   value: '$613.22', color: 'var(--neg)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, color: 'var(--fg-mute)' }}>{row.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
