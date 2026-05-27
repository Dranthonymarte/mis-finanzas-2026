// ═══════════════════════════════════════════════════
// Escanear — /escanear
// OCR real vía Groq Vision (llama-3.2-11b-vision-preview)
// Flujo: foto → análisis IA → editar → guardar movimiento
// ═══════════════════════════════════════════════════

import { useState, useRef } from 'react'
import { useNavigate }        from 'react-router-dom'
import AppHeader              from '../components/shell/AppHeader'
import { supabase }           from '../lib/supabase'
import { useAuthStore }       from '../store/auth'
import { usePrefsStore }      from '../store/prefs'
import { useConfig }          from '../hooks/useConfig'
import { mesIdToDbKey }       from '../lib/mes'

type Status = 'idle' | 'processing' | 'done' | 'error'

interface ParsedRecibo {
  monto:       number
  moneda:      'USD' | 'VES'
  fecha:       string
  descripcion: string
  cat:         string
}

const GROQ_ENDPOINT = '/api/groq'
const GROQ_MODEL    = 'llama-3.2-11b-vision-preview'

const PROMPT =
  'Eres un experto en facturas venezolanas y latinoamericanas. Analiza este recibo o factura.\n\n' +
  'REGLAS CRÍTICAS:\n' +
  '1. MONTO: extrae el TOTAL final (post-IVA/impuesto). NUNCA el subtotal ni el IVA por separado.\n' +
  '2. MONEDA: si hay monto en USD ($) úsalo. Si solo hay Bs./BsF/VES usa "VES". Si hay ambos, prioriza USD.\n' +
  '3. SEPARADORES VENEZOLANOS: en Bs. el punto es miles y la coma es decimal (ej: 1.500,00 = 1500). Para USD el punto es decimal.\n' +
  '4. FECHA: convierte CUALQUIER formato a ISO YYYY-MM-DD. DD/MM/YYYY es común en Venezuela.\n' +
  '5. DESCRIPCION: nombre del negocio, institución o emisor. Conoce: Banesco, Mercantil, BNC, Banco de Venezuela, CANTV, Movilnet, Digitel, Tigo, Cashea, ZeepMobile, Plataforma Bicentenaria, Bodegón, Farmatodo, Locatel.\n' +
  '6. CAT: clasifica según el negocio/servicio.\n\n' +
  'Responde SOLO con este JSON exacto (sin markdown, sin texto extra):\n' +
  '{"monto":<número usando punto como decimal>,"moneda":"<USD|VES>","fecha":"<YYYY-MM-DD>","descripcion":"<negocio>","cat":"<Alimentación|Restaurantes|Transporte|Entretenimiento|Salud|Hogar|Servicios|Telecomunicaciones|Suscripciones|Ropa|Ocio|Financiero|Otro>"}'

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14,
  color: 'var(--fg)', outline: 'none',
}

