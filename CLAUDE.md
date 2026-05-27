# CLAUDE.md — Mis Finanzas 2026

Guía para Claude Code. Reglas vinculantes. Español latino siempre.

---

## IDENTIDAD
- Owner: Anthony Marte (odontólogo). Tú eres CTO+equipo.
- Emails: anthonymarte12@gmail.com | isabelcristinapedrales@gmail.com
- household_id: `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d`

## VISIÓN
- App financiera **top 3 mundial** (ref: Notion, Linear, Revolut)
- Arquitectura modular permanente. Nunca monolito intencional.

## GUARDIÁN DE CALIDAD — REGLA CRÍTICA
Si una decisión se desvía del estándar top 3 → **interrumpe, explica, propón alternativa, espera confirmación**. Aplica para naming, estructura, errores, auth, performance, seguridad, deuda técnica, atajos dañinos.

## STACK

### Vanilla JS (producción)
```
Vanilla JS + HTML + CSS | SIN bundler | PWA offline-first
Supabase: jcgoccaisemrfsuwwrrl | Cloudflare Pages: finanzasprueba.pages.dev
Proyecto Cloudflare: finanzasapp | Dual-currency USD/VES | RLS activo
```

### React App (nueva UIX — FASE 3.2, HEAD 85e856f, 2026-05-18)
```
React 19 + TypeScript strict + Vite + Zustand v5 + recharts + vite-plugin-pwa
Branch: develop → push también a react-preview (CF Pages auto-build)
Ruta local: version_actual/react-app/
31 rutas — todas conectadas a Supabase real
```
REGLA CRÍTICA datos (CORREGIDA 2026-05-18 con evidencia Supabase live —
reemplaza la regla previa `householdId===userId` que era INCORRECTA):
Los datos (`movimientos`, `cuentas`, `dinero_fuera`) son **HOUSEHOLD-scoped**.
- Anthony auth uid `fa3f7b3b…` == su household_id `fa3f7b3b` (owner).
- Isabel auth uid `455c23cd…` = `partner/accepted` del household `fa3f7b3b`
  en `household_members` (tiene además un household propio legacy
  `d806a2b6` SIN uso — ignorar).
- `householdId` se resuelve de `household_members` (WHERE user_id=auth.uid()
  → household_id): Anthony→fa3f7b3b, Isabel→fa3f7b3b. Resolución
  **cache-first** (persist store), **no bloqueante** (authReady desde
  getSession; household en background), fallback householdId=auth.uid()
  solo si no hay membership. NUNCA `provisionHousehold` / nunca auto-crear
  household / nunca bloquear auth (eso causó el loop pre-9b9c0a8).
- READS: filtrar por `household_id = householdId` (NO por user_id).
- INSERT: `user_id = auth.uid()` (creador, para análisis por miembro =
  "created_by") + `household_id = householdId`.
- ⚠️ Estado data: `household_id` parcialmente NULL (240 mov + 4 cuentas,
  user_id=fa3f7b3b) → requiere migración backfill a fa3f7b3b. Hasta
  aplicarla, filtro transitorio debe incluir filas household_id IS NULL
  del owner. (Migración quirúrgica: ver SESSION.md / confirmada por Anthony.)
Auth es cache-first (persist store) + timeout 3.5s. PWA: `registerSW`
en main.tsx + `usePwaInstall` (no customizar `storageKey` de Supabase).
Pendiente: ver `PENDIENTES.md` §1-5 (Fondo emergencia, Dashboard
reorder/info, auditoría 28 bugs, Groq env CF, verif. móvil).

---

## REACT APP — REGLAS CRÍTICAS (vinculantes)

```
INSERT movimientos: user_id = auth.uid() (creador) + household_id = householdId
READS movimientos/cuentas/dinero_fuera: filtrar por household_id (NO user_id)
subcat / method: NUNCA null → siempre ''
Edición movimientos: soft-delete (deleted_at=now()) + INSERT nuevo UUID
Transferencias: par TRANSFER_DEBIT+CREDIT con pair_id compartido
mes DB: "Mayo" | prefs store: "may-26" → convertir con mesIdToDbKey()
household_id (Anthony y Isabel): fa3f7b3b-148b-4dea-8e2a-37f740c08b3d
config_usuario: per-user (sin household_id) — Isabel 455c23cd, Anthony fa3f7b3b
```

### TypeScript strict
```
noUnusedLocals: true | noUnusedParameters: true
verbatimModuleSyntax: true → import { type X } no import { X }
Build 0 errores antes de cada commit
```

