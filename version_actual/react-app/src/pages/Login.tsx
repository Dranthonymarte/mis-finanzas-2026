// ═══════════════════════════════════════════════════
// Login — signInWithPassword + signUp tab
// onAuthStateChange dispara la navegación automáticamente
// vía RequireNoAuth redirect cuando isAuthenticated = true
// PIN / WebAuthn: capa local adicional (NO reemplaza sesión Supabase)
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { type CSSProperties } from 'react'
import { Logo } from '../components/brand/Logo'
import { supabase } from '../lib/supabase'

const PIN_KEY      = 'mf-pin'
const WEBAUTHN_KEY = 'mf-webauthn-cred'
const PIN_UNLOCKED = 'mf-pin-unlocked'  // sessionStorage flag — cleared on tab close

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

type Mode = 'login' | 'register' | 'forgot'

function pwStrength(p: string): number {
  if (!p) return 0
  let s = 0
  if (p.length >= 8)           s++
  if (p.length >= 12)          s++
  if (/[A-Z]/.test(p))         s++
  if (/[0-9]/.test(p))         s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

const PW_LEVELS = [
  { label: 'Muy débil', color: '#d66a5a' },
  { label: 'Débil',     color: '#d66a5a' },
  { label: 'Regular',   color: '#e0a84a' },
  { label: 'Fuerte',    color: '#58b26a' },
  { label: 'Muy fuerte',color: '#58b26a' },
]

// ── PIN Keypad ────────────────────────────────────────────────
function PinKeypad({
  value, onChange, onSubmit, label, sublabel, error,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  label: string
  sublabel?: string
  error?: string | null
}) {
  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', textAlign: 'center', fontWeight: 500 }}>{label}</div>
      {sublabel && (
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)', textAlign: 'center', marginTop: -10 }}>{sublabel}</div>
      )}

      {/* Dots */}
      <div style={{ display: 'flex', gap: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < value.length ? '#e0a84a' : 'rgba(255,255,255,.15)',
            border: '1.5px solid rgba(255,255,255,.2)',
            transition: 'background .15s',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: '#d66a5a', textAlign: 'center' }}>{error}</div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gap: 10 }}>
        {digits.map((d, idx) => (
          <button
            key={idx}
            disabled={d === ''}
            onClick={() => {
              if (d === '⌫') {
                onChange(value.slice(0, -1))
              } else if (d !== '' && value.length < 4) {
                const next = value + d
                onChange(next)
                if (next.length === 4) onSubmit?.()
              }
            }}
            style={{
              width: 70, height: 70, borderRadius: '50%',
              background: d === '' ? 'transparent' : 'rgba(255,255,255,.08)',
              border: d === '' ? 'none' : '1px solid rgba(255,255,255,.12)',
              color: '#fff', fontSize: d === '⌫' ? 20 : 22, fontWeight: 400,
              cursor: d === '' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .1s',
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PIN Lock Screen ───────────────────────────────────────────
function PinLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin,         setPin]         = useState('')
  const [pinError,    setPinError]    = useState<string | null>(null)
  const [bioLoading,  setBioLoading]  = useState(false)
  const [bioError,    setBioError]    = useState<string | null>(null)

  const storedPin  = localStorage.getItem(PIN_KEY)
  const credId     = localStorage.getItem(WEBAUTHN_KEY)
  const bioSupport = typeof PublicKeyCredential !== 'undefined' && Boolean(credId)

  const markUnlocked = useCallback(() => {
    sessionStorage.setItem(PIN_UNLOCKED, '1')
    onUnlocked()
  }, [onUnlocked])

  // Auto-trigger biometría if available and PIN is also set
  useEffect(() => {
    if (bioSupport) void handleBiometria()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePinSubmit() {
    if (pin === storedPin) {
      markUnlocked()
    } else {
      setPinError('PIN incorrecto. Inténtalo de nuevo.')
      setPin('')
    }
  }

  async function handleBiometria() {
    if (!bioSupport || !credId) return
    setBioLoading(true)
    setBioError(null)
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: base64ToBuffer(credId) }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      if (assertion) markUnlocked()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('cancel') && !msg.includes('Cancel') && !msg.includes('abort') && !msg.includes('NotAllowed')) {
        setBioError('Biometría fallida. Usa tu PIN.')
      }
    } finally {
      setBioLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% -4%, #1f1509 0%, #0a0b0d 52%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Logo iconSize={28} textSize={15} />
        </div>

        <PinKeypad
          value={pin}
          onChange={v => { setPin(v); setPinError(null) }}
          onSubmit={handlePinSubmit}
          label="Ingresa tu PIN"
          error={pinError}
        />

        {bioSupport && (
          <button
            onClick={() => void handleBiometria()}
            disabled={bioLoading}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 14, padding: '12px 24px', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: bioLoading ? .6 : 1,
            }}
          >
            <span style={{ fontSize: 20 }}>🫆</span>
            {bioLoading ? 'Verificando…' : 'Desbloquear con biometría'}
          </button>
        )}

        {bioError && (
          <div style={{ fontSize: 12, color: '#d66a5a', textAlign: 'center' }}>{bioError}</div>
        )}

      </div>
    </div>
  )
}

// ── Util ──────────────────────────────────────────────────────
function base64ToBuffer(b64: string): ArrayBuffer {
  // credential.id is base64url — convert to ArrayBuffer
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=')
  const binary  = atob(padded)
  const buf     = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

// ── Main Login Component ──────────────────────────────────────
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
  // PIN lock: active when Supabase session exists + PIN is set + not yet unlocked this session
  const [pinLocked,     setPinLocked]     = useState(false)
  const [checkingPin,   setCheckingPin]   = useState(true)

  // On mount: check if we need to show PIN lock screen
  useEffect(() => {
    async function checkPinLock() {
      const storedPin = localStorage.getItem(PIN_KEY)
      if (!storedPin) { setCheckingPin(false); return }
      // Already unlocked this session?
      if (sessionStorage.getItem(PIN_UNLOCKED)) { setCheckingPin(false); return }
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setPinLocked(true)
      }
      setCheckingPin(false)
    }
    void checkPinLock()
  }, [])

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return setError('Ingresa tu email.')
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Revisa tu email — te enviamos un enlace para restablecer tu contraseña.')
  }

  async function handleMagicLink(e: React.MouseEvent) {
    e.preventDefault()
    if (!email) return setError('Ingresa tu email primero.')
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('¡Listo! Revisa tu email — te enviamos un enlace de acceso.')
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
    if (pass.length < 8)              return setError('La contraseña debe tener al menos 8 caracteres.')
    if (!/[A-Z]/.test(pass))          return setError('La contraseña debe incluir al menos una mayúscula.')
    if (!/[0-9]/.test(pass))          return setError('La contraseña debe incluir al menos un número.')
    if (!/[^A-Za-z0-9]/.test(pass))  return setError('La contraseña debe incluir al menos un símbolo (ej: !@#$).')
    if (pass !== confirm)             return setError('Las contraseñas no coinciden.')
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

  // ── PIN lock gate ──────────────────────────────────────────
  if (checkingPin) {
    // Brief check — show nothing to avoid flash
    return null
  }

  if (pinLocked) {
    return <PinLockScreen onUnlocked={() => setPinLocked(false)} />
  }

  const isLogin = mode === 'login'
  const strength = pwStrength(pass)
  const pwLevel  = PW_LEVELS[Math.max(0, Math.min(4, strength - 1))]

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
        {mode !== 'forgot' && (
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,.06)',
            borderRadius: 12, padding: 4, marginBottom: 28,
            border: '1px solid rgba(255,255,255,.08)',
          }}>
            {(['login', 'register'] as const).map(m => (
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
        )}

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

        {/* Forgot password form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🔑</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Restablecer contraseña</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>
                Te enviaremos un enlace para crear una nueva contraseña.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginBottom: 7, letterSpacing: '.04em' }}>EMAIL</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
                style={inputSt}
              />
            </div>
            {error   && <ErrorBox msg={error} />}
            {success && (
              <div style={{ padding: '12px 14px', background: 'rgba(63,185,80,.15)', border: '1px solid rgba(63,185,80,.3)', borderRadius: 10, fontSize: 13, color: '#3fb950' }}>
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ ...btnSt, opacity: loading ? .65 : 1 }}
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.04em' }}>CONTRASEÑA</div>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: 'rgba(224,168,74,.7)', cursor: 'pointer', padding: 0 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
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
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent', color: 'rgba(255,255,255,.5)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 14,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                opacity: loading ? .65 : 1,
              }}
            >
              ✉ Acceder con enlace mágico
            </button>
          </form>
        )}

        {/* Register form */}
        {!isLogin && mode !== 'forgot' && (
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
                placeholder="Mín. 8 car., mayúscula, número, símbolo"
                autoComplete="new-password"
                style={inputSt}
              />
              {pass.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? pwLevel.color : 'rgba(255,255,255,.1)',
                        transition: 'background .2s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10.5, color: pwLevel.color }}>
                    {pwLevel.label} · 8+ car., mayúscula, número, símbolo
                  </div>
                </div>
              )}
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
