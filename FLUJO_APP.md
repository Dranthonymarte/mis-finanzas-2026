# FLUJO_APP.md — Mapa funcional para verificar post-rediseño UIX

> Propósito: tras implementar el Mobile UIX pixel-perfect, verificar que NINGÚN
> botón/flujo se rompió. Cada handler debe seguir funcionando con el markup nuevo.
> Los IDs de datos DEBEN preservarse (la lógica distribuida en app-*.js los alimenta).

## 🔑 IDs de datos críticos — NUNCA eliminar/renombrar (preservar en markup nuevo)

| ID | Qué muestra | Lo alimenta |
|---|---|---|
| `hero-symbol` `hero-int` `hero-dec` | Balance total (símbolo/entero/decimal) | render balance |
| `hero-bs` | Balance en Bs | multi-moneda |
| `hero-pills` `pill-USD` `pill-BS` `pill-EUR` | Switcher moneda | `heroSetCurrency()` |
| `mob-inc-val` `mob-exp-val` | Ingresos/Gastos del mes | render KPIs |
| `k-ingresos` `k-gastos` `k-ahorros` `k-balance` `k-score` `k-emergency` `k-forecast` (+ `-sub`) | KPIs strip | app-analytics.js |
| `wallet-cards-container` | Tarjetas de cuentas | `renderWalletCards()` |
| `mobile-recent-list` | Últimos movimientos | render txns |
| `metas-cards-container` | Metas de ahorro | render metas |
| `alertas-container` | Alertas del mes | render alertas |
| `forecast-card-content` | Pronóstico flujo caja | `renderForecast()` |
| `chart-overview` (canvas) | Chart.js ingresos vs gastos | app-analytics.js L2404 |

## 🔘 Botones del dashboard — handler → función esperada

### Hero / balance
- `toggleHideAmounts()` → oculta/muestra todas las cifras (privacidad)
- `showCardInfo('kpi-balance')` → modal explicativo de la tarjeta
- `openIAWithAnalysis()` → abre IA con análisis del balance
- `heroSetCurrency('USD'|'BS'|'EUR')` → cambia moneda mostrada
- `toggleTheme()` → DESACTIVADO batch60 (botón oculto, dark forzado)
- `askCardIA('k-ingresos')` → analiza ese KPI con IA

### Accesos rápidos (#mobile-quick-actions)
`openCalc` (calculadora) · `openModalCuentas` (cuentas) · `openSearch` (buscar) ·
`openIA` (IA) · `openDineroFuera` (deudas/dinero fuera) · `openIntelFinanciera` (análisis) ·
`openTransferRial` (transferir) · `openRecurrentes` · `openPareja` · `openBCVHistory` (tasa BCV) ·
`openReceiptScanner` (escáner) · `openCSVImport` · `openVoiceLanding` (voz) ·
`openMobileRatesPanel` (tasas) · `openPresupuestosPanel` · `openListaCompras` · `openNotifPanel`

### Smart actions / secciones
`openPatrimonioNeto` · `openEnvelopeBudget` · `openDetectRecurrentes` · `openCatRules` ·
`renderForecast` · `openFinQuestion('que-es'|'como-funciona')` · `openMetasPanel` ·
`toggleShortcutReorder` (reordenar accesos) · `toggleWalletReorder` (reordenar saldos)

## 🪟 Modales (todos `.modal-overlay` > `.modal`/`.modal-box`)

`modal-mov` (nuevo/editar movimiento — form-grid) · `modal-cuentas` · `modal-nueva-cuenta` ·
`modal-cuenta-detail` · `modal-ia` · `modal-search` · `modal-settings` · `modal-calc` ·
`modal-transfer-rial` · `modal-recurrentes` · `modal-notificaciones` · `modal-pareja` ·
`modal-plantilla-ia` · `modal-voice-landing` · `modal-conexiones` · `modal-audit` ·
`modal-backup-config` · `modal-card-info` · `modal-confirm` · `modal-reorganize` · `modal-nav-editor`

Cierre típico: `closeXIfOutside(event)` o `if(event.target===this)closeX()`.

## ✅ Checklist de verificación post-implementación UIX

1. Login → datos cargan (balance real, no $0) — logs `[Household] [plantillas] [Healthcheck]`
2. Cada acceso rápido abre su modal correcto
3. `modal-mov`: crear movimiento → guarda → aparece en lista (INMUTABLE: soft-delete+recrear)
4. Switcher moneda USD/BS/EUR cambia cifras
5. `toggleHideAmounts` oculta/muestra
6. Cuentas: crear/editar/transferencia (par TRANSFER_DEBIT+CREDIT con pair_id)
7. KPIs muestran valores reales; charts renderizan
8. Bottom nav móvil (NUEVO del bundle): navega entre pantallas
9. PWA: offline funciona, SW versión correcta
10. 0 errores en consola

## 🔧 Pendiente completar (próxima sesión, vía grep — NO leer módulos completos)

Mapear con grep en app-*.js (NUNCA read completo de app-core.js 318KB):
- `grep "function open"` en app-features/app-smart/app-cuentas → confirmar handlers
- `grep "getElementById\|querySelector"` → todos los hooks de datos reales
- Completar este MD con flujos de negocio: transferencias, recurrentes, metas, IA