### Arquitectura React App
```
src/
├── components/
│   ├── brand/   Logo, AppIcon
│   ├── shell/   AppShell, TabBar, FAB, AuthGuard, ErrorBoundary, SkeletonScreen, Toast
│   ├── ui/      Sparkline, Pill, CatIcon (null-safe), catColor()
│   └── icons/   Icons.tsx (SVG set)
├── store/
│   ├── auth.ts  isAuthenticated, userId, householdId (persistidos), userName
│   ├── prefs.ts mesActivo ("may-26"), moneda, ocultarMontos
│   └── toast.ts
├── hooks/
│   ├── useAuth.ts        fast-path cache, provisionHousehold
│   ├── useAccounts.ts    2 queries paralelas, balance real
│   ├── useTransactions.ts household_id, mesIdToDbKey
│   ├── useConfig.ts      upsert, DEFAULTS fallback
│   ├── useTasas.ts       mesActivo + fallback global
│   ├── useKPIs.ts        null guards tipos
│   └── useFormat.ts
├── pages/        31 rutas — todas conectadas Supabase real
└── lib/
    ├── supabase.ts
    ├── mes.ts     mesIdToDbKey("may-26" → "Mayo")
    └── handleError.ts
```

### Git React App
```
# Push SIEMPRE con PowerShell (bash no tiene auth):
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command
"cd 'C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app'; git push origin develop develop:react-preview 2>&1"
```

---

## FUENTE DE VERDAD
- `version_actual/react-app/` — **ÚNICA fuente desde 2026-05-26** (React App)
- `version_actual/` contiene SOLO: `react-app/` + `fonts/` + `.wrangler/`
- `versiones_anteriores/vanilla-js-backup/` — vanilla JS deprecated (2026-05-26), ignorar
- `versiones_anteriores/` — ignorar salvo restauración explícita
- Supabase — solo tablas de la app, no dev management

## ARCHIVOS CLAVE (React App — version_actual/react-app/)
| Archivo | Nota |
|---|---|
| `src/App.tsx` | Router — 32 rutas lazy |
| `src/main.tsx` | Entry, registerSW, tema |
| `src/sw.ts` | Service Worker custom (injectManifest) — push/click/subscriptionchange |
| `vite.config.ts` | VitePWA injectManifest mode |
| `src/store/auth.ts` | Auth store (Zustand persist) |
| `src/store/prefs.ts` | Prefs store (mesActivo, moneda) |
| `src/hooks/useAuth.ts` | cache-first auth + resolveHouseholdId (NO causa loops) |
| `src/hooks/useTransactions.ts` | Reads by household_id |
| `src/hooks/useAccounts.ts` | 2 queries paralelas |
| `src/pages/Home.tsx` | Dashboard principal (KPIs, recharts) |
| `src/pages/Pareja.tsx` | Invite flow: signInWithOtp + household_members |
| `src/pages/Calendar.tsx` | Google Calendar sync UI |
| `src/pages/NewTransaction.tsx` | Form nueva transacción |

**NUNCA** leer `versiones_anteriores/vanilla-js-backup/` — son archivos deprecated de 50KB+ sin relevancia.

---

## DISCIPLINA DE TOKENS — REGLAS VINCULANTES

### Jerarquía antes de actuar (estricta)
1. ¿Responde con lo que ya está en contexto? → responde, no ejecutes.
2. ¿Necesito leer? → solo si es imposible sin ello.
3. ¿Necesito web? → solo si el dato es externo/temporal y el prompt contiene `[WEB]`.
4. ¿Necesito conector? → solo si la tarea opera explícitamente sobre datos vivos de ese servicio.
5. ¿Chrome/Cowork/Agent? → último recurso.

### Prohibiciones absolutas
- ❌ Releer archivo ya presente en contexto de esta sesión
- ❌ Búsqueda web sin tag `[WEB]` en el prompt
- ❌ Activar MCP/conector sin mención explícita
- ❌ Leer `versiones_anteriores/` salvo restauración
- ❌ Leer `context/chat_*.txt` anteriores si `MORNING_BRIEF.md` existe y es ≤24h
- ❌ Ejecutar `Agent` sin agotar primero Read/Grep/Glob directos

### Obligaciones
- ✅ Antes de Read → verificar si el dato ya está en contexto o en MORNING_BRIEF
- ✅ Reportar redundancia detectada al usuario (auto-monitoreo)
- ✅ Si detectas gasto inusual → avisar con estimado antes de ejecutar

### Modelo recomendado por tipo de tarea
Antes de cada planeación o tarea nueva, anunciar en 1 línea:
> 📊 **Modelo recomendado: [Haiku 4.5 / Sonnet 4.6 / Opus 4.7]** — [razón corta]

