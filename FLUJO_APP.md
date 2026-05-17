# FLUJO_APP.md — Mapa funcional completo

> **Doble propósito:**
> 1. Mapa de la Vanilla JS app — verificar que ningún botón/flujo se rompió tras rediseño UIX
> 2. Blueprint para la React App — qué pantallas/features recrear con la nueva UIX
>
> **Última actualización:** 2026-05-17

---

## 🗺️ ESTADO POR PANTALLA / FEATURE

### Vanilla JS (app actual en producción)
| Feature | Ubicación | Handler | Estado |
|---------|-----------|---------|--------|
| Balance hero + moneda | Dashboard | `heroSetCurrency()`, `toggleHideAmounts()` | ✅ Producción |
| KPIs strip | Dashboard | app-analytics.js | ✅ Producción |
| Chart overview | `chart-overview` canvas | Chart.js L2404 | ✅ Producción |
| Nuevo movimiento | `modal-mov` | form-grid submit | ✅ Producción |
| Cuentas (CRUD) | `modal-cuentas`, `modal-nueva-cuenta`, `modal-cuenta-detail` | app-cuentas.js | ✅ Producción |
| Transferencia | `modal-transfer-rial` | par DEBIT+CREDIT | ✅ Producción |
| Búsqueda | `modal-search` | | ✅ Producción |
| IA Chat | `modal-ia` | Groq/Llama | ✅ Producción |
| Notificaciones | `modal-notificaciones` | | ✅ Producción |
| Metas | `openMetasPanel` | config_usuario.metas_ahorro | ✅ Producción |
| FIRE | `openPatrimonioNeto` | fire_config jsonb | ✅ Producción |
| Pareja | `openPareja` | household_members | ✅ Producción |
| Recurrentes | `modal-recurrentes` | config_usuario.recurrentes | ✅ Producción |
| BCV Tasas | `openBCVHistory` | tasas_historicas | ✅ Producción |
| Presupuestos | `openPresupuestosPanel` | config_usuario.presupuestos | ✅ Producción |
| Escáner | `openReceiptScanner` | | ✅ Producción |
| Voz | `openVoiceLanding` | | ✅ Producción |
| Calculadora | `openCalc` | | ✅ Producción |
| CSV Import | `openCSVImport` | | ✅ Producción |
| Envelope Budget | `openEnvelopeBudget` | | ✅ Producción |
| Multi-moneda | USD/BS/EUR switcher | `heroSetCurrency()` | ✅ Producción |
| PIN Login | login screen | Supabase auth | ✅ Producción |
| Offline/PWA | SW `finanzas-v59-batch54` | | ✅ Producción |

### React App (nueva UIX — v1.0.1-bugfix · 2026-05-17)
| Feature | Ruta | Estado | Checkpoint |
|---------|------|--------|------------|
| Onboarding 3 slides | `/onboarding` | ✅ Done | B (auth) |
| Login PIN + Face ID | `/login` | ✅ Done | B (auth) |
| Dashboard / Home | `/` | ✅ Done | B + bugfix |
| Movimientos lista | `/txn` | ✅ Done | B |
| Cuentas lista | `/accounts` | ✅ Done | B |
| AI Chat | `/ia` | ✅ Done | B |
| Más / Settings nav | `/more` | ✅ Done | B |
| **Nuevo movimiento** | `/new-txn` | ✅ Done | Bloque 1 + bugfix |
| **Detalle cuenta** | `/accounts/:id` | ✅ Done | Bloque 2 |
| **Nueva cuenta** | `/new-account` | ✅ Done | Bloque 2 |
| **Transferencia** | `/transfer` | ✅ Done | Bloque 2 + bugfix |
| Detalle movimiento | `/txn/:id` | ✅ Done | bugfix |
| Buscar | `/buscar` | ✅ Done | FAB |
| CSV Import | `/csv-import` | ✅ Done | FAB |
| Voz transacción | `/voz` | ✅ Done | FAB |
| Análisis / Charts | `/analisis` | ✅ Done | FAB |
| Recurrentes | `/recurrentes` | ✅ Done | bugfix |
| Lista de compras | `/lista-compras` | ✅ Done | bugfix |
| Escáner OCR | `/escanear` | ✅ Done | bugfix (Groq Vision) |
| Pareja | `/pareja` | ✅ Done | bugfix |
| Metas de ahorro | `/metas` | ✅ Done | bugfix |
| FIRE / Retiro | `/fire` | ✅ Done | bugfix |
| Notificaciones | `/notificaciones` | ✅ Done | FAB |
| Dinero fuera | `/dinero-fuera` | ✅ Done | FAB |
| Settings Profile | `/settings/profile` | ✅ Done | Bloque 4 |
| Settings Categories | `/settings/categories` | ✅ Done | Bloque 4 |
| Settings Budgets | `/settings/budgets` | ✅ Done | Bloque 4 + bugfix |
| Settings Appearance | `/settings/appearance` | ✅ Done | Bloque 4 + bugfix |
| Settings Security | `/settings/security` | ✅ Done | Bloque 4 + bugfix |
| Settings Tipos | `/settings/tipos` | ✅ Done | Bloque 4 |
| Settings Subcategorias | `/settings/subcategorias` | ✅ Done | Bloque 4 + bugfix |
| Charts recharts (Home/Txn) | Home/Txn | ⏳ Pendiente | Bloque 3 |
| Supabase datos reales | Global | ✅ Done | Checkpoint C (bugfix) |

