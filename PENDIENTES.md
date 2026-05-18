# PENDIENTES — Mis Finanzas 2026

Orden estricto. Actualizar al completar.
**Última actualización:** 2026-05-17 sesión 2 (v1.0.3-bugfix — 0 bugs conocidos activos)

---

## 🔴 React App — Inmediato

1. **Bloque 3: Charts recharts**
   - `npm install recharts` en `version_actual/react-app/`
   - `AreaChart` ingresos vs gastos 6M en `Home.tsx` (datos reales de `useKPIs` + 5M estáticos)
   - `DonutChart` top-5 categorías en `Analisis.tsx` (colores de `catColor()`)
   - Mantener `Sparkline` para KPI cards — no tocar
   - Colores: `var(--pos)` ingresos, `var(--neg)` gastos, fondo `var(--ink-2)`, tooltip oscuro

## 🟡 React App — Seguridad / Infra

2. **Worker Cloudflare para Groq OCR** — sacar `fin_groq_api_key` del localStorage al backend Worker con secret
3. **Fonts offline** — crear `/public/fonts/` con `.woff2` reales (Inter, Instrument Serif, JetBrains Mono) para PWA sin internet
4. **Settings/Categories** — color picker por categoría (actualmente solo nombre)
5. **Analisis** — comparativa vs mes anterior con datos reales (hoy: estática)

## 🟡 React App — Features

6. **Pareja** — invite real por email (Supabase auth.admin.inviteUserByEmail, actualmente: compartir household_id manual)
7. **NewAccount** — conectar a Supabase (actualmente: Checkpoint B — TODO comentado en código)
8. **useAuth.ts** — `onAuthStateChange` también puede beneficiarse de cache (actualmente: siempre llama resolveHousehold)

## 🟡 Vanilla JS — Seguridad (sin cambios en sprint React)

9. **hCaptcha BUG-SEC2** — Supabase Dashboard → Auth → Attack Protection → pegar secret key
10. **Google OAuth** — Cloud Console → anthonymarte12@gmail.com como test user aprobado
11. **Push SW BUG-3** — agregar `self.addEventListener('push', ...)` en `service-worker.js`

## ⚪ Estratégico

12. Modo desktop completo React App (breakpoints en tokens.css)
13. `policy_acceptances` + opt-in legal (prereq Stripe)
14. Stripe setup (`subscription_status` ya en `config_usuario`)
15. Módulo Consultorio — Fase E (tablas en DB listas, falta UI React)