Guía de selección:
- **Haiku 4.5** → mecánicas: SW bumps, find-and-replace, snapshots, correr scripts ya escritos, lecturas puntuales
- **Sonnet 4.6** → implementación con criterio: features CSS/HTML/JS con referencia, refactors, debugging común, re-tematización
- **Opus 4.7** → razonamiento crítico: arquitectura mayor, debugging profundo (concurrencia/race conditions), planning multi-fase, decisiones top-3

Incluir `📊 Modelo: [X]` en el prompt de continuación de SESSION.md para que la sesión siguiente arranque con el modelo correcto.
Nota: el cambio de modelo lo ejecuta Anthony con `/model [nombre]` — no es automático.

### Trabajo en equipo — tareas manuales paralelas
Cuando hay acciones que Anthony puede ejecutar mientras Claude trabaja → indicarlas con:
> 🤝 **PUEDES HACER EN PARALELO:** [instrucción exacta 1-3 pasos]

Aplica para: deploys `wrangler`, verificaciones DevTools/SW, checks en browser, Supabase dashboard.
Esta regla maximiza eficiencia: Anthony y Claude trabajan simultáneamente sin esperar.

### Umbrales de contexto (activados cuando usuario reporta %)
- ≥25% → "⚠ Contexto al X%. Recomiendo cerrar pronto."
- ≥30% → actualizar MORNING_BRIEF con pendiente + generar prompt continuación + sugerir `/close`

---

## PROTOCOLO INICIO DE SESIÓN ("arranca" o "continúa")

Orden único y obligatorio:
1. Leer `CLAUDE.md`
2. Leer `MORNING_BRIEF.md` (si existe y ≤24h) — resume estado de la noche
3. Leer `CONTEXT_ROUTE.md` — decide qué más cargar según la tarea
4. Confirmar: "Contexto cargado. Listo."

**NO leer** `context/chat_*.txt` anteriores — MORNING_BRIEF ya los consolida.

---

## HIGIENE DE SESIÓN

### Autosave continuo
- Cada 3 mensajes con código → actualizar `SESSION.md` silenciosamente
- Cada bloque de ≥3 edits → append checkpoint a `context/chat_<fecha>.txt`
- Antes de editar ≥3 archivos críticos → snapshot a `versiones_anteriores/`

### Cierre controlado
- Usuario reporta ≥25% → avisar
- Usuario reporta ≥30% o llega a 10 mensajes → `/close` + prompt de continuación en `SESSION.md`
- Si `.claude/session_active.flag` existe al iniciar → advertir sesión interrumpida, retomar desde último CHECKPOINT

---

## NOCTURNO — TRIGGERS AUTOMÁTICOS

Ejecutan 1am-5am mientras Anthony duerme. Laptop prendida, Claude Code abierto.

### Alcance permitido (solo lectura sobre `version_actual/`)
- Escribir en: `nocturno/`, `propuestas/`, `versiones_anteriores/`, `context/`
- Escribir en `MORNING_BRIEF.md`, `SESSION.md`, `BUGS.md`, `PENDIENTES.md`

### Prohibiciones absolutas nocturnas
- ❌ Modificar `version_actual/*`
- ❌ `wrangler` (deploy)
- ❌ SQL a Supabase producción (ni SELECT)
- ❌ Conectores (Gmail, Calendar, Chrome, Cowork)
- ❌ Búsqueda web
- ❌ `git push` a main

### Triggers configurados
| # | Hora | Tarea | Output |
|---|---|---|---|
| T01 | 01:07 | Inventario ejecución real | `nocturno/INVENTARIO.md` |
| T02 | 02:07 | Mapa globals + dependencias | `nocturno/DEPS.md` |
| T03 | 03:07 | Caza duplicación funciones | `nocturno/DUPLICADOS.md` |
| T04 | 04:07 | Auditoría secretos | `nocturno/SECURITY.md` |
| T05 | 05:07 | Gap UX vs zip referencia | `nocturno/UX_GAPS.md` |
| T06 | 05:47 | Cierre + MORNING_BRIEF | `MORNING_BRIEF.md` regenerado |

Cada trigger lee `nocturno/CHECKPOINT.md` al iniciar para continuar si el anterior murió. Atomización y checkpoint garantizan resumabilidad.

---

## REGLAS IRROMPIBLES DE PRODUCCIÓN

### Deploy
1. Bump `CACHE_VERSION` en `service-worker.js` + `SW_EXPECTED_VERSION` en `sw-loader.js`
2. Módulo nuevo → script en `index.html` + `PRECACHE_URLS` + bump SW (los 3 o ninguno)
3. Deploy: `wrangler pages deploy version_actual/ --project-name finanzasapp`
4. **PAUSAR después de cada deploy**. Esperar que Anthony diga "verifica" o similar.
5. NUNCA continuar automáticamente (ni verificar, ni abrir Chrome, ni re-deployar)
6. Verificación incógnito la inicia Anthony, no Claude

