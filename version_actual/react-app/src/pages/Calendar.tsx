// ═══════════════════════════════════════════════════
// Calendar — /calendar
// Google Calendar sync UI
// Edge Function: google-calendar-sync v3
// OAuth: google-oauth Edge Function
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import AppHeader from '../components/shell/AppHeader'
import Pill from '../components/ui/Pill'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useToastStore } from '../store/toast'

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL as string
const GCAL_SYNC_URL  = `${SUPABASE_URL}/functions/v1/google-calendar-sync`
const GOOGLE_OAUTH_URL = `${SUPABASE_URL}/functions/v1/google-oauth`

interface CalEvent {
  id:       string
  summary:  string
  start:    string
  end:      string
  htmlLink?: string
}

interface SyncResult {
  synced?:    number
  events?:    CalEvent[]
  connected?: boolean
  error?:     string
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-VE', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Calendar() {
  const userId      = useAuthStore(s => s.userId)
  const addToast    = useToastStore(s => s.addToast)

  const [connected,   setConnected]   = useState<boolean | null>(null)
  const [events,      setEvents]      = useState<CalEvent[]>([])
  const [lastSync,    setLastSync]    = useState<string | null>(null)
  const [syncing,     setSyncing]     = useState(false)
  const [checking,    setChecking]    = useState(true)

  // ── Check connection status ──
  const checkStatus = useCallback(async () => {
    if (!userId) { setChecking(false); return }
    setChecking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setChecking(false); return }

      const resp = await fetch(GCAL_SYNC_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check_status' }),
      })

