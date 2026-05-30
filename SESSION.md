# SESSION.md — Mis Finanzas 2026
_Última actualización: 2026-05-30 · Branch: develop (push a develop + react-preview + main)_

---

## 📊 Modelo recomendado próxima sesión
- **G5 (Telegram) y G6 (Apariencia)** → ✅ CERRADOS. Sin trabajo pendiente salvo verificación de Anthony.
- **G3 chooser re-invitar "mi data / data del hogar"** → **Opus 4.7** (toca visibilidad/RLS; necesita que Anthony defina semántica de cada opción).
- **G4 (sync recurrentes→Calendar, si Anthony lo aprueba)** → **Opus 4.7** (feature nuevo: extender edge fn `google-calendar-sync`).
- **G7 toggle push presupuesto** → **Sonnet 4.6** tras aprobar la columna `budget_push_enabled` + emisor server-side.
> **Decisiones que necesito de Anthony para avanzar:** (1) aprobar migración aditiva `budget_push_enabled`; (2) config URL en Supabase Dashboard (G4); (3) semántica del chooser G3; (4) ¿recurrentes deben ir a Calendar? (hoy solo van movimientos).

---

## ✅ ÚLTIMO CHECKPOINT — Sesión 2026-05-29 (roadmap 7 grupos + Grupo 1)

> 🗺️ **Roadmap oficial de 7 grupos** ahora en `PENDIENTES.md` (estructura primaria).
> Grupo 1 ✅ HECHO · Grupo 3 (Pareja) 🟡 en progreso · resto pendiente con decisiones anotadas.

### Commits pushed a develop + react-preview + **main** (todo sincronizado)
```
── Batch 2026-05-30 (G3/G4/G5/G6/G7 + coherencia candado) ──
6eb4b8a fix(candado): removePin limpia flag de sesión — coherencia desactivar/reabrir
28dc84e feat(presupuestos): alertas in-app 80%/100% en Home (YNAB/Monarch)         [GRUPO 7 núcleo]
34b3e37 feat(apariencia): 5 temas + acento, sin flash                              [GRUPO 6 ✅]
6e71c9d feat(telegram): quitar bot de Telegram del ecosistema de la app            [GRUPO 5 ✅]
de7181c fix(auth): redirect OAuth Google al scope PWA (origin+'/') móvil           [GRUPO 4]
70fb01e fix(movimientos): TxnDetail→ConfirmDialog + eliminar ConfirmSheet muerto   [GRUPO 3]
1bb8ede feat(auth): recuperación de PIN olvidado en pantalla de bloqueo            [GRUPO 2 ✅]
── Batch 2026-05-29 ──
666bf3b feat(auth): candado local Layer 2 — huella+PIN al reabrir (a main)        [GRUPO 2 ✅]
59bdb34 feat(auth): gate global RequireAuth + store/lock + Bloquear ahora          [GRUPO 2 ✅]
b87fea0 refactor(auth): PinLockScreen extraído de Login + Security copy            [GRUPO 2 ✅]
ec6999b fix(auth): mover candado PIN/huella a scope global (era código muerto)     [GRUPO 2 ✅]
643c9f1 feat(ux): haptic en acciones clave (backlog B5)
793ffc3 feat(ui): EmptyState reutilizable (backlog B9)
d22239f feat(txn): fechas inteligentes Hoy/Ayer/día (backlog B3)
865c495 feat(pareja): vista por rol — dueño vs invitado + "dejar de ser parte"  [GRUPO 3]
18db649 fix(pareja): límite miembros escalable + desbloquea revocar              [GRUPO 3]
f8fdbae feat(pareja): flujo completo y seguro invitar/revocar                    [GRUPO 3]
7a5842e feat(toast): avisos legibles (duración + barra + cerrar)                 [GRUPO 1]
8dfe875 fix(grupo-1): SW skipWaiting → activa bundle nuevo al instante           [GRUPO 1]
fd74336 fix(grupo-1): confirm/toast global en root + realtime miembros          [GRUPO 1]
cb6e4fc fix(grupo-1): confirm sobre TODO (zIndex>FAB) + dedup toasts offline     [GRUPO 1]
023ebd5 fix(grupo-1): datos estables cache-first, confirm sobre Sheet, BCV       [GRUPO 1]
```

### Estado por grupo
| Grupo | Estado | Nota |
|---|---|---|
| 1 · Estabilidad y confirmaciones | ✅ HECHO (a verificar) | 5 commits |
| 2 · Inicio de sesión (PIN+huella) | ✅ HECHO (en main) | candado Layer 2 global, huella+PIN, "Bloquear ahora", 4 commits |
| 3 · Pareja: revocar + confirm universal | 🟡 CASI | ✅ TxnDetail→ConfirmDialog + ConfirmSheet borrado (auditoría confirm cerrada). Falta solo chooser re-invitar (decisión Anthony) |
| 4 · Google OAuth (Calendar + móvil) | 🟡 parcial | ✅ redirect a scope PWA (`origin+'/'`). Falta config URL en Supabase Dashboard + decidir si recurrentes van a Calendar (hoy solo movimientos) |
| 5 · Telegram | ✅ HECHO | bot fuera del ecosistema de la app (menú + panel token + ruta eliminados); backend conserva el bot de Anthony |
| 6 · Apariencia | ✅ HECHO | 5 temas (oscuro/claro/sistema/OLED/sepia) + acento, sin flash, vía prefs store |
| 7 · Notificaciones + Presupuestos | 🟡 in-app HECHO | ✅ pills 80/100% en Home (0 queries extra). Push toggle diferido: requiere columna `budget_push_enabled` (tu aprobación) + emisor |

### Backlog top-3 (secundario) — adelantado hoy
- ✅ B3 fechas inteligentes · ✅ B5 haptic · ✅ B9 empty states (todos aditivos, sin pisar grupos).

### Pendiente verificación / decisión de Anthony (heredado batch previo)
- **Edge functions huérfanas**: `telegram-bot` v13 y `calendar-sync` v10 → revisar logs y eliminar (Claude no borra edge functions).
- **TxnDetail.tsx**: ✅ HECHO (`70fb01e`) — migrado a `ConfirmDialog` global y `ConfirmSheet` eliminado. Auditoría confirm del Grupo 3 cerrada.
- **Lint debt**: react-hooks v5 — revisión caso por caso.
- **push_subscriptions**: policy duplicada `own_push` (`DROP` opcional en migración).

---

## ⚠️ PENDIENTE — Acción manual de Anthony

### 1. Push a main — ✅ YA NO ES NECESARIO
Claude ahora pushea a `develop` + `react-preview` + `main` tras cada fix
(instrucción permanente "sí a producción siempre"). main sincronizado en `643c9f1`.

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

## 🏗️ ESTADO DE PRODUCCIÓN  (todo sincronizado en `6eb4b8a`)
- **develop** branch: ACTUALIZADO ✅ (batch G3-G7 + coherencia candado)
- **react-preview** CF Pages auto-build: ACTUALIZADO ✅
- **main** branch: ACTUALIZADO ✅ (batch 2026-05-30 en main desde `6eb4b8a`)
- **mis-finanzas-2026.pages.dev**: en build de `6eb4b8a`

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
