# PENDIENTES — Mis Finanzas 2026

Orden estricto. Actualizar al completar.
**Última actualización:** 2026-05-26 — arch cleanup + fixes A+B+C+D, HEAD `822197b`

---

## 🔴 React App — Pendiente inmediato (próxima sesión)

> Contexto: FASE 3/3.2 corrigió de raíz auth (refresh/loop/datos
> desconfigurados), Lista de compras, Subcat/Cat, patrimonio, sheets,
> tasa manual, PWA install. Lo siguiente NO está hecho:

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
