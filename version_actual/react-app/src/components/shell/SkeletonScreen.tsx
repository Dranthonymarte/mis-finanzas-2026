// ═══════════════════════════════════════════════════
// SkeletonScreen — Suspense fallback  (BLOQUE 8)
// Pulsing amber dots on dark bg — matches brand
// ═══════════════════════════════════════════════════

export default function SkeletonScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--ink-0)',
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--amber)',
              animation: `skPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes skPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%            { transform: scale(1);   opacity: 1;    }
        }
      `}</style>
    </div>
  )
}
