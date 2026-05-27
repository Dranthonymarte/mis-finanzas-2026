# MORNING_BRIEF — Mis Finanzas 2026

**Última actualización:** 2026-05-27 (sesión UX shortcuts + auth + AI real data + login security)

---

## 🔴 ACCIÓN INMEDIATA al abrir (próxima sesión)

### Push a producción (main) — PENDIENTE
Anthony debe ejecutar en PowerShell:
```powershell
git -C "C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app" push origin develop:main --force-with-lease
```
> Claude no puede hacerlo (auto-mode bloquea force-push a main por protección de rama).

---

## ✅ ESTADO ACTUAL (2026-05-27)

### App en producción
- **react-preview.pages.dev**: Actualizado con todos los commits de esta sesión ✅
- **mis-finanzas-2026.pages.dev** (main): DESACTUALIZADO — push pendiente ⬆️
- **develop branch**: Actualizado ✅

### Features funcionando (verificadas con TypeScript 0 errores)
1. **Accesos directos dashboard** — scroll horizontal, 5 por defecto, ⚙ abre editor personalizable
2. **FAB** — 4 acciones: Buscar, Movimiento, Por voz, Escáner (quitó Transferir + CSV)
3. **Login** — strength meter, forgot password, magic link, reglas bancarias 8+ chars
4. **AI** — welcome message con datos reales del mes (ingresos/gastos/neto)
5. **Info icons KPI** — color azul `--info` visible
6. **More/Menú** — sin grilla duplicada
7. **Presupuestos** — botón + para agregar nuevos
8. **Notificaciones** — toggles push/telegram/gcal + edición inline
9. **Google OAuth** — detectSessionInUrl corregido
10. **Web Push SW** — handlers push/click/subscriptionchange completos
11. **Google Calendar UI** — status + sync + lista eventos
12. **Pareja invite** — OTP + household_members pending

---

## ⚙️ CONFIGURACIÓN MANUAL PENDIENTE

| # | Tarea | Servicio | Impacto |
|---|-------|----------|---------|
| 1 | Push develop:main | Git/PowerShell | Producción desactualizada |
| 2 | GROQ_API_KEY env | Cloudflare Pages | IA no funciona en producción |
| 3 | Site URL + Redirect URLs | Supabase Auth | Google Login en prod |
| 4 | SMTP Resend.com | Supabase Auth | Forgot password / magic link |
| 5 | Backfill household_id SQL | Supabase SQL Editor | Datos históricos sin scope |

---

## 🚧 PENDIENTES TÉCNICOS (próxima sesión)

- **P1**: Biometría WebAuthn/Passkeys (último — después de consolidar)
- **P2**: Analisis ingresos fijo/variable — requiere que txns tengan tipo "Ingreso Fijo" en DB
- **P3**: Telegram bot — verificar con /start en @tu_bot (token en CF Worker secrets)
- **P4**: Google Calendar — verificar Edge Function google-calendar-sync desde producción

---

## 📁 ESTRUCTURA PROYECTO

```
APP WEB - FINANZAS/
├── version_actual/react-app/     ← ÚNICA FUENTE (React 19 + TS + Vite)
│   ├── src/pages/                 31 páginas todas conectadas a Supabase real
│   ├── src/components/shell/      AppShell, TabBar, FAB, AuthGuard
│   ├── src/store/                 auth.ts, prefs.ts, toast.ts, app.ts
│   ├── src/hooks/                 useAuth, useTransactions, useAccounts, useConfig...
│   └── src/lib/                   supabase.ts, mes.ts, handleError.ts
├── versiones_anteriores/          DEPRECATED — no tocar
├── SESSION.md                     ← Estado detallado + comandos pendientes
├── CLAUDE.md                      ← Reglas vinculantes del proyecto
├── SUPABASE_SCHEMA.md             ← Schema cache (leer ANTES de cualquier query)
├── PENDIENTES.md                  ← Lista priorizada de features
└── BUGS.md                        ← Bugs activos
```

---

## 🔑 REFERENCIAS RÁPIDAS

| Recurso | Valor |
|---------|-------|
| household_id | `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d` |
| Supabase project | `jcgoccaisemrfsuwwrrl` |
| CF Pages project | `finanzasapp` |
| URL producción | `mis-finanzas-2026.pages.dev` |
| URL preview | `react-preview.pages.dev` |
| Branch producción | `main` → CF Pages auto-build |
| Branch desarrollo | `develop` → también `react-preview` |
| Groq API URL | `/api/groq` (CF Pages Function) |
| Edge Functions | telegram-bot-webhook v7, vapid-push v4, google-oauth v1, google-calendar-sync v3 |
