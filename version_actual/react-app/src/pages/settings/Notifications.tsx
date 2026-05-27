// ═══════════════════════════════════════════════════
// Settings / Notifications — /settings/notifications
//
// Permite a cada usuario/household configurar su PROPIO
// bot de Telegram (multi-tenancy real).
//
// Flujo:
//   1. Usuario crea un bot con @BotFather y copia el token.
//   2. Pega el token aquí y presiona "Conectar".
//   3. Se guarda en config_usuario.telegram_bot_token (Supabase).
//   4. Se llama a /api/register-telegram-webhook para activar.
//   5. Usuario le escribe /start al bot en Telegram.
//
// Estado visual: conectado (token guardado) / desconectado.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import AppHeader from '../../components/shell/AppHeader'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'
import { useConfig } from '../../hooks/useConfig'

// ── Estilos inline reutilizables ─────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14,
  color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'monospace', letterSpacing: '0.02em',
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--amber)', color: '#000', border: 'none',
  borderRadius: 10, padding: '10px 20px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
}

const btnDanger: React.CSSProperties = {
  background: 'transparent', color: 'var(--red, #ef4444)',
  border: '1px solid var(--red, #ef4444)',
  borderRadius: 10, padding: '10px 20px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
}

const card: React.CSSProperties = {
  background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 14, padding: '16px',
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function NotificationsSettings() {
  const userId = useAuthStore(s => s.userId)
  const { config, updateConfig, loading } = useConfig()

  // Determinar si hay bot conectado (token guardado)
  const isConnected = Boolean(config.telegramBotToken)

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [token,    setToken]    = useState('')
  const [username, setUsername] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  // ── Conectar bot ───────────────────────────────────────────────────────────
  async function handleConnect() {
    if (!userId) return
    const trimToken = token.trim()
    const trimUser  = username.trim().replace(/^@/, '') // normalizar sin @

    if (!trimToken) {
      return setMsg({ text: 'El token del bot es obligatorio.', ok: false })
    }

    // Validación básica de formato Telegram: 123456:ABC-DEF...
    if (!/^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(trimToken)) {
      return setMsg({ text: 'Formato de token inválido. Ejemplo: 123456789:ABCdef…', ok: false })
    }

    setSaving(true)
    setMsg(null)

    try {
      // 1. Guardar token en config_usuario (antes de registrar webhook)
      await Promise.all([
        updateConfig('telegram_bot_token',    trimToken),
        updateConfig('telegram_bot_username', trimUser || null),
      ])

      // 2. Registrar webhook en Telegram vía Cloudflare Pages Function
      const res = await fetch('/api/register-telegram-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_token: trimToken }),
      })
      const result = await res.json() as { ok: boolean; description?: string }

      if (!result.ok) {
        // Token inválido según Telegram → revertir guardado
        await Promise.all([
          updateConfig('telegram_bot_token',    null),
          updateConfig('telegram_bot_username', null),
        ])
        setMsg({ text: `Telegram rechazó el token: ${result.description ?? 'token inválido'}`, ok: false })
      } else {
        setToken('')
        setUsername('')
        setMsg({ text: '¡Bot conectado! Ahora escríbele /start en Telegram.', ok: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red'
      setMsg({ text: `Error: ${msg}`, ok: false })
    }

    setSaving(false)
  }

  // ── Desconectar bot ───────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!userId) return
    setSaving(true)
    setMsg(null)
    try {
      // Borrar token de Supabase — el webhook de Telegram seguirá activo
      // pero sin token válido las notificaciones no se enviarán.
      await supabase
        .from('config_usuario')
        .upsert(
          { user_id: userId, telegram_bot_token: null, telegram_bot_username: null },
          { onConflict: 'user_id' }
        )
      // Actualizar estado local vía updateConfig
      await Promise.all([
        updateConfig('telegram_bot_token',    null),
        updateConfig('telegram_bot_username', null),
      ])
      setMsg({ text: 'Bot desconectado correctamente.', ok: true })
    } catch {
      setMsg({ text: 'Error al desconectar. Inténtalo de nuevo.', ok: false })
    }
    setSaving(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 32 }}>
      <AppHeader title="Notificaciones" back="/settings" />

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Estado actual ──────────────────────────────────────────────── */}
        {!loading && (
          <div style={{
            ...card,
            display: 'flex', alignItems: 'center', gap: 12,
            borderColor: isConnected ? 'var(--amber)' : 'var(--line)',
          }}>
            {/* Indicador de estado */}
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              background: isConnected ? 'var(--amber)' : 'var(--ink-4)',
              boxShadow: isConnected ? '0 0 6px var(--amber)' : 'none',
            }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                {isConnected ? 'Bot conectado' : 'Sin bot configurado'}
              </p>
              {isConnected && config.telegramBotUsername && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-2)' }}>
                  @{config.telegramBotUsername}
                </p>
              )}
              {isConnected && !config.telegramBotUsername && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-2)' }}>
                  Token guardado
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Instrucciones paso a paso ───────────────────────────────────── */}
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cómo configurar tu bot
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: '1', text: 'Abre Telegram y busca @BotFather' },
              { n: '2', text: 'Escribe /newbot y sigue las instrucciones para crear tu bot' },
              { n: '3', text: 'BotFather te dará un token — cópialo aquí abajo' },
              { n: '4', text: 'Presiona "Conectar" y espera la confirmación' },
              { n: '5', text: 'Busca tu bot en Telegram y escríbele /start' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--amber)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {step.n}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Formulario de conexión (solo si no está conectado) ─────────── */}
        {!isConnected && !loading && (
          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              Conectar bot de Telegram
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Token del bot */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-2)', marginBottom: 6 }}>
                  Token del bot <span style={{ color: 'var(--amber)' }}>*</span>
                </label>
                <input
                  style={inputSt}
                  type="password"
                  placeholder="123456789:ABCdef..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--fg-3, var(--fg-2))' }}>
                  Formato: números:letras_y_guiones — lo recibes de @BotFather
                </p>
              </div>

              {/* Username del bot (opcional) */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-2)', marginBottom: 6 }}>
                  Username del bot <span style={{ color: 'var(--fg-2)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  style={inputSt}
                  type="text"
                  placeholder="@MiFinanzasBot"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Mensaje de feedback */}
              {msg && (
                <p style={{
                  margin: 0, fontSize: 13, padding: '8px 12px', borderRadius: 8,
                  background: msg.ok ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                  color: msg.ok ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)',
                }}>
                  {msg.text}
                </p>
              )}

              {/* Botón conectar */}
              <button
                style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                onClick={handleConnect}
                disabled={saving}
              >
                {saving ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Sección de desconexión (si ya está conectado) ─────────────── */}
        {isConnected && !loading && (
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--fg)' }}>
              Tu bot está activo. Las notificaciones programadas se enviarán a través de él.
              Para cambiarlo, desconéctalo primero y conecta uno nuevo.
            </p>

            {/* Mensaje de feedback */}
            {msg && (
              <p style={{
                margin: '0 0 12px', fontSize: 13, padding: '8px 12px', borderRadius: 8,
                background: msg.ok ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                color: msg.ok ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)',
              }}>
                {msg.text}
              </p>
            )}

            <button
              style={{ ...btnDanger, opacity: saving ? 0.6 : 1 }}
              onClick={handleDisconnect}
              disabled={saving}
            >
              {saving ? 'Desconectando…' : 'Desconectar bot'}
            </button>
          </div>
        )}

        {/* ── Nota de privacidad ─────────────────────────────────────────── */}
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-2)', textAlign: 'center', lineHeight: 1.6 }}>
          Tu token se guarda cifrado en Supabase con RLS activado.
          Solo tú puedes leerlo o modificarlo.
        </p>

      </div>
    </div>
  )
}