### Negocio
- Transacciones **INMUTABLES**: soft-delete + recrear. Jamás UPDATE de monto/tipo
- Transferencias: par `TRANSFER_DEBIT + TRANSFER_CREDIT` con `pair_id` compartido
- Cuentas `DEBT` excluidas del balance total
- Montos en **USD internamente**, conversión VES solo al mostrar
- Queries: **NUNCA** `currentUser.id`. Siempre `resolveHouseholdId()`
- Timezone: UTC-4 vía `localISODate()`
- `service_role` key: SOLO Worker Secrets. NUNCA frontend
- Bot Telegram: `fuente='telegram'` en movimientos

### Diagnóstico (antes de codificar)
- Escribir causa raíz en 1 línea
- Error nuevo → formato: ARCHIVO + ERROR EXACTO + LÍNEA
- NUNCA diagnosticar sin mensaje de consola literal

---

## /report
Generar sin herramientas externas:
```
REPORTE DE EFICIENCIA DE TOKENS
================================
Tool calls: [N]   Archivos leídos: [lista]
Conectores: [lista]   Búsquedas web: [N]
Redundancias detectadas: [desc]
Mayor fuente de consumo: [causa]
Recomendaciones: [acciones]
```

---

## MÓDULOS REACT APP (version_actual/react-app/src/)
> Vanilla JS DEPRECATED 2026-05-26 — movido a versiones_anteriores/vanilla-js-backup/

### Pages (32 rutas)
| Página | Ruta | Descripción |
|---|---|---|
| Home | / | Dashboard, KPIs, recharts |
| Txn | /txn | Lista movimientos |
| Accounts | /accounts | Lista cuentas |
| AI | /ia | Asistente IA (Groq) |
| More | /more | Menú más |
| Settings | /settings | Configuración general |
| NewTransaction | /new-txn | Formulario nueva transacción |
| AccountDetail | /accounts/:id | Detalle cuenta |
| TxnDetail | /txn/:id | Detalle transacción |
| NewAccount | /new-account | Crear cuenta |
| Transfer | /transfer | Transferencia entre cuentas |
| Pareja | /pareja | Invite flow + household members |
| Calendar | /calendar | Google Calendar sync UI |
| DineroFuera | /dinero-fuera | Me deben / Yo debo |
| Notificaciones | /notificaciones | Alertas programadas |
| Analisis | /analisis | Gráficas y análisis |
| Fire | /fire | Calculadora FIRE |
| Metas | /metas | Objetivos financieros |
| Monedas | /monedas | Tasas de cambio |
| Calculadora | /calculadora | Calculadora |
| Escanear | /escanear | OCR recibo (Groq) |
| VozTxn | /voz | Transacción por voz |
| Buscar | /buscar | Búsqueda transacciones |
| CsvImport | /csv-import | Importar CSV |
| Exportar | /exportar | Exportar datos |
| Recurrentes | /recurrentes | Gastos recurrentes |
| ListaCompras | /lista-compras | Lista de compras |
| Onboarding | /onboarding | Registro/primer uso |
| Login | /login | PIN keypad |
| settings/* | /settings/* | Profile, Categories, Budgets, Appearance, Security, Tipos, Subcategorias |

## ARQUITECTURA EDGE / BACKEND
```
Edge Functions (Supabase):
  telegram-bot-webhook v7 | vapid-push v4 | google-oauth v1
  google-calendar-sync v3 | gmail-reports v1

Cloudflare Worker: telegramcron → scheduled_notifications → Telegram
  Secrets: TELEGRAM_BOT_TOKEN | SUPABASE_URL | SUPABASE_SERVICE_KEY
```

## SKILLS ACTIVOS (.claude/skills/)
`bugfix` `sw-bump` `deploy` `post-deploy-verify` `app-core-refactor` `supabase-read` `supabase-monitor` `github-commit` `tokens-css` `session-close` `redes-sociales`

---

## ARCHIVOS DE ESTADO (complementan a CLAUDE.md)
- `MORNING_BRIEF.md` — estado diario tras triggers nocturnos
- `CONTEXT_ROUTE.md` — qué leer según tarea
- `PENDIENTES.md` — lista priorizada
- `BUGS.md` — detalle de bugs activos
- `SESSION.md` — última sesión + próximo paso
- `NEGOCIO.md` — monetización (no ejecución)
- `SUPABASE_SCHEMA.md` — **schema cache** de Supabase (tablas, columnas, queries de referencia). Consultar SIEMPRE antes de queries/features. Si código contradice → re-query MCP + actualizar el doc en el mismo cambio. Evita gastar tokens releyendo BD.

---
*Versión: 18 May 2026 — React App v1.0.3-bugfix añadida (31 rutas, Supabase real, reglas críticas)*
