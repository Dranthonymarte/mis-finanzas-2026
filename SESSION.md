# SESSION.md — Mis Finanzas 2026
_Última actualización: 2026-05-29 · Branch: develop_

---

## 📊 Modelo recomendado próxima sesión
**Sonnet 4.6** — features + bugfixes con criterio (implementación estándar)
> Usar **Opus 4.7** solo si: debugging de concurrencia/race conditions, arquitectura mayor, planning multi-fase.

---

## ✅ ÚLTIMO CHECKPOINT — Sesión 2026-05-29 (batch auditoría)

### Commits pushed a develop + react-preview
```
89d0658 refactor: Subcategorias usa ConfirmDialog global (confirmAction)
cf0a42f fix: lint frontend (4 errores reales) + migración RLS/índices DB
13c3d9b fix: datos desaparecen random (race householdId) + Telegram JSON parse
```

### Trabajo de esta sesión (2026-05-29 batch)
| Item | Detalle | Estado |
|------|---------|--------|
| Datos desaparecen random | `useAuth.ts` `sessionFor()` preserva householdId resuelto | ✅ shipped |
| Telegram JSON parse | `Notifications.tsx` parseo defensivo; edge fn v12 ya bidireccional | ✅ shipped |
| Lint frontend (4 reales) | Txn / sw / VozTxn / Transfer — build 0 errores | ✅ shipped |
| Migración RLS + índices | 7 índices FK + 16 `ALTER POLICY` `auth.uid()`→`(select auth.uid())` | ✅ APLICADA en Supabase |
| Backfill household_id | Verificado: 0 NULL en movimientos/cuentas/dinero_fuera | ✅ DONE |
| Subcategorias ConfirmDialog | Unificado patrón de confirmación destructiva | ✅ shipped |
| Emoji consistency More.tsx | Decisión: IcoBg = iconografía de navegación (coherente) | ✅ aceptable |

### Pendiente verificación / decisión de Anthony
- **Edge functions huérfanas**: `telegram-bot` v13 y `calendar-sync` v10 → revisar logs de invocación en Supabase y eliminar (Claude no borra edge functions).
- **TxnDetail.tsx**: único consumidor restante de `ConfirmSheet` (flujo soft-delete) — migrar a `ConfirmDialog` en limpieza futura.
- **Lint debt**: 21 err + 9 warn de react-hooks v5 (`set-state-in-effect` / `exhaustive-deps`) — revisión caso por caso, no disables a ciegas.
- **push_subscriptions**: policy duplicada `own_push` (`DROP` opcional comentado en `MIGRACION_2026-05-29_rls_indices.sql`).

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

### 5. Backfill household_id — ✅ APLICADA Y VERIFICADA (2026-05-29)
Confirmado por SELECT: **0 filas** con `household_id IS NULL` en
`movimientos` / `cuentas` / `dinero_fuera`. CERRADO.

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
