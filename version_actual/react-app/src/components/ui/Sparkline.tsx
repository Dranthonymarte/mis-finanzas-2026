// ═══════════════════════════════════════════════════
// Sparkline — lightweight SVG mini chart
// No external deps. Matches m-main.jsx Sparkline usage.
// ═══════════════════════════════════════════════════

interface SparklineProps {
  data: number[]
  color?: string
  w?: number
  h?: number
  fill?: boolean
  stroke?: number
}

export default function Sparkline({
  data,
  color = 'var(--amber)',
  w = 120,
  h = 28,
  fill = false,
  stroke = 1.5,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = stroke

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (w - pad * 2) + pad,
    (h - pad) - ((v - min) / range) * (h - pad * 2 - 2) - 1,
  ])

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')

  const fillPath = `${linePath} L${(w - pad).toFixed(1)},${h} L${pad},${h} Z`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {fill && (
        <path d={fillPath} fill={color} fillOpacity={0.12} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
