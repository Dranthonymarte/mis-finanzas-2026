# SESSION.md — Mis Finanzas 2026
_Última actualización: 2026-05-29 · Branch: develop_

---

## 📊 Modelo recomendado próxima sesión
- **Grupo 3 (Pareja revocar real + re-invitar con elección de data)** → **Opus 4.7** (toca RLS/seguridad + flujo de datos del hogar; decisión validada ya tomada).
- **Grupo 2 (PIN + biometría + login unificado)** → **Opus 4.7** (auth, riesgo de romper login).
- **Grupos 4/5/6/7** → **Sonnet 4.6** (implementación estándar con decisión tomada).
> Próximo paso natural: cerrar verificación de Grupo 1 → confirmar diseño Grupo 2 o arrancar Grupo 3 (decisión ya dada).

---

## ✅ ÚLTIMO CHECKPOINT — Sesión 2026-05-29 (roadmap 7 grupos + Grupo 1)

> 🗺️ **Roadmap oficial de 7 grupos** ahora en `PENDIENTES.md` (estructura primaria).
> Grupo 1 ✅ HECHO · Grupo 3 (Pareja) 🟡 en progreso · resto pendiente con decisiones anotadas.

### Commits pushed a develop + react-preview + **main** (todo sincronizado)
```
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
| 1 · Estabilidad y confirmaciones | ✅ HECHO (a verificar) | 5 commits arriba |
| 2 · Inicio de sesión (PIN+huella) | 🔧 confirmar diseño | renombrar, fix guardado PIN, login unificado |
| 3 · Pareja: revocar + confirm universal | 🟡 EN PROGRESO | 3 commits; falta revocar real + re-invitar con elección de data |
| 4 · Google OAuth (Calendar + móvil) | 🔧 | callback móvil + login Google móvil |
| 5 · Telegram | 🔧 decisión | rec: bot central + `/start`, sin token por usuario |
| 6 · Apariencia | 🔧 elegir temas | rec: 5 temas + acento + consistencia emoji |
| 7 · Notificaciones + Presupuestos | 🔧 decisión | rec: in-app 80/100% + push opcional off |

### Backlog top-3 (secundario) — adelantado hoy
- ✅ B3 fechas inteligentes · ✅ B5 haptic · ✅ B9 empty states (todos aditivos, sin pisar grupos).

### Pendiente verificación / decisión de Anthony (heredado batch previo)
- **Edge functions huérfanas**: `telegram-bot` v13 y `calendar-sync` v10 → revisar logs y eliminar (Claude no borra edge functions).
- **TxnDetail.tsx**: único consumidor restante de `ConfirmSheet` — migrar a `ConfirmDialog` (entra en auditoría confirm del Grupo 3).
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

## 🏗️ ESTADO DE PRODUCCIÓN  (todo sincronizado en `643c9f1`)
- **develop** branch: ACTUALIZADO ✅
- **react-preview** CF Pages auto-build: ACTUALIZADO ✅
- **main** branch: ACTUALIZADO ✅ (Claude pushea a main por instrucción permanente "sí a producción")
- **mis-finanzas-2026.pages.dev**: en build de `643c9f1`

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
