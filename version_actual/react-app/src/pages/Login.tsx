// ═══════════════════════════════════════════════════
// Login — Supabase signInWithPassword
// onAuthStateChange dispara la navegación automáticamente
// vía RequireNoAuth redirect cuando isAuthenticated = true
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { type CSSProperties } from 'react'
import { Logo } from '../components/brand/Logo'
import { supabase } from '../lib/supabase'

const inputSt: CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 14, padding: '14px 16px', fontSize: 16,
  color: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const btnSt: CSSProperties = {
  width: '100%', padding: '15px',
  background: '#e0a84a', color: '#0a0b0d',
  border: 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 700,
  cursor: 'pointer', letterSpacing: '.01em',
  transition: 'opacity .15s',
}

export default function Login() {
  const [email,   setEmail]   = useState('anthonymarte12@gmail.com')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) return setError('Ingresa email y contraseña.')
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    setLoading(false)

    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : err.message)
    }
    // Si success → onAuthStateChange en useAuth.ts dispara setSession
    // → isAuthenticated = true → RequireNoAuth redirige a "/"
  }

  return (
    <div style={{
      minHeight:     '100dvh',
      background:    'radial-gradient(ellipse at 50% -4%, #1f1509 0%, #0a0b0d 52%)',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      justifyContent:'center',
      padding:       '0 24px',
      paddingTop:    'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Logo iconSize={28} textSize={15} />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
            Inicia sesión
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
            Mis Finanzas 2026
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>
              EMAIL
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              style={inputSt}
            />
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>
              CONTRASEÑA
            </div>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputSt}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(214,106,90,.15)',
              border: '1px solid rgba(214,106,90,.3)',
              borderRadius: 10,
              fontSize: 13, color: '#d66a5a',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...btnSt, opacity: loading ? .65 : 1, marginTop: 8 }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
