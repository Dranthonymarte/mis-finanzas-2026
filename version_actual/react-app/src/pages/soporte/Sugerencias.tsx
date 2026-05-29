// ═══════════════════════════════════════════════════
// Sugerencias — /soporte/sugerencias
// Formulario de feedback al equipo
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '../../components/icons/Icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'

type Status = 'idle' | 'loading' | 'success' | 'error'

const MAX = 500

export default function Sugerencias() {
  const navigate    = useNavigate()
  const userId      = useAuthStore(s => s.userId)
  const userEmail   = useAuthStore(s => s.userEmail)
  const userName    = useAuthStore(s => s.userName)
  const householdId = useAuthStore(s => s.householdId)

  const [text,   setText]   = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit() {
    if (!text.trim() || status === 'loading') return
    setStatus('loading')

    const { error } = await supabase.from('sugerencias').insert({
      user_id:      userId,
      household_id: householdId,
      mensaje:      text.trim(),
    })

    if (error) {
      setStatus('error')
      return
    }

    // Best-effort email notification — await but never block success UX
    try {
      const notifyRes = await fetch('/api/sugerencia-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: text.trim(), userId, userEmail, userName }),
      })
      const notifyJson = await notifyRes.json().catch(() => ({}))
      if (!notifyRes.ok || notifyJson?.ok === false) {
        console.warn('[sugerencias] notify failed:', notifyRes.status, notifyJson)
      } else {
        console.log('[sugerencias] notify ok:', notifyJson)
      }
    } catch (e) {
      console.warn('[sugerencias] notify fetch error:', e)
    }

    setStatus('success')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', fontFamily: 'var(--f-ui)' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--ink-1)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate('/more')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg)', padding: 4, display: 'grid', placeItems: 'center',
          }}
          aria-label="Volver"
        >
          <ArrowLeftIcon />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
          Enviar sugerencia
        </span>
      </div>

      <div style={{
        padding: '24px 16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}>

        {status === 'success' ? (
          /* ── Success state ── */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: 16, paddingTop: 32,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'rgba(0,200,120,.12)', border: '1px solid rgba(0,200,120,.25)',
              display: 'grid', placeItems: 'center', fontSize: 30,
            }}>
              ✅
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>
                ¡Gracias!
              </div>
              <p style={{ fontSize: 14, color: 'var(--fg-mute)', lineHeight: 1.6, margin: 0 }}>
                Tu sugerencia fue recibida. La revisaremos pronto.
              </p>
            </div>
            <button
              onClick={() => navigate('/more')}
              style={{
                marginTop: 8, padding: '12px 28px', borderRadius: 12,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)',
                cursor: 'pointer', fontFamily: 'var(--f-ui)',
              }}
            >
              Volver
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <p style={{
              fontSize: 14, color: 'var(--fg-mute)', marginBottom: 24,
              lineHeight: 1.5,
            }}>
              Ayúdanos a mejorar la app
            </p>

            <div style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, overflow: 'hidden', marginBottom: 8,
            }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={MAX}
                placeholder="Describe tu sugerencia…"
                rows={8}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'transparent', border: 'none', outline: 'none',
                  resize: 'none', padding: '14px 16px',
                  fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--f-ui)',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Char counter */}
            <div style={{
              textAlign: 'right', fontSize: 11.5,
              color: text.length >= MAX * 0.9 ? 'var(--neg)' : 'var(--fg-dim)',
              marginBottom: 24,
            }}>
              {text.length} / {MAX}
            </div>

            {/* Error message */}
            {status === 'error' && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.25)',
                fontSize: 13, color: 'var(--neg)',
              }}>
                Ocurrió un error. Por favor intenta de nuevo.
              </div>
            )}

            <button
              onClick={() => { void handleSubmit() }}
              disabled={!text.trim() || status === 'loading'}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: text.trim() && status !== 'loading' ? 'var(--amber)' : 'var(--ink-3)',
                border: 'none', cursor: text.trim() && status !== 'loading' ? 'pointer' : 'not-allowed',
                fontSize: 15, fontWeight: 700,
                color: text.trim() && status !== 'loading' ? 'var(--ink-0)' : 'var(--fg-dim)',
                fontFamily: 'var(--f-ui)', transition: 'background .2s, color .2s',
              }}
            >
              {status === 'loading' ? 'Enviando…' : 'Enviar sugerencia'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
