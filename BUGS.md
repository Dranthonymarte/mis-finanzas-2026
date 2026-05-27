# BUGS.md — Mis Finanzas 2026
*Actualizar al trabajar cada bug*

**Última actualización:** 2026-05-26 · React App HEAD `e824580` + ahorro fix

---

## 🔴 BUG-SEC2 — hCaptcha sin configurar
**Estado:** PENDIENTE (acción Anthony)
**Causa:** Supabase Auth Protection activo pero sin secret key real de hCaptcha.
**Fix:** Supabase Dashboard → Auth → Attack Protection → pegar secret key de hcaptcha.com.

---

## 🔴 BUG-SEC3 — /api/groq sin autenticación
**Estado:** PENDIENTE (código — próxima sesión)
**Causa:** CF Function `functions/api/groq.js` acepta cualquier POST sin validar JWT.
**Fix:** Leer header `Authorization: Bearer <token>`, verificar con Supabase JWT secret.

---

## 🟡 BUG-R27 — ahorro_acumulado calculado con ABS (contaba retiros como ahorro)
**Estado:** ✅ RESUELTO — 2026-05-26
**Causa:** RPC `get_home_stats` usaba `SUM(ABS(amount))` → retiros de ahorro se sumaban en vez de restarse. Resultado: $2,248 en vez de $1,658.
**Fix:** Migración `fix_ahorro_acumulado_net_sum` — cambiado a `SUM(amount::numeric)` para cálculo neto correcto. `ingresos_historicos` mantiene `ABS` (correcto).

---

## ✅ BUG-SEC — Token Telegram expuesto
**Estado:** RESUELTO — 15 Abr 2026

---

## ✅ BUG-1 — F5/login = datos $0
**Estado:** FIX APLICADO batch52 (18-Abr)
**Fix:** `setTimeout(0)` en `onAuthStateChange` para liberar lock interno del SDK Supabase.

---

## ✅ BUG-3 — Push móvil no funciona
**Estado:** RESUELTO — batch 5 (26 May 2026)
**Fix:** `sw-push-handler.js` + `usePushSubscription.ts` + tabla `push_subscriptions` con RLS.
Pendiente: Anthony debe generar VAPID keys y configurar `VITE_VAPID_PUBLIC_KEY` en CF Pages.

---

## ✅ BUG-R01 — Crash null guard en useAccounts
**Commit:** `3fb0c3d` — guard `if (!tipo) return 'EXPENSE'` en `inferType`.

## ✅ BUG-R02 — user_id incorrecto + subcat/method nullable
**Commit:** `4876604` — `user_id: auth.uid()` + `household_id: householdId` en todos los inserts.

## ✅ BUG-R03 — Transfer usaba mock data
**Commit:** `b6e5b61` — reescritura con `useAccounts()` + par `TRANSFER_DEBIT/CREDIT`.

## ✅ BUG-R04 — Fire: shape fire_config incorrecto
**Commit:** `134073a` — load/save adaptados al shape `{goal:{meta,extra,plazo,actual}}`.

## ✅ BUG-R05 — ListaCompras: schema JSONB incorrecto
**Commit:** `0e7a420` — CRUD sobre array JSONB `items`.

## ✅ BUG-R06 — Auth: sin provisionar household ni config al registrar
**Commit:** `224929c` — hook `useAuth` crea households + household_members + config_usuario.

## ✅ BUG-R07 — Recurrentes: sin campo recDia
**Commit:** `c8d77f8` — campo `recDia` (día del mes) en interfaz + input.

## ✅ BUG-R08 — Home: Fondo de Emergencia hardcodeado
**Commit:** `c8657c6` — query a `fondo_emergencia` tabla Supabase.

## ✅ BUG-R09 — Appearance: tema/acento no persistían
**Commit:** `493aca5` — bloque síncrono en `main.tsx` antes de `createRoot()`.

## ✅ BUG-R10 — Profile: nombre no se reflejaba en header
**Commit:** `14cbe63` — `useAuthStore.getState().setUserName(nombre)` tras update.

## ✅ BUG-R11 — Pareja: datos mock en lugar de household real
**Commit:** `6f4bd20` — query a `household_members JOIN auth.users`.

## ✅ BUG-R12 — TxnDetail: edit sobreescribía fila
**Commit:** `40312ab` — soft-delete + recrear con nuevo UUID.

## ✅ BUG-R13 — NewTransaction: guardaba sin confirmación
**Commit:** `4bcdd77` — hoja de confirmación antes del INSERT real.

## ✅ BUG-R14 — Home: pronóstico sin recurrentes del mes
**Commit:** `ef563d6` — recurrentes pendientes incluidos en pronóstico.

## ✅ BUG-R15 — Escanear: OCR era mock
**Commit:** `37508bb` — integración real Groq Vision (`llama-3.2-11b-vision-preview`).

## ✅ BUG-R16 — Metas: sin edición inline
**Commit:** `232cefd` — modo edit en `MetaCard` con emoji picker inline.

## ✅ BUG-R17 — Fonts: @font-face rotos
**Commit:** `8da7cc0` — bloques `@font-face` rotos eliminados; fuentes via Google Fonts CDN.

## ✅ BUG-R18 — Budgets: panel inferior separado
**Commit:** `b842727` — input inline dentro de cada fila.

## ✅ BUG-R19 — Subcategorias: sin rename inline
**Commit:** `012372b` — click → input inline con autoFocus.

## ✅ BUG-R20 — project_files RLS: anon podía leer/escribir
**Vía:** Supabase MCP migration `fix_project_files_rls` — policy `allow_all` dropeada.

## ✅ BUG-R21 — Cuentas: balance sin movimientos reales
**Commit:** `c52da61` — `realBalance = saldoInicial + SUM(movimientos.amount)`.

## ✅ BUG-R23 — useAccounts usaba userId en lugar de householdId
**Commit:** `0153570` — filtro corregido a `householdId`.

## ✅ BUG-R24 — CatIcon.cat null crash + txnGroup null guard
**Commit:** `6ab2a97` — `cat ?? ''`, `if (!tipo) return 'gasto'`.

## ✅ BUG-R25 — useAccounts balance estático sin movimientos
**Commit:** `9fe7992` — 2 queries paralelas (cuentas + movimientos SUM).

## ✅ BUG-R26 — useTasas siempre usaba mes 'global'
**Commit:** `9fe7992` — lee `mesActivo` del store, fallback a 'global'.
