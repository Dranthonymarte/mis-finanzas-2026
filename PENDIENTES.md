# PENDIENTES — Mis Finanzas 2026

Orden estricto. Actualizar al completar.
**Última actualización:** 2026-05-29 — batch auditoría (RLS/índices aplicados, lint, refactor), HEAD `89d0658`

---

## ✅ Batch auditoría 2026-05-29 — COMPLETADO
- Datos desaparecen random → FIX `useAuth.sessionFor()` ✅
- Telegram bidireccional + JSON parse → client fix + edge fn v12 ya OK ✅
- Lint frontend (4 errores reales) → build 0 errores ✅
- RLS `auth_rls_initplan` + 7 índices FK → **APLICADA y verificada en Supabase** ✅
- Backfill household_id → verificado 0 NULL ✅
- Subcategorias → `ConfirmDialog` global unificado ✅
- Emoji More.tsx → decisión "aceptable" (IcoBg = navegación, no emoji suelto) ✅

**Quedan (decisión / verificación de Anthony):** eliminar edge functions huérfanas
(`telegram-bot` v13, `calendar-sync` v10); migrar `TxnDetail` a `ConfirmDialog`;
lint debt react-hooks v5 (21 err / 9 warn) caso por caso; `DROP` policy duplicada
`own_push` (opcional, en `MIGRACION_2026-05-29_rls_indices.sql`).

---

## 🔴 React App — Pendiente inmediato (próxima sesión)

> Contexto: Batch 2026-05-29 completó ≈Bs ecosistema, UX headers, Buscar ⚙,
> año pills, lista compras, sugerencias email. Lo siguiente NO está hecho:

1. **Fondo emergencia — lógica editable + integración**
   - Columnas YA existen en `config_usuario`: `emergency_fund_base`,
     `emergency_fund_goal`, `ef_manual_base`, `ef_auto_contrib`,
     `ef_reset_date`; + tabla `fondo_emergencia` (por mes, col `monto`).
   - `Home.tsx`: `emergencyBalance`/`emergencyTarget` hoy semi-hardcoded
     (`kpiData.gastos*3`). Debe: meta editable desde `emergency_fund_goal`,
     base de `ahorroAcumulado` (misma lógica de ahorro), aporte auto
     `ef_auto_contrib`. NO requiere migración.
   - `NewTransaction.tsx` ya muestra "30% → fondo emergencia" en Ahorro;
     integrar persistencia real (col `ef_contribution` en `movimientos`).

2. **Dashboard — iconos info por card + reordenar**
   - Columna YA existe: `config_usuario.dashboard_order` (jsonb).
   - `Home.tsx`: cada card con ícono ℹ️ (tooltip explicativo) y permitir
     reordenar (drag o ↑↓) persistiendo en `dashboard_order` vía
     `updateConfig('dashboard_order', …)` (añadir a campoMap en useConfig).

3. **Auditoría quirúrgica de los 28 bugs reportados**
   - Verificar uno por uno: integración en código + soporte en Supabase.
   - Lista original en `BUGS.md` / mensajes de usuario FASE 2-3.

4. **Groq producción (acción ANTHONY, no código)**
   - Cloudflare Pages → Settings → Environment variables →
     `VITE_GROQ_API_KEY` = (valor en `.env.local`). Sin esto, IA no
     funciona en el deploy (`.env.local` es gitignored).

5. **Verificación móvil** del deploy `85e856f`: login + carga ≤3s +
   datos correctos + banner/instalar PWA.

## 🔵 React App — Top-3 mundial validado (próximo batch)

> Todos verificados en Revolut · N26 · Monzo · YNAB · Linear · Notion · Stripe.
> Ordenados por impacto/esfuerzo. Sin dependencias externas nuevas salvo donde se indica.

### UX / Interacción móvil

**B1. Swipe actions en filas de transacciones** *(Revolut, Monzo, N26)*
- Swipe izquierda → revela botones Editar / Eliminar inline (sin navegar a detalle)
- Implementación: `touchstart`/`touchmove`/`touchend` + `transform: translateX` + umbral 60px
- Archivos: `Txn.tsx`, componente `TxnRow` extraíble
- Sin librería externa — CSS transitions puras

**B2. Pull-to-refresh** *(universal — Revolut, N26, Monzo)*
- Swipe down > 60px en cualquier lista → spinner + `refetch()`
- Archivos: `Home.tsx`, `Txn.tsx`, `Accounts.tsx` — hook `usePullToRefresh` compartido
- Sin librería externa — `touchstart`/`touchmove` con overscroll detection

**B3. Smart date grouping en /txn** *(Revolut, N26, Monzo)*
- Agrupar por: "Hoy" / "Ayer" / "Esta semana" / "Semana pasada" / fecha resto
- Reemplaza el agrupamiento plano actual; mismo dato, mejor lectura
- Archivo: `Txn.tsx` — función `dateGroupLabel(isoDate)` en `lib/mes.ts`

**B4. Quick filter chips por categoría en /txn** *(Revolut, N26)*
- Scroll horizontal de chips con las categorías del mes activo → filtra lista sin salir
- "Todas" chip activo por defecto; al seleccionar una, lista se filtra en memoria (sin query extra)
- Archivo: `Txn.tsx` — estado `filterCat` local, deriva de `transactions` ya cargado