---

## 🔑 IDs de datos críticos — Vanilla JS (NUNCA eliminar/renombrar)

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

---

## 🔘 Botones del dashboard Vanilla — handler → función esperada

### Hero / balance
- `toggleHideAmounts()` → oculta/muestra todas las cifras (privacidad)
- `showCardInfo('kpi-balance')` → modal explicativo de la tarjeta
- `openIAWithAnalysis()` → abre IA con análisis del balance
- `heroSetCurrency('USD'|'BS'|'EUR')` → cambia moneda mostrada
- `toggleTheme()` → DESACTIVADO batch60 (botón oculto, dark forzado)
- `askCardIA('k-ingresos')` → analiza ese KPI con IA

### Accesos rápidos (#mobile-quick-actions)
`openCalc` · `openModalCuentas` · `openSearch` · `openIA` · `openDineroFuera` ·
`openIntelFinanciera` · `openTransferRial` · `openRecurrentes` · `openPareja` ·
`openBCVHistory` · `openReceiptScanner` · `openCSVImport` · `openVoiceLanding` ·
`openMobileRatesPanel` · `openPresupuestosPanel` · `openListaCompras` · `openNotifPanel`

### Smart actions / secciones
`openPatrimonioNeto` · `openEnvelopeBudget` · `openDetectRecurrentes` · `openCatRules` ·
`renderForecast` · `openFinQuestion` · `openMetasPanel` · `toggleShortcutReorder` · `toggleWalletReorder`

---

## 🪟 Modales Vanilla (todos `.modal-overlay`)

`modal-mov` (nuevo/editar movimiento) · `modal-cuentas` · `modal-nueva-cuenta` ·
`modal-cuenta-detail` · `modal-ia` · `modal-search` · `modal-settings` · `modal-calc` ·
`modal-transfer-rial` · `modal-recurrentes` · `modal-notificaciones` · `modal-pareja` ·
`modal-plantilla-ia` · `modal-voice-landing` · `modal-conexiones` · `modal-audit` ·
`modal-backup-config` · `modal-card-info` · `modal-confirm` · `modal-reorganize` · `modal-nav-editor`

---

## ✅ Checklist verificación post-implementación UIX (Vanilla)

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

---

## 📌 Reglas de negocio críticas (para Checkpoint C)

```
MOVIMIENTOS:
- Inmutables: para editar → soft-delete (deleted_at = NOW()) + nuevo row
- Siempre filtrar: WHERE deleted_at IS NULL
- Scope: household_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
- NUNCA user_id = currentUser.id (siempre household_id)
- tipos: INCOME | EXPENSE | TRANSFER_DEBIT | TRANSFER_CREDIT
- Transferencias: par DEBIT+CREDIT con pair_id (convención por timestamp/descripción actual)

AUTORES:
- Anthony → author: 'A'
- Isabel → author: 'I'

MONEDAS:
- Siempre guardar en USD
- amount_bs = snapshot VES al momento de la transacción
- Tasa: tasas_cambio table (bcv | paralelo | binance | manual)

METAS:
- Fuente activa: config_usuario.metas_ahorro (jsonb array)
  → Confirmar con Anthony antes de wirear GoalsPanel
- Tabla metas está vacía (0 rows) — no usar

CUENTAS:
- activa=true para mostrar
- DEBT accounts: excluir del balance total (lógica en cliente)
- balance = saldo_inicial + SUM(INCOME) - SUM(EXPENSE) desde inicio (o balance_override)
```

---

## 🔧 Pendiente completar (grep sin leer módulos completos)

```bash
# Confirmar handlers (NUNCA read completo de app-core.js 318KB)
grep -n "function open" version_actual/app-features.js
grep -n "function open" version_actual/app-smart.js
grep -n "getElementById\|querySelector" version_actual/app-cuentas.js

# Confirmar fuente activa de metas
grep -n "metas_ahorro\|metas\." version_actual/app-smart.js | head -20
```
