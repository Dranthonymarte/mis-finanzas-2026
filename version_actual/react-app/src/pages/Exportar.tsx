import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { MOCK_TRANSACTIONS } from '../data/mock'

export default function Exportar() {
  const [downloaded, setDownloaded] = useState<string | null>(null)

  function handleCSV() {
    const headers = ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto (USD)']
    const rows = MOCK_TRANSACTIONS.map(t => [
      t.date,
      `"${t.desc}"`,
      t.cat,
      t.tipo,
      t.amount.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `mis-finanzas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded('csv')
    setTimeout(() => setDownloaded(null), 2500)
  }

  const OPTIONS = [
    { id: 'csv',    emoji: '📊', label: 'Exportar CSV',          sub: 'Todos los movimientos del período',  action: handleCSV },
    { id: 'budget', emoji: '📋', label: 'Resumen mensual',        sub: 'Ingresos, gastos y balance por mes', action: () => {}  },
    { id: 'vs',     emoji: '📈', label: 'Presupuesto vs Real',    sub: 'Comparativo por categoría',          action: () => {}  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Exportar datos" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={opt.action}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '14px',
              display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 24 }}>{opt.emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>{opt.sub}</div>
            </div>
          </button>
        ))}

        {downloaded === 'csv' && (
          <div style={{
            background: 'var(--pos-d)', border: '1px solid var(--pos)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12.5, color: 'var(--pos)', textAlign: 'center',
          }}>
            ✓ Archivo descargado correctamente
          </div>
        )}
      </div>
    </div>
  )
}