**B5. Haptic feedback en acciones clave** *(Revolut, Apple Pay)*
- `navigator.vibrate(10)` al confirmar nueva txn, al eliminar, al completar meta
- `navigator.vibrate([10, 50, 10])` en errores de validación
- Archivo: util `lib/haptic.ts` (3 líneas) — import donde se necesite; sin deps

### Inteligencia financiera

**B6. Budget por categoría con progreso visual** *(YNAB — feature definitorio)*
- Definir límite mensual por categoría desde Settings/Budgets (tabla `config_usuario.budgets` jsonb — ya existe columna)
- En Home y Analisis: barra de progreso por cat (verde → amarillo → rojo al 80% → 100%)
- Alerta inline: "⚠ Alimentación al 87%" encima de la barra
- Archivos: `Settings/Budgets.tsx` (ya existe ruta), `Home.tsx`, `Analisis.tsx`

**B7. Spending insights automáticos en Home** *(Revolut)*
- Franja colapsable bajo los KPIs: 1-2 insights generados de los datos del mes
- Ejemplos: "Gastaste 23% más en Comida vs mayo" · "Tu mayor gasto fue Alquiler ($X)"
- Lógica en `useKPIs` ya tiene prev month — solo falta el render de la franja
- Archivo: `Home.tsx` — componente `InsightStrip` inline, 0 queries extra

**B8. Running balance en AccountDetail** *(Monzo, Revolut)*
- En la vista de detalle de cuenta: cada txn muestra el saldo acumulado a ese punto
- Se calcula en frontend: `saldoInicial + Σ txns hasta esa fecha` (txns ya cargadas)
- Archivo: `AccountDetail.tsx`

### Polish de producto

**B9. Empty states mejorados** *(Linear, Notion, Stripe)*
- Cada página vacía (0 txns, 0 cuentas, 0 recurrentes) muestra: emoji grande + headline + subtexto + botón CTA contextual
- Ejemplos: "Sin movimientos este mes · Registra tu primer gasto →" / "Sin cuentas · Agrega una cuenta →"
- Patrón: `<EmptyState icon="💸" title="..." sub="..." cta={{ label, to }} />`
- Archivo: componente `components/ui/EmptyState.tsx` (nuevo, ~30 líneas) + reemplazar todos los `Sin datos` actuales

**B10. Nota/memo opcional en transacciones** *(Revolut, Monzo)*
- Campo `nota` adicional (máx 120 chars) en TxnDetail y NewTransaction — distinto de `descripcion`
- Muestra debajo de la descripción en la vista de detalle, en texto más pequeño/muted
- Requiere: `ALTER TABLE movimientos ADD COLUMN nota TEXT` (migración simple, sin breaking changes)
- Archivos: `TxnDetail.tsx`, `NewTransaction.tsx`, `EditTransaction.tsx`

---

## 🟡 React App — Charts / pulido

6. **Bloque 3: Charts recharts**
   - `AreaChart` ingresos vs gastos 6M en `Home.tsx` (ya hay datos reales
     6M en `incomeVsExp` desde Supabase — falta migrar de BarChart si se
     desea AreaChart) · `DonutChart` top-5 en `Analisis.tsx`
   - Mantener `Sparkline` KPI cards — no tocar

## 🟡 React App — Seguridad / Infra

2. **Worker Cloudflare para Groq OCR** — sacar `fin_groq_api_key` del localStorage al backend Worker con secret
3. **Fonts offline** — crear `/public/fonts/` con `.woff2` reales (Inter, Instrument Serif, JetBrains Mono) para PWA sin internet
4. **Settings/Categories** — color picker por categoría (actualmente solo nombre)
5. **Analisis** — comparativa vs mes anterior con datos reales (hoy: estática)

## 🟡 React App — Features

6. ✅ **Pareja** — invite real por email: `signInWithOtp` + `household_members pending` (commit `f1f7f23`, 2026-05-26)
7. **NewAccount** — conectar a Supabase (actualmente: Checkpoint B — TODO comentado en código)
8. **useAuth.ts** — `onAuthStateChange` también puede beneficiarse de cache (actualmente: siempre llama resolveHousehold)

## ✅ Vanilla JS — Deprecado (2026-05-26)

~~9. hCaptcha BUG-SEC2~~
~~10. Google OAuth test user~~
~~11. Push SW BUG-3~~ — ✅ Corregido en React App SW (`src/sw.ts`, commit `6988e96`)

## ✅ Completados en sesión 2026-05-26

- ✅ **Backfill household_id**: 0 NULLs en movimientos/cuentas/dinero_fuera
- ✅ **Trigger onboarding DB**: `on_auth_user_created_provision_household` aplicado — nuevos usuarios reciben household automáticamente
- ✅ **Invite flow Pareja**: `signInWithOtp` + `household_members pending` (commit `f1f7f23`)
- ✅ **Web Push SW handlers**: push/notificationclick/subscriptionchange en `src/sw.ts` (commit `6988e96`)
- ✅ **Google Calendar UI**: `/calendar` con status, sync, eventos (commit `822197b`)
- ✅ **Vanilla JS deprecado**: 51 archivos → `versiones_anteriores/vanilla-js-backup/`

## ⚪ Estratégico

12. Modo desktop completo React App (breakpoints en tokens.css)
13. `policy_acceptances` + opt-in legal (prereq Stripe)
14. Stripe setup (`subscription_status` ya en `config_usuario`)
15. Módulo Consultorio — Fase E (tablas en DB listas, falta UI React)