export default function Escanear() {
  const navigate      = useNavigate()
  const fileRef       = useRef<HTMLInputElement>(null)
  const householdId   = useAuthStore(s => s.householdId)
  const mesActivo     = usePrefsStore(s => s.mesActivo)
  const { config }    = useConfig()

  const [preview,  setPreview]  = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('image/jpeg')
  const [status,   setStatus]   = useState<Status>('idle')
  const [errMsg,   setErrMsg]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  // Pre-filled result fields (editable before saving)
  const [result,  setResult]  = useState<ParsedRecibo | null>(null)
  const [monto,   setMonto]   = useState('')
  const [moneda,  setMoneda]  = useState<'USD' | 'VES'>('USD')
  const [fecha,   setFecha]   = useState('')
  const [desc,    setDesc]    = useState('')
  const [cat,     setCat]     = useState('')

  const gastoCats = config.categorias['Gasto'] ?? [
    'Alimentación','Restaurantes','Transporte','Entretenimiento',
    'Salud','Hogar','Servicios','Suscripciones','Ropa','Ocio','Otro',
  ]

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMimeType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = ev => {
      setPreview(ev.target?.result as string)
      setStatus('idle')
      setResult(null)
      setErrMsg(null)
      setSaved(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleAnalyze() {
    if (!preview) return
    setStatus('processing')
    setErrMsg(null)

    // Extract raw base64 from data URL
    const base64 = preview.split(',')[1]

    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text',      text: PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          }],
          max_tokens: 300,
          temperature: 0,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        setStatus('error')
        setErrMsg(`Error Groq (${res.status}): ${errBody.slice(0, 120)}`)
        return
      }

      const json = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = json.choices?.[0]?.message?.content ?? ''

      // Extract JSON object from the response
      const match = content.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No se encontró JSON en la respuesta.')
      const parsed = JSON.parse(match[0]) as Partial<ParsedRecibo>

      const today = new Date().toISOString().split('T')[0]

      // Normalize Venezuelan decimal separator: "1.500,00" → 1500.00
      const rawMonto  = String(parsed.monto ?? '0')
      const normMonto = rawMonto.includes(',')
        ? rawMonto.replace(/\./g, '').replace(',', '.')
        : rawMonto

      // Normalize date: DD/MM/YYYY → YYYY-MM-DD
      const rawFecha = String(parsed.fecha || today)
      const fechaNorm = /^\d{2}\/\d{2}\/\d{4}$/.test(rawFecha)
        ? rawFecha.split('/').reverse().join('-')
        : rawFecha

      const r: ParsedRecibo = {
        monto:       Number(normMonto)          || 0,
        moneda:      (parsed as {moneda?:string}).moneda === 'VES' ? 'VES' : 'USD',
        fecha:       fechaNorm,
        descripcion: String(parsed.descripcion  || 'Gasto'),
        cat:         String(parsed.cat          || 'Otro'),
      }
      setResult(r)
      setMonto(String(r.monto))
      setMoneda(r.moneda)
      setFecha(r.fecha)
      setDesc(r.descripcion)
      setCat(gastoCats.includes(r.cat) ? r.cat : 'Otro')
      setStatus('done')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setStatus('error')
      setErrMsg(msg)
    }
  }

  async function handleSave() {
    if (!result || !householdId) return
    const parsedNum = parseFloat(monto)
    if (!parsedNum || isNaN(parsedNum)) return
    setSaving(true)

    // Resolve authenticated user_id (creator) — NEVER householdId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setErrMsg('Sin sesión activa.'); return }

    // BCV rate for VES→USD conversion (localStorage cache)
    const bcv: number = (() => {
      try { return parseFloat(JSON.parse(localStorage.getItem('mis_finanzas_tasas') || '{}').bcv) || 36.50 }
      catch { return 36.50 }
    })()

    const isVES   = moneda === 'VES'
    const amountUSD = isVES ? -(parsedNum / bcv) : -Math.abs(parsedNum)
    const amountBs  = isVES ? -parsedNum : -(parsedNum * bcv)

    const dbKey = mesIdToDbKey(mesActivo)
    const { error } = await supabase.from('movimientos').insert({
      id:           crypto.randomUUID(),
      user_id:      user.id,
      household_id: householdId,
      mes:          dbKey,
      descripcion:  desc.trim() || 'Gasto',
      tipo:         'Gasto',
      cat:          cat,
      subcat:       '',
      amount:       amountUSD,
      amount_bs:    amountBs,
      method:       '',
      fecha:        fecha,
      author:       null,
      rate_type:    'bcv',
      cuenta_id:    null,
    })

    setSaving(false)
    if (error) {
      setErrMsg('Error al guardar: ' + error.message)
      return
    }
    setSaved(true)
    setTimeout(() => navigate(-1), 1200)
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
            <img
              src={preview}
              alt="Recibo"
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10 }}
            />
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

        {/* ── Analyze button ── */}
        {preview && status !== 'done' && (
          <button
            onClick={handleAnalyze}
            disabled={status === 'processing'}
            style={{
              background: status === 'processing' ? 'var(--ink-3)' : status === 'error' ? 'var(--neg)' : 'var(--amber)',
              color: status === 'processing' ? 'var(--fg-mute)' : status === 'error' ? '#fff' : 'var(--ink-0)',
              border: 'none', borderRadius: 12, padding: '13px',
              fontSize: 14, fontWeight: 600,
              cursor: status === 'processing' ? 'default' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {status === 'processing' ? 'Analizando con IA…' : status === 'error' ? 'Reintentar análisis' : 'Analizar con IA'}
          </button>
        )}

        {/* ── Error message ── */}
        {errMsg && (
          <div style={{
            background: 'rgba(214,106,90,.1)', border: '1px solid rgba(214,106,90,.3)',
            borderRadius: 10, padding: '10px 12px',
            fontSize: 12, color: 'var(--neg)', lineHeight: 1.5,
          }}>
            {errMsg}
          </div>
        )}

        {/* ── Confirmation / edit form ── */}
        {status === 'done' && result && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px 6px',
              fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em',
              textTransform: 'uppercase', color: 'var(--fg-mute)',
            }}>
              Resultado — edita si es necesario
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 14px 14px' }}>
              {/* Monto + Moneda */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Monto</div>
                  <input
                    type="number" min="0" step="0.01"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    style={inputSt}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Moneda</div>
                  <select
                    value={moneda}
                    onChange={e => setMoneda(e.target.value as 'USD' | 'VES')}
                    style={{ ...inputSt, cursor: 'pointer' }}
                  >
                    <option value="USD">USD $</option>
                    <option value="VES">Bs. VES</option>
                  </select>
                </div>
              </div>
              {moneda === 'VES' && (
                <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', background: 'var(--ink-3)', borderRadius: 8, padding: '5px 8px' }}>
                  Se convertirá a USD usando tasa BCV del caché local.
                </div>
              )}

              {/* Descripción */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Descripción</div>
                <input
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  maxLength={80}
                  style={inputSt}
                />
              </div>

              {/* Categoría */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Categoría</div>
                <select
                  value={cat}
                  onChange={e => setCat(e.target.value)}
                  style={{ ...inputSt, cursor: 'pointer' }}
                >
                  {gastoCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4 }}>Fecha</div>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  style={inputSt}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Save button ── */}
        {status === 'done' && result && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              background: saved ? 'var(--pos)' : saving ? 'var(--ink-3)' : 'var(--amber)',
              color: saving ? 'var(--fg-mute)' : 'var(--ink-0)',
              border: 'none', borderRadius: 12, padding: '14px',
              fontSize: 15, fontWeight: 700,
              cursor: saving || saved ? 'default' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar movimiento'}
          </button>
        )}

        {/* ── Info card ── */}
        {status !== 'done' && (
          <div style={{
            background: 'var(--ink-2)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '12px 14px',
            fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1.6,
          }}>
            La IA (Groq · Llama 3.2 Vision) extrae el total, fecha, negocio y categoría del recibo automáticamente.
            Requiere API key de Groq configurada en <strong>Ajustes → Seguridad</strong>.
          </div>
        )}

        <div style={{ height: 'calc(20px + env(safe-area-inset-bottom, 0px))' }} />
      </div>
    </div>
  )
}
