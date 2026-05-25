# PENDIENTES — Mis Finanzas 2026 (React App)

Orden estricto. Actualizar al completar.
**Última actualización:** 2026-05-25 · rama `react-preview` · HEAD en curso

---

## 🔴 Inmediato — Acción ANTHONY (no código)

1. **Groq API Key en producción** — Cloudflare Pages → Settings → Environment variables →
   `VITE_GROQ_API_KEY` = (valor en `.env.local`). Sin esto, IA no funciona en deploy.

2. **hCaptcha secret key** — Supabase Dashboard → Auth → Attack Protection →
   pegar la secret key del dashboard de hCaptcha.

3. **Cloudflare Pages config** — Ajustar en dashboard:
   - Build command: `cd version_actual/react-app && npm ci && npm run build`
   - Build output directory: `version_actual/react-app/dist`
   - Root directory: vacío

---

## 🟢 Completado en esta sesión

- [x] Insights panel en Home: no descartable (eliminado botón "Descartar")
- [x] Buscar: filtros avanzados por tipo, fecha desde/hasta, cuenta
- [x] Buscar: query incluye subcategoría en resultado
- [x] Restructura repo: app React en `react-preview`, Vanilla JS en `main`

---

## 🔴 React App — Pendiente inmediato (código)

1. **Push notifications backend** — Falta handler `self.addEventListener('push', ...)` en SW
   + suscripción VAPID desde servidor. Solo el toggle UI existe.

2. **NewAccount → Supabase** — `NewAccount.tsx` tiene TODO comentado.
   Conectar guardado real a tabla `cuentas`.

3. **Charts Recharts**
   - `AreaChart` ingresos vs gastos 6M (datos reales ya disponibles en `incomeVsExp`)
   - `DonutChart` top-5 en `Analisis.tsx` (actualmente BarChart horizontal)

4. **Pareja / invitación real** — `inviteUserByEmail` de Supabase auth.admin.
   Actualmente: compartir household_id manual.

5. **Fonts offline PWA** — `/public/fonts/` con `.woff2` Inter, Instrument Serif,
   JetBrains Mono para funcionar sin internet.

---

## 🟡 React App — Pulido / Features

6. Google Sign-In en Login (ya hay botón, falta flujo completo)
7. Filtro tasa BCV/no-BCV en Buscar (requiere columna `rate_type` en query)
8. Comparativa mes anterior en Análisis con datos reales (actualmente semi-hardcoded)
9. Settings → color picker por categoría (actualmente solo nombre)
10. Modo desktop completo (breakpoints en tokens.css)
11. Exportación PDF / compartir por Telegram
12. Bot Telegram para registrar movimientos y recibir reportes

---

## 🟡 Vanilla JS (rama `main`) — Bugs pendientes

> La Vanilla JS quedó con mejoras aplicadas en esta sesión pero no es la app activa.
> Si se decide mantenerla: mergear PR #1 en GitHub.

- hCaptcha BUG-SEC2
- Google OAuth test user aprobado
- Push SW BUG-3
