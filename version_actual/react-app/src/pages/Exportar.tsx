import { useState } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useTransactions } from '../hooks/useTransactions'
import { useConfig }       from '../hooks/useConfig'
import { useKPIs }         from '../hooks/useKPIs'
import { usePrefsStore }   from '../store/prefs'
import { useAuthStore }    from '../store/auth'
import { mesLabel }        from '../lib/mes'

export default function Exportar() {
  const [downloaded, setDownloaded] = useState<string | null>(null)

  const mesActivo                   = usePrefsStore(s => s.mesActivo)
  const userName                    = useAuthStore(s => s.userName)
  const { transactions: liveTxns }  = useTransactions(mesActivo)
  const { config }                  = useConfig()
  const kpiData                     = useKPIs(liveTxns, config)

  const mesLabel_ = mesLabel(mesActivo)

  // ── CSV helpers ──────────────────────────────────────────────
  function triggerDownload(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCSV() {
    const headers = ['Fecha', 'Descripción', 'Categoría', 'Subcategoría', 'Tipo', 'Monto (USD)']
    const rows = (liveTxns ?? []).map(t => [
      t.date,
      `"${(t.desc ?? '').replace(/"/g, '""')}"`,
      t.cat,
      t.subcat ?? '',
      t.tipo,
      t.amount.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    triggerDownload(csv, `mis-finanzas-${new Date().toISOString().slice(0, 10)}.csv`)
    setDownloaded('csv')
    setTimeout(() => setDownloaded(null), 2500)
  }

  function downloadResumenCSV() {
    const rows = [
      ['Concepto', 'Monto USD'],
      ['Ingresos', kpiData.ingresos.toFixed(2)],
      ['Gastos',   kpiData.gastos.toFixed(2)],
      ['Ahorro',   kpiData.ahorro.toFixed(2)],
      ['Neto',     (kpiData.ingresos - kpiData.gastos).toFixed(2)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    triggerDownload(csv, `resumen-${mesActivo}.csv`)
    setDownloaded('budget')
    setTimeout(() => setDownloaded(null), 2500)
  }

  function downloadPresupuestoCSV() {
    const txns = liveTxns ?? []
    const rows: string[][] = [['Categoría', 'Presupuesto', 'Gastado', 'Diferencia', '%']]
    for (const [categoria, limite] of Object.entries(config.presupuestos)) {
      const gastado = txns
        .filter(t => t.cat === categoria)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
      const diff = limite - gastado
      const pct  = limite > 0 ? Math.round((gastado / limite) * 100) : 0
      rows.push([categoria, String(limite), gastado.toFixed(2), diff.toFixed(2), `${pct}%`])
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    triggerDownload(csv, `presupuesto-vs-real-${mesActivo}.csv`)
    setDownloaded('vs')
    setTimeout(() => setDownloaded(null), 2500)
  }

  // ── PDF export ────────────────────────────────────────────────
  function handlePDF() {
    const txns    = liveTxns ?? []
    const ing     = kpiData.ingresos
    const gas     = kpiData.gastos
    const aho     = kpiData.ahorro
    const neto    = ing - gas
    const savRate = ing > 0 ? ((aho / ing) * 100).toFixed(1) : '0.0'

    // Presupuesto vs real
    const budgetRows = Object.entries(config.presupuestos).map(([cat, limit]) => {
      const spent = txns.filter(t => t.cat === cat).reduce((s, t) => s + Math.abs(t.amount), 0)
      const pct   = Math.round((spent / (limit as number)) * 100)
      const clr   = pct >= 100 ? '#d66a5a' : pct >= 80 ? '#e0a84a' : '#58b26a'
      return `<tr>
        <td>${cat}</td>
        <td style="text-align:right">$${(limit as number).toFixed(2)}</td>
        <td style="text-align:right;color:${clr}">$${spent.toFixed(2)}</td>
        <td style="text-align:right;color:${clr}">${pct}%</td>
      </tr>`
    }).join('')

    // Movimientos
    const txnRows = txns.slice(0, 200).map(t => {
      const isInc = ['Ingreso Fijo', 'Ingreso Variable'].includes(t.tipo)
      const clr   = isInc ? '#58b26a' : t.tipo === 'Gasto' ? '#d66a5a' : '#9aa0ab'
      return `<tr>
        <td>${t.date}</td>
        <td>${t.desc ?? ''}</td>
        <td>${t.cat ?? ''}</td>
        <td>${t.tipo}</td>
        <td style="text-align:right;color:${clr};font-weight:600">${isInc ? '+' : ''}$${Math.abs(t.amount).toFixed(2)}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mis Finanzas — ${mesLabel_}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 24px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; color: #444; text-transform: uppercase; letter-spacing: .08em; }
  .meta { font-size: 11px; color: #888; margin-bottom: 20px; }
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 8px; }
  .kpi { background: #f5f5f8; border-radius: 10px; padding: 12px; text-align: center; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #888; margin-bottom: 4px; }
  .kpi-value { font-size: 17px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f0f0f4; text-align: left; padding: 7px 10px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .07em; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11.5px; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: center; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
    @page { margin: 1.5cm; size: A4; }
  }
</style>
</head>
<body>
<h1>Mis Finanzas 2026</h1>
<div class="meta">
  ${userName ?? 'Usuario'} · Reporte ${mesLabel_} · Generado ${new Date().toLocaleDateString('es-VE', { dateStyle: 'full' })}
</div>

<h2>Resumen del mes</h2>
<div class="kpis">
  <div class="kpi">
    <div class="kpi-label">Ingresos</div>
    <div class="kpi-value" style="color:#58b26a">$${ing.toFixed(2)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Gastos</div>
    <div class="kpi-value" style="color:#d66a5a">$${gas.toFixed(2)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Neto</div>
    <div class="kpi-value" style="color:${neto >= 0 ? '#58b26a' : '#d66a5a'}">${neto >= 0 ? '+' : ''}$${neto.toFixed(2)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Ahorro</div>
    <div class="kpi-value" style="color:#e0a84a">$${aho.toFixed(2)} <span style="font-size:11px;font-weight:400">(${savRate}%)</span></div>
  </div>
</div>

${budgetRows ? `
<h2>Presupuesto vs real</h2>
<table>
  <thead><tr><th>Categoría</th><th style="text-align:right">Límite</th><th style="text-align:right">Gastado</th><th style="text-align:right">%</th></tr></thead>
  <tbody>${budgetRows}</tbody>
</table>` : ''}

<h2>Movimientos — ${mesLabel_} (${txns.length} registros)</h2>
<table>
  <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${txnRows}</tbody>
</table>

<div class="footer">Mis Finanzas 2026 · Reporte generado automáticamente · Solo para uso personal</div>

<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Activa las ventanas emergentes para exportar PDF'); return }
    win.document.write(html)
    win.document.close()
    setDownloaded('pdf')
    setTimeout(() => setDownloaded(null), 3000)
  }

  // ── Options ──────────────────────────────────────────────────
  const OPTIONS = [
    {
      id: 'pdf',
      emoji: '📄',
      label: 'Exportar PDF',
      sub: 'Reporte completo con resumen, presupuesto y movimientos',
      action: handlePDF,
      highlight: true,
    },
    { id: 'csv',    emoji: '📊', label: 'Exportar CSV',       sub: 'Todos los movimientos del período',  action: handleCSV },
    { id: 'budget', emoji: '📋', label: 'Resumen mensual',    sub: 'Ingresos, gastos y balance del mes', action: downloadResumenCSV },
    { id: 'vs',     emoji: '📈', label: 'Presupuesto vs Real', sub: 'Comparativo por categoría (CSV)',   action: downloadPresupuestoCSV },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Exportar datos" back />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', paddingBottom: 4 }}>
          Período activo: <strong style={{ color: 'var(--fg)' }}>{mesLabel_}</strong>
        </div>

        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={opt.action}
            style={{
              background: opt.highlight ? 'rgba(224,168,74,.1)' : 'var(--ink-2)',
              border: `1px solid ${opt.highlight ? 'rgba(224,168,74,.35)' : 'var(--line)'}`,
              borderRadius: 14, padding: '14px',
              display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 24 }}>{opt.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>{opt.sub}</div>
            </div>
            {opt.highlight && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em',
                background: 'var(--amber)', color: 'var(--ink-0)',
                padding: '3px 8px', borderRadius: 999,
              }}>NUEVO</span>
            )}
          </button>
        ))}

        {downloaded && (
          <div style={{
            background: 'rgba(88,178,106,.1)', border: '1px solid rgba(88,178,106,.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12.5, color: 'var(--pos)', textAlign: 'center',
          }}>
            {downloaded === 'pdf'
              ? '✓ Reporte PDF abierto — usa "Guardar como PDF" en el diálogo de impresión'
              : '✓ Archivo descargado correctamente'}
          </div>
        )}

        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', padding: '4px 2px', lineHeight: 1.6, marginTop: 4 }}>
          El PDF se genera desde tu navegador. En el diálogo de impresión selecciona{' '}
          <strong>Guardar como PDF</strong> como destino. Los datos no se envían a ningún servidor.
        </div>
      </div>
    </div>
  )
}
