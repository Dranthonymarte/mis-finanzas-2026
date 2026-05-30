# PENDIENTES — Mis Finanzas 2026

Orden estricto. Actualizar al completar.
**Última actualización:** 2026-05-29 — Grupo 2 (login/candado) cerrado y pusheado a main, HEAD `666bf3b`

---

## 🗺️ ROADMAP OFICIAL — 7 GRUPOS (estructura primaria de trabajo)

> Definido por Anthony 2026-05-29. **Esta es la cola de trabajo principal.**
> El backlog "Top-3 B1-B10" más abajo es secundario (B3/B5/B9 ya hechos hoy).

### Grupo 1 — Estabilidad y confirmaciones ✅ HECHO (pusheado · a verificar Anthony)
Commits: `023ebd5` `cb6e4fc` `fd74336` `8dfe875` `7a5842e`
- Datos estables cache-first · ConfirmDialog global sobre TODO (zIndex > FAB)
- Toasts legibles (duración por longitud + barra + cerrar) + dedup offline
- SW skipWaiting (activa bundle nuevo al instante) · realtime miembros Pareja

### Grupo 2 — Inicio de sesión (biometría + PIN) ✅ HECHO (pusheado a main · a verificar Anthony)
Commits: `ec6999b` `b87fea0` `59bdb34` `666bf3b`
- **Candado local Layer 2**: huella primero (auto al reabrir) + PIN de respaldo en la MISMA pantalla. Nunca pide ambos.
- Gate movido a scope global (`RequireAuth`) vía `store/lock.ts` (Zustand, NO persistido) → `PinLockScreen` extraído de Login (antes era código muerto en /login).
- Login Layer 1 (correo / Google / magic link) llama `unlock()` al iniciar sesión → no doble-pide PIN tras autenticarse.
- "Bloquear ahora" en More: pide huella/PIN sin cerrar sesión. "Cerrar sesión" SÍ destruye la sesión → reentrada por credenciales (no PIN).
- Security: encabezado "Inicio de sesión" → "Bloqueo de la app" + copy aclaratorio (es candado local, no reemplaza el login con correo/Google).
- **Recuperación de PIN olvidado** (`PinLockScreen`): link "¿Olvidaste tu PIN?" → confirm → `removePin()` + `signOut()` → cae a `/login` → re-login (correo/Google) → poner PIN nuevo. Patrón Revolut/banca (el candado local no se "recupera", se restablece probando identidad real). **Cierra la trampa de bloqueo** (antes no había salida si olvidabas el PIN sin huella).
**Arquitectura confirmada:** Layer 1 = identidad (sesión Supabase persistente). Layer 2 = candado local de reentrada (conveniencia/defensa en profundidad, NO 2º factor verificado en server).

### Grupo 3 — Pareja: revocar + confirmación universal 🟡 CASI — verificado sin cuello de botella
Avance committeado: `f8fdbae` `18db649` `865c495` (vista por rol + "dejar de ser parte")
**Verificado 2026-05-29** (Pareja.tsx, 640 líneas): revocar (`invite_status='revoked'`), salir del hogar,
re-invitar y realtime de `household_members` funcionan con `confirmAction` global. Limpieza de canal correcta.
**Sin cuello de botella de performance.** Gaps reales restantes (2):
- Re-invitar NO ofrece chooser "mi data" vs "data del hogar" (hoy: re-envía OTP + vuelve a pending). ← único gap del flujo
- `TxnDetail.tsx` = último consumidor del `ConfirmSheet` legacy → migrar a `ConfirmDialog` (cierra la auditoría de confirmación).
**Decisión Anthony:** flujo validado (Splitwise / YNAB / Google Family) → implementar tal cual.

### Grupo 4 — Google OAuth (Calendar + vista móvil) 🔧
- Calendar redirige a dominio correcto (secret ya puesto)
- Login Google abre en móvil, no escritorio · callback de Calendar en móvil
- Relacionado: `ad160ab` (gcal-callback.html). Task #5 in-progress.

### Grupo 5 — Telegram 🔧 requiere decisión de Anthony
- Error 405 webhook · bidireccional · panel token/username
- **Recomendación top-3:** bot central + vinculación por código `/start` (eliminar "pega tu token" por usuario). Patrón Mercado Pago / Revolut.

### Grupo 6 — Apariencia 🔧 requiere elegir temas
- Revertir lógica anterior (acento sutil)
- 5 temas validados: **Oscuro · Claro · Sistema · Negro OLED · Sepia cálido** + acento configurable
- Consistencia de los "cuadritos" de emoji en toda la app (todos o ninguno)

### Grupo 7 — Notificaciones + Presupuestos 🔧 requiere decisión push vs in-app
- Notificaciones: confirmación + activar/desactivar real
- Alertas sutiles de desvío de presupuesto (no invasivas)
- **Recomendación:** aviso in-app sutil al 80% / 100% + push opcional (off por defecto). Patrón YNAB / Monarch.

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

**B3. Smart date grouping en /txn** ✅ HECHO (`d22239f`) *(Revolut, N26, Monzo)*
- Implementado en `useTransactions.ts` `relativeDate()`: Hoy / Ayer / nombre del día (últimos 7) / fecha / fecha+año previo
- Mejora /txn y AccountDetail (misma fuente). No tocó sumas ni orden.

**B4. Quick filter chips por categoría en /txn** *(Revolut, N26)*
- Scroll horizontal de chips con las categorías del mes activo → filtra lista sin salir
- "Todas" chip activo por defecto; al seleccionar una, lista se filtra en memoria (sin query extra)
- Archivo: `Txn.tsx` — estado `filterCat` local, deriva de `transactions` ya cargado

**B5. Haptic feedback en acciones clave** ✅ HECHO (`643c9f1`) *(Revolut, Apple Pay)*
- `lib/haptic.ts` (feature-detect + try/catch, no-op en iOS). Wired: FAB toggle/acción (light), guardar txn éxito/offline (success), fallo (error).
- Pendiente opcional: ampliar a eliminar / completar meta / transfer.

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

**B9. Empty states mejorados** ✅ HECHO (`793ffc3`) *(Linear, Notion, Stripe)*
- `components/ui/EmptyState.tsx` (icon + title + sub + CTA navegar/onClick). Aplicado: Txn, AccountDetail, Recurrentes, DineroFuera, Buscar.
- NO tocado a propósito: Home y Analisis (vacíos por-widget, no de página completa).

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
