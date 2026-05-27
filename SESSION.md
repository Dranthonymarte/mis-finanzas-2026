# SESSION.md — Mis Finanzas 2026
_Última actualización: 2026-05-27 · Branch: develop_

---

## 📊 Modelo recomendado próxima sesión
**Sonnet 4.6** — features + bugfixes con criterio (implementación estándar)
> Usar **Opus 4.7** solo si: debugging de concurrencia/race conditions, arquitectura mayor, planning multi-fase.

---

## ✅ ÚLTIMO CHECKPOINT — Sesión 2026-05-27

### Commits pushed a develop + react-preview
```
a38defe fix(ai): welcome message con datos reales del mes activo
da906b8 feat(auth): password strength, forgot password, magic link
d300570 feat(ux): accesos directos scroll horizontal + FAB reordenado
10d69a1 fix(bugs-3-5-6): budget + button, EF meta mes actual 30%, ahorro sin hint EF
70cfef7 fix(auth+notifs): Google OAuth detectSessionInUrl + toggles push/telegram/gcal + notifs editables
e636b9b fix(calendar): usar VITE_SUPABASE_URL env var
822197b feat(calendar): Google Calendar sync UI
6988e96 fix(pwa): Web Push SW handlers completos
f1f7f23 fix(pareja): invite flow real — household_members pending + signInWithOtp
ce01f95 refactor(arch): deprecar vanilla JS → versiones_anteriores
```

### Features implementadas esta sesión
| Feature | Archivo | Estado |
|---------|---------|--------|
| BUG-3: Presupuestos + botón agregar | `settings/Budgets.tsx` | ✅ |
| BUG-5: EF meta = 30% ingresos mes actual | `Home.tsx` | ✅ |
| BUG-6: Ahorro sin hint EF | `NewTransaction.tsx` | ✅ |
| BUG-7: Tasa vacía al cargar (no 36.50 hardcoded) | `NewTransaction.tsx` | ✅ |
| BUG-1: Google OAuth detectSessionInUrl | `lib/supabase.ts` | ✅ |
| BUG-2/9/10: Notificaciones toggles + edit inline | `Notificaciones.tsx` | ✅ |
| Accesos directos scroll horizontal + editor | `Home.tsx` | ✅ |
| FAB reordenado: Buscar>Mov>Voz>Escáner | `FAB.tsx` | ✅ |
| More: eliminar grid 4x4 duplicada | `More.tsx` | ✅ |
| Info icon KPI color --info visible | `Home.tsx` | ✅ |
| Password strength meter (5 segmentos) | `Login.tsx` | ✅ |
| Forgot password (resetPasswordForEmail) | `Login.tsx` | ✅ |
| Magic link (signInWithOtp) | `Login.tsx` | ✅ |
| Reglas bancarias registro: 8+, mayúscula, número, símbolo | `Login.tsx` | ✅ |
| AI: welcome message con datos reales del mes | `AI.tsx` | ✅ |
| Google Calendar sync UI | `Calendar.tsx` | ✅ |
| Web Push SW handlers | `sw.ts` | ✅ |
| Pareja invite flow real | `Pareja.tsx` | ✅ |
| Vanilla JS → versiones_anteriores | repo raíz | ✅ |
| RLS + escalabilidad multi-usuario | Supabase | ✅ |

---

## ⚠️ PENDIENTE — Acción manual de Anthony

### 1. Push a main (PRODUCCIÓN) — Ejecutar en PowerShell
```powershell
git -C "C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app" push origin develop:main --force-with-lease
```
> Bloqueado por auto-mode de Claude (protección de rama principal). Es seguro ejecutarlo tú.

### 2. Cloudflare Pages — Variable GROQ_API_KEY (IA no funciona sin esto)
- dash.cloudflare.com → Pages → mis-finanzas-2026 → Settings → Environment Variables
- Agregar: `GROQ_API_KEY` = tu key de console.groq.com
- Scope: Production + Preview → Save → Redeploy

### 3. Supabase — Site URL para Google OAuth
- app.supabase.com → Authentication → URL Configuration
- Site URL: `https://mis-finanzas-2026.pages.dev`
- Redirect URLs: `https://mis-finanzas-2026.pages.dev`, `http://localhost:5173`

### 4. SMTP producción (forgot password + magic link envíen emails)
- Resend.com → verificar dominio → copiar credenciales
- Supabase → Auth → SMTP Settings → configurar

### 5. Backfill household_id (MIGRACIÓN CONFIRMADA, NO APLICADA)
```sql
UPDATE movimientos SET household_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
WHERE user_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d' AND household_id IS NULL;
UPDATE cuentas SET household_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
WHERE user_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d' AND household_id IS NULL;
```
Ejecutar en Supabase SQL Editor. Sin esto: datos parciales sin filtro household.

---

## 🚧 PENDIENTES TÉCNICOS PRÓXIMA SESIÓN

| # | Item | Prioridad |
|---|------|-----------|
| P1 | Biometría WebAuthn/Passkeys | Media (último) |
| P2 | Analisis ingresos — depende de que txns tengan tipo "Ingreso Fijo" en DB | Baja |
| P3 | Resend.com SMTP configuración | Alta (emails) |
| P4 | Push a main via PowerShell (comando arriba) | Alta (prod) |
| P5 | GROQ_API_KEY en CF Pages | Alta (IA) |

---

## 🏗️ ESTADO DE PRODUCCIÓN
- **react-preview** CF Pages auto-build: ACTUALIZADO ✅
- **develop** branch GitHub: ACTUALIZADO ✅
- **main** branch: DESACTUALIZADO — ejecutar comando PowerShell arriba
- **mis-finanzas-2026.pages.dev**: puede estar en versión anterior hasta push a main

---

## 📁 FUENTE DE VERDAD
`version_actual/react-app/` — única fuente desde 2026-05-26
`versiones_anteriores/vanilla-js-backup/` — deprecated, ignorar

## 🔑 IDs CLAVE
- household_id: `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d`
- Anthony uid: `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d`
- Isabel uid: `455c23cd-...` (partner/accepted del household fa3f7b3b)
- Supabase project: `jcgoccaisemrfsuwwrrl`
- CF Pages project: `finanzasapp` / URL: `mis-finanzas-2026.pages.dev`
