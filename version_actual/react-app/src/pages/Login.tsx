// ═══════════════════════════════════════════════════
// Login — signInWithPassword + signUp tab
// onAuthStateChange dispara la navegación automáticamente
// vía RequireNoAuth redirect cuando isAuthenticated = true
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { type CSSProperties } from 'react'
import { Logo } from '../components/brand/Logo'
import { supabase } from '../lib/supabase'

// BeforeInstallPromptEvent is not in lib.dom — declare minimally
interface BeforeInstallPromptEvent extends Event {
  prompt():                         Promise<void>
  readonly userChoice:              Promise<{ outcome: 'accepted' | 'dismissed' }>
}

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
  const [mode,          setMode]          = useState<Mode>('login')
  const [email,         setEmail]         = useState('')
  const [pass,          setPass]          = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [name,          setName]          = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [success,       setSuccess]       = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // Capture the PWA install prompt — only fires once per session on Android Chrome
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setSuccess(null)
    setPass('')
    setConfirm('')
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) return setError('Ingresa email y contraseña.')
    setLoading(true)
    setError(null)

    // Safety net: never hang forever if network stalls
    const timer = setTimeout(() => {
      setLoading(false)
      setError('La conexión tardó demasiado. Intenta de nuevo.')
    }, 10000)

    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      })
      clearTimeout(timer)
      setLoading(false)
      if (err) {
        setError(err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : err.message)
      }
      // Si success → onAuthStateChange en useAuth.ts dispara setSession
      // → isAuthenticated = true → RequireNoAuth redirige a "/"
    } catch {
      clearTimeout(timer)
      setLoading(false)
      setError('Error de conexión. Intenta de nuevo.')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) return setError('Ingresa email y contraseña.')
    if (pass.length < 6)  return setError('La contraseña debe tener al menos 6 caracteres.')
    if (pass !== confirm)  return setError('Las contraseñas no coinciden.')
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      setLoading(false)
      setError('La conexión tardó demasiado. Intenta de nuevo.')
    }, 10000)

    try {
      const { error: err } = await supabase.auth.signUp({
        email:    email.trim(),
        password: pass,
        options:  { data: { full_name: name.trim() || email.split('@')[0] }, emailRedirectTo: window.location.origin + '/dashboard' },
      })
      clearTimeout(timer)
      setLoading(false)
      if (err) {
        setError(err.message)
      } else {
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar y luego inicia sesión.')
        switchMode('login')
      }
    } catch {
      clearTimeout(timer)
      setLoading(false)
      setError('Error de conexión. Intenta de nuevo.')
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', letterSpacing: '.04em' }}>O</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: 'rgba(255,255,255,.07)', color: '#fff',
                border: '1px solid rgba(255,255,255,.15)', borderRadius: 14,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? .65 : 1, transition: 'opacity .15s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', letterSpacing: '.04em' }}>O</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: 'rgba(255,255,255,.07)', color: '#fff',
                border: '1px solid rgba(255,255,255,.15)', borderRadius: 14,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? .65 : 1, transition: 'opacity .15s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </form>
        )}

        {/* PWA install banner — only visible when Android Chrome fires beforeinstallprompt */}
        {installPrompt && (
          <div style={{
            marginTop: 20,
            background: 'rgba(224,168,74,.1)',
            border: '1px solid rgba(224,168,74,.3)',
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>📲</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>
                Instalar app
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
                Acceso rápido desde tu pantalla de inicio
              </div>
            </div>
            <button
              onClick={handleInstall}
              style={{
                padding: '7px 14px', borderRadius: 10,
                background: 'var(--amber)', border: 'none',
                fontSize: 12, fontWeight: 700, color: '#0a0b0d',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              Instalar
            </button>
            <button
              onClick={() => setInstallPrompt(null)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,.3)', fontSize: 16,
                cursor: 'pointer', flexShrink: 0, padding: 0,
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
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
