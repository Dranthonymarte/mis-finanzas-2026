import { useState, useRef } from 'react'
import AppHeader from '../components/shell/AppHeader'

type Status = 'idle' | 'processing' | 'done'

export default function Escanear() {
  const fileRef            = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status,  setStatus]  = useState<Status>('idle')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPreview(ev.target?.result as string)
      setStatus('idle')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleAnalyze() {
    const groqKey = localStorage.getItem('fin_groq_api_key')
    if (!groqKey) {
      alert('Configura tu API key de Groq en Ajustes → Seguridad para usar esta función.')
      return
    }
    setStatus('processing')
    // Groq Vision call — wired in PASO 8
    setTimeout(() => setStatus('done'), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Escanear recibo" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Upload zone ── */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            background: 'var(--ink-2)', border: '2px dashed var(--ink-4)',
            borderRadius: 18, padding: preview ? '12px' : '36px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            cursor: 'pointer', color: 'var(--fg-mute)', width: '100%',
          }}
        >
          {preview ? (
            <img src={preview} alt="Recibo" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10 }} />
          ) : (
            <>
              <span style={{ fontSize: 44 }}>📷</span>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Foto o elige archivo</div>
              <div style={{ fontSize: 11.5 }}>JPG · PNG · PDF</div>
            </>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFile}
          style={{ display: 'none' }}
        />

        {preview && (
          <button
            onClick={handleAnalyze}
            disabled={status === 'processing'}
            style={{
              background: status === 'done' ? 'var(--pos)' : status === 'processing' ? 'var(--ink-3)' : 'var(--amber)',
              color: status === 'processing' ? 'var(--fg-mute)' : 'var(--ink-0)',
              border: 'none', borderRadius: 12, padding: '13px',
              fontSize: 14, fontWeight: 600, cursor: status === 'processing' ? 'default' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {status === 'processing' ? 'Analizando con IA…' : status === 'done' ? '✓ Recibo procesado' : 'Analizar con IA'}
          </button>
        )}

        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '12px 14px',
          fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1.6,
        }}>
          La IA (Groq · Llama 4 Scout) extrae el total, fecha, negocio y categoría del recibo automáticamente. Requiere API key de Groq configurada en Ajustes → Seguridad.
        </div>
      </div>
    </div>
  )
}
