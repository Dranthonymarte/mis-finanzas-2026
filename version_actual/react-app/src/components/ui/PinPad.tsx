// ═══════════════════════════════════════════════════
// PinPad — teclado numérico de 4 dígitos (dots + grid 3×4, auto-submit).
// Fuente única reutilizada por Ajustes (variant 'light') y Login (variant 'dark').
//
// onSubmit recibe el VALOR FINAL de 4 dígitos (evita el bug de stale closure:
// al completar el 4º dígito React aún no actualizó el estado del padre).
// ═══════════════════════════════════════════════════

interface PinPadProps {
  value:     string
  onChange:  (v: string) => void
  /** Se dispara al completar 4 dígitos. Recibe el valor final. */
  onSubmit?: (value: string) => void
  label:     string
  sublabel?: string
  error?:    string | null
  variant?:  'light' | 'dark'
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinPad({
  value, onChange, onSubmit, label, sublabel, error, variant = 'light',
}: PinPadProps) {
  const dark = variant === 'dark'

  const labelColor    = dark ? 'rgba(255,255,255,.8)' : 'var(--fg-mute)'
  const sublabelColor = dark ? 'rgba(255,255,255,.4)' : 'var(--fg-mute)'
  const dotOn         = dark ? '#e0a84a'               : 'var(--amber)'
  const dotOff        = dark ? 'rgba(255,255,255,.15)' : 'var(--ink-3)'
  const dotBorder     = dark ? 'rgba(255,255,255,.2)'  : 'var(--line)'
  const keyBg         = dark ? 'rgba(255,255,255,.08)' : 'var(--ink-2)'
  const keyBorder     = dark ? 'rgba(255,255,255,.12)' : 'var(--line)'
  const keyColor      = dark ? '#fff'                  : 'var(--fg)'
  const dotSize       = dark ? 16 : 14
  const keySize       = dark ? 70 : 64

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: dark ? 14 : 13, color: labelColor, textAlign: 'center', fontWeight: dark ? 500 : 400 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 11.5, color: sublabelColor, textAlign: 'center', marginTop: -10 }}>{sublabel}</div>
      )}

      {/* Dots */}
      <div style={{ display: 'flex', gap: dark ? 14 : 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: dotSize, height: dotSize, borderRadius: '50%',
            background: i < value.length ? dotOn : dotOff,
            border: `1.5px solid ${dotBorder}`,
            transition: 'background .15s',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: '#d66a5a', textAlign: 'center' }}>{error}</div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${keySize}px)`, gap: 10 }}>
        {DIGITS.map((d, idx) => (
          <button
            key={idx}
            disabled={d === ''}
            onClick={() => {
              if (d === '⌫') {
                onChange(value.slice(0, -1))
              } else if (d !== '' && value.length < 4) {
                const next = value + d
                onChange(next)
                if (next.length === 4) onSubmit?.(next)
              }
            }}
            style={{
              width: keySize, height: keySize, borderRadius: '50%',
              background: d === '' ? 'transparent' : keyBg,
              border: d === '' ? 'none' : `1px solid ${keyBorder}`,
              color: keyColor,
              fontSize: d === '⌫' ? (dark ? 20 : 18) : (dark ? 22 : 20),
              fontWeight: dark ? 400 : 500,
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
