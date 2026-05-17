# PENDIENTES — Mis Finanzas 2026

Orden estricto. Actualizar al completar o reordenar.
**Última actualización:** 2026-05-17 (post-bugfix sprint React App v1.0.1)

---

## 🔴 React App — Inmediato

1. **BUG-R21** — Account balance = `saldo_inicial + SUM(movimientos)` en `AccountDetail.tsx`  
   → Actualmente muestra solo `saldo_inicial`, ignora movimientos reales.

2. **BUG-R22** — Verificar `tasas_cambio` mes `'global'` vs `mesActivo` en `useTasa.ts`  
   → Confirmar si causa tasa incorrecta en conversiones USD↔VES.

## 🟡 React App — Bloque 3 (Charts)

3. Instalar `recharts` + `@types/recharts`
4. `AreaChart` ingresos vs gastos 6 meses en `/` (Home)
5. `DonutChart` categorías en `/txn` (top 5 del mes, colores de `CatIcon`)
6. Mantener `Sparkline` para KPI cards pequeños

## 🟡 React App — Seguridad / Infra

7. **Worker Cloudflare** para Groq OCR — sacar `fin_groq_api_key` del localStorage al backend
8. **Fonts offline** — crear `/public/fonts/` con archivos `.woff2` reales para PWA sin internet
9. **GitHub CI/CD** — auto-build en push a `react-preview` (ya activo en CF Pages — verificar)

## 🟡 React App — Features pendientes

10. **Settings/Categories** — color picker por categoría (actualmente solo nombre)
11. **Análisis** — comparativa vs mes anterior con datos reales
12. **Pareja** — invite real por email (Supabase invite link, actualmente solo comparte household_id)

## 🟡 Vanilla JS — Deploy y seguridad (sin cambios en bugfix sprint)

13. **hCaptcha** configurar (BUG-SEC2) — Supabase Dashboard → Auth → Attack Protection → pegar secret key
14. **Google OAuth** test user → Cloud Console → `anthonymarte12@gmail.com`
15. **Fix BUG-3** push SW — agregar `self.addEventListener('push', ...)` en `service-worker.js`
16. **Fix BUG-4** CDN verificar — `index.html` v7 fallback a unpkg (confirmar post-deploy)

## ⚪ Estratégico

17. Modo desktop completo React App (prereq: definir breakpoints en tokens.css)
18. `policy_acceptances` + opt-in legal (antes de Stripe)
19. Stripe setup (`subscription_status` ya en `config_usuario`)
20. Módulo Consultorio — Fase E (tablas listas, falta UI en React App)
21. Push real móvil — agregar handler en SW + service worker registration
