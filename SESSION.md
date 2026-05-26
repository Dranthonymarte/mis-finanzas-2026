# SESSION.md — Mis Finanzas 2026

---

## SESIÓN — 26 May 2026 (Batches 3–5 React App · rama react-preview)

📊 **Modelo: Sonnet 4.6**

### HEAD: `e824580` — rama `react-preview`

### Completado esta sesión

**Batch 3 (UIX + lógica)**
- AppShell slide animation eliminada
- Subcategorías: rewrite UIX idéntico a Categorías (CatIcon, rename, emoji, ✎/×)
- Tipos: chip Ahorro separado + botón Crear layout correcto
- ListaCompras: multi-lista completa
- KPI Insights: score/100, superávit, tasa ahorro, fondo %, top gasto
- Análisis: Ingresos tappable → desglose HBar + comparativa mes anterior real

**Batch 4 (datos + UIX)**
- useAccounts + useTransactions: Supabase Realtime postgres_changes + visibilitychange
- NewTransaction: tasa BCV activa bajo campo monto
- Pareja: invitación real supabase.auth.signInWithOtp
- Home: patrimonio = TODAS cuentas + me deben; score max(ahorro, neto+); "Reserva recomendada"
- Buscar: filtro rate_type BCV/Sin BCV + select incluye rate_type
- Subcategorías chips: TODAS las categorías para discovery
- Backfill household_id NULL: 1,434 movimientos corregidos (Supabase MCP)

**Batch 5 (infraestructura + performance)**
- Groq 405 FIX: functions/api/groq.js movido a raíz del repo (CF Pages busca ahí)
- Home.tsx: 7 queries → 1 RPC get_home_stats (histKPIs 5M + ahorro acum + ingresos hist)
- NewTransaction: offline queue localStorage + flush al reconectar (online event)
- NewAccount: insert real a cuentas con UUID explícito
- useAccounts: trend real vs mes anterior (3ra query paralela); Accounts.tsx oculta trend 0%
- Push notifications: sw-push-handler.js, usePushSubscription hook, push_subscriptions tabla RLS
- vite.config.ts: importScripts sw-push-handler en workbox generateSW
- workers/bcv-rate: CF Worker cron 3pm VET + trigger manual /update (pendiente deploy Anthony)
- Supabase: RPC get_home_stats + tabla push_subscriptions aplicados en producción

### Commits rama react-preview
```
e824580  feat(react-app): batch 5 — Groq fix, RPC, offline queue, push VAPID, BCV worker, trend
a75ac60  feat(react-app): batch 4 — Realtime, tasa date, invitación pareja, patrimonio, score, BCV filter
(prev)   feat(react-app): batch 3 — UIX múltiples mejoras
```

### Estado actual
| Item | Estado |
|------|--------|
| Build React App | ✅ 0 errores, 69 entries precached |
| Groq IA | ✅ function en repo root (soluciona 405) |
| Supabase Realtime | ✅ useAccounts + useTransactions |
| Home queries | ✅ 7 → 1 RPC |
| Offline queue | ✅ localStorage + flush online |
| Push SW handler | ✅ código listo |
| CF Worker BCV | ⏳ código listo, pendiente `wrangler deploy` Anthony |
| VAPID keys | ⏳ pendiente generación Anthony |
| hCaptcha | ⏳ acción Anthony en Supabase dashboard |

### Pendiente próxima sesión (orden por impacto)
```
1. Rate limiting en /api/groq (seguridad — cualquiera puede llamarla sin auth)
2. Google Sign-In flujo OAuth completo
3. Fonts offline PWA (/public/fonts/ .woff2)
4. Settings color picker por categoría
5. KPI presupuesto excedido (requiere cats con presupuesto definido)
6. Export PDF / Telegram
```

### Modelo recomendado próxima sesión
📊 **Sonnet 4.6** — features CSS/JS con referencia, seguridad rate-limiting

---

## SESIÓN — 18 May 2026 (FASE 4 — PWA + household REAL + RLS)

Commits: `a71cf9b` `f49ee9e` `85b72dc` `1471294` `5f62870`
- Anthony uid fa3f7b3b = owner household fa3f7b3b. Isabel uid 455c23cd = partner del mismo household.
- RLS movimientos + dinero_fuera: household_id = active_household_id()
- PWA instalable, DineroFuera CRUD, meDebenActivo en patrimonio

---

## SESIÓN — 17-18 May 2026 (sprint 27 bugs React App · BUG-R01..R26 todos resueltos)

Commits: `fce3797` `9fe7992` `6ab2a97` `5e672eb` `0153570` y anteriores
- 26 bugs corregidos: OCR real, Transfer cuentas reales, RLS, fonts, auth fast-path
- useAccounts householdId, balance real, tasas por mes activo, CatIcon null-safe

---

## SESIONES ANTERIORES (Abr 2026)

- 26 Abr: Extractos BDV Isabel — 75 movimientos insertados
- 24 Abr: F2 batch55 shell visual, fonts self-hosted
- 23 Abr: git init, planning rediseño visual
- 18 Abr: batch52 BUG-1 deadlock fix (setTimeout 0 en onAuthStateChange)
- 15 Abr: GitHub + CF Pages conectados, batch56 dashboard redesign