      if (resp.ok) {
        const data = await resp.json() as SyncResult
        setConnected(data.connected ?? false)
        if (data.events) setEvents(data.events)
      } else {
        // 401/403 = not connected, other errors = unknown
        setConnected(resp.status === 401 || resp.status === 403 ? false : null)
      }
    } catch {
      setConnected(null)
    } finally {
      setChecking(false)
    }
  }, [userId])

  useEffect(() => {
    // ── OAuth popup callback: signal parent window then close ──
    // When Google redirects back to /calendar inside a popup, close it
    // and let the parent re-check the connection status.
    if (window.opener) {
      try { window.opener.postMessage({ type: 'mf-oauth-done' }, window.location.origin) } catch { /* noop */ }
      window.close()
      return
    }

    // ── Parent window: listen for popup completion signal ──
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && (e.data as { type?: string })?.type === 'mf-oauth-done') {
        void checkStatus()
      }
    }
    window.addEventListener('message', onMsg)

    // eslint-disable-next-line react-hooks/set-state-in-effect -- on-mount connection-status fetch (async setState after await)
    void checkStatus()
    return () => { window.removeEventListener('message', onMsg) }
  }, [checkStatus])

  // ── Sync ──
  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { addToast('Sesión expirada', 'error'); return }

      const resp = await fetch(GCAL_SYNC_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync_all' }),
      })

      const data = await resp.json() as SyncResult

      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          setConnected(false)
          addToast('Google Calendar desconectado. Reconecta tu cuenta.', 'warn')
        } else {
          addToast(data.error ?? 'Error al sincronizar', 'error')
        }
        return
      }

      setLastSync(new Date().toISOString())
      if (data.events) setEvents(data.events)
      addToast(`Sincronizado — ${data.synced ?? data.events?.length ?? 0} eventos`, 'info')
      setConnected(true)
    } catch {
      addToast('Error de red al sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  // ── Auto-sync recurrentes al conectar (transición no-conectado → conectado) ──
  const prevConnected = useRef<boolean | null>(null)
  useEffect(() => {
    if (prevConnected.current === false && connected === true) {
      void handleSync()   // recién conectado → empuja los recurrentes a Google Calendar
    }
    prevConnected.current = connected
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSync estable; solo reaccionamos a `connected`
  }, [connected])

  // ── Connect Google ──
  async function handleConnect() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { addToast('Sesión expirada', 'error'); return }

      // Open OAuth in popup — on callback the popup sends postMessage + closes itself
      // Fallback to same-window redirect if popup is blocked (e.g., strict PWA)
      const oauthUrl = `${GOOGLE_OAUTH_URL}?user_id=${session.user.id}&redirect=${encodeURIComponent(window.location.origin + '/calendar')}`
      const popup = window.open(oauthUrl, 'mf-google-oauth', 'width=520,height=660,popup=1')
      if (!popup) { window.location.href = oauthUrl; return }   // fallback

      // Polling fallback: in PWA/strict-origin contexts postMessage may not fire.
      // Poll every second until popup closes, then re-check status.
      const iv = setInterval(() => {
        try { if (!popup.closed) return } catch { /* cross-origin — keep polling */ }
        clearInterval(iv)
        setTimeout(() => void checkStatus(), 600)
      }, 1000)
    } catch {
      addToast('Error al iniciar conexión con Google', 'error')
    }
  }

  const connectionTone = connected === true ? 'pos' : connected === false ? 'neg' : 'mute'
  const connectionLabel = connected === true ? 'Conectado' : connected === false ? 'No conectado' : 'Verificando…'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader
        title="Google Calendar"
        back
        right={
          connected === true ? (
            <button
              onClick={() => void handleSync()}
              disabled={syncing}
              style={{
                background: syncing ? 'var(--fg-mute)' : 'var(--amber)',
                color: 'var(--ink-0)', border: 'none', borderRadius: 10,
                padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                cursor: syncing ? 'default' : 'pointer',
              }}
            >
              {syncing ? 'Sync…' : 'Sincronizar'}
            </button>
          ) : null
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Connection status card ── */}
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {/* Google Calendar icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
              display: 'grid', placeItems: 'center', fontSize: 18,
              flexShrink: 0,
            }}>
              📅
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>
                Sincroniza tus eventos con la app
              </div>
            </div>
            <Pill tone={connectionTone} size="xs">{connectionLabel}</Pill>
          </div>

          {lastSync && (
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 8 }}>
              Última sync: {fmtDate(lastSync)}
            </div>
          )}

          {checking ? (
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', textAlign: 'center', padding: '8px 0' }}>
              Verificando conexión…
            </div>
          ) : connected === false ? (
            <button
              onClick={() => void handleConnect()}
              style={{
                width: '100%', padding: '10px 0',
                background: '#4285f4', color: '#fff',
                border: 'none', borderRadius: 10,
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Conectar con Google
            </button>
          ) : connected === true ? (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              fontSize: 12, color: 'var(--fg-mute)',
            }}>
              <span style={{ color: 'var(--pos)' }}>●</span>
              Cuenta conectada · los eventos se sincronizan automáticamente
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>
              Estado desconocido — revisa tu conexión
            </div>
          )}
        </div>

        {/* ── Events list ── */}
        {events.length > 0 && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 16, padding: 16,
          }}>
            <div style={{
              fontSize: 11, color: 'var(--fg-mute)', marginBottom: 14,
              letterSpacing: '.1em', textTransform: 'uppercase',
            }}>
              Últimos eventos sincronizados
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.slice(0, 10).map((ev) => (
                <div key={ev.id} style={{
                  display: 'flex', flexDirection: 'column', gap: 3,
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--line)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.summary}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>
                    {fmtDate(ev.start)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!checking && connected === true && events.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--fg-mute)',
            fontSize: 13, padding: '24px 0',
          }}>
            Sin eventos sincronizados aún.{' '}
            <button
              onClick={() => void handleSync()}
              disabled={syncing}
              style={{
                background: 'none', border: 'none', color: 'var(--amber)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0,
              }}
            >
              Sincronizar ahora
            </button>
          </div>
        )}

        {/* ── Info ── */}
        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', padding: '0 4px', lineHeight: 1.5 }}>
          Los eventos de Google Calendar se sincronizan con tu app para recordatorios
          y análisis de tiempo. Los datos no se comparten con terceros.
        </div>

      </div>
    </div>
  )
}
