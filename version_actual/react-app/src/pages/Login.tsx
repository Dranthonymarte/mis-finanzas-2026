// ═══════════════════════════════════════════════════
// Login — signInWithPassword + signUp tab
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

type Mode = 'login' | 'register'

export default function Login() {
  const [mode,    setMode]    = useState<Mode>('login')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setSuccess(null)
    setPass('')
    setConfirm('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) return setError('Ingresa email y contraseña.')
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    })
    setLoading(false)

    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : err.message)
    }
    // Si success → onAuthStateChange en useAuth.ts dispara setSession
    // → isAuthenticated = true → RequireNoAuth redirige a "/"
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) return setError('Ingresa email y contraseña.')
    if (pass.length < 6)  return setError('La contraseña debe tener al menos 6 caracteres.')
    if (pass !== confirm)  return setError('Las contraseñas no coinciden.')
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signUp({
      email:    email.trim(),
      password: pass,
      options:  { data: { full_name: name.trim() || email.split('@')[0] } },
    })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setSuccess('¡Cuenta creada! Revisa tu email para confirmar y luego inicia sesión.')
      switchMode('login')
    }
  }

  const isLogin = mode === 'login'

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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <Logo iconSize={28} textSize={15} />
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,.06)',
          borderRadius: 12, padding: 4, marginBottom: 28,
          border: '1px solid rgba(255,255,255,.08)',
        }}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 9,
                border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                transition: 'all .15s',
                background: mode === m ? '#e0a84a' : 'transparent',
                color:      mode === m ? '#0a0b0d' : 'rgba(255,255,255,.45)',
              }}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {success && (
          <div style={{
            padding: '12px 14px', marginBottom: 16,
            background: 'rgba(63,185,80,.15)',
            border: '1px solid rgba(63,185,80,.3)',
            borderRadius: 10, fontSize: 13, color: '#3fb950',
          }}>
            {success}
          </div>
        )}

        {/* Login form */}
        {isLogin && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>EMAIL</div>
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
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>CONTRASEÑA</div>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputSt}
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button
              type="submit"
              disabled={loading}
              style={{ ...btnSt, opacity: loading ? .65 : 1, marginTop: 8 }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Register form */}
        {!isLogin && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>NOMBRE</div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                style={inputSt}
              />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>EMAIL</div>
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
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>CONTRASEÑA</div>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                style={inputSt}
              />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>CONFIRMAR CONTRASEÑA</div>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                style={inputSt}
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button
              type="submit"
              disabled={loading}
              style={{ ...btnSt, opacity: loading ? .65 : 1, marginTop: 8 }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,.2)' }}>
          Mis Finanzas 2026
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(214,106,90,.15)',
      border: '1px solid rgba(214,106,90,.3)',
      borderRadius: 10,
      fontSize: 13, color: '#d66a5a',
    }}>
      {msg}
    </div>
  )
}
