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
```
Vanilla JS + HTML + CSS | SIN React | SIN bundler | PWA offline-first
Supabase: jcgoccaisemrfsuwwrrl | Cloudflare Pages: finanzasprueba.pages.dev
Proyecto Cloudflare: finanzasapp
Dual-currency USD/VES | RLS activo
```

---

## FUENTE DE VERDAD
- `version_actual/` — fuente única desde 13 Abr 2026
- `versiones_anteriores/` — ignorar salvo restauración explícita
- Supabase — solo tablas de la app, no dev management

## ARCHIVOS CLAVE
| Archivo | Tamaño | Nota |
|---|---|---|
| app-core.js | 318KB ~76K tokens | **NUNCA leer completo** — rangos específicos |
| index.html | 200KB | SPA principal |
| app-features.js | 106KB | Telegram UI |
| app-analytics.js | 148KB | KPIs, Chart.js, FIRE |
| app-smart.js | 98KB | Groq IA, OCR |
| app-cuentas.js | 53KB | Cuentas CRUD, transferencias |
| styles.css | 132KB | — |
| service-worker.js | 6.4KB | CACHE_VERSION actual: `finanzas-v59-batch54` |
| sw-loader.js | 3.6KB | SW_EXPECTED_VERSION actual: `finanzas-v59-batch54` |

Detalle de módulos split → tabla completa al final.

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

## MÓDULOS JS (version_actual/)
| Archivo | Tamaño | Contenido |
|---|---|---|
| app-core.js | 318KB | Auth, sesión, loadFromSupabase, dashboard, estado global |
| app-features.js | 106KB | Telegram UI, chat interface |
| app-analytics.js | 148KB | KPIs, Chart.js, FIRE |
| app-smart.js | 98KB | Groq IA, OCR, categorización |
| app-cuentas.js | 53KB | Cuentas CRUD, transferencias |
| app-budget.js | — | Presupuestos, recurring, travel mode |
| app-export.js | — | XLSX/PDF export, email backup |
| app-pwa.js | — | WebAuthn, PIN lock, offline queue |
| gcal-integration.js | 7KB | Google Calendar sync |
| init.js | — | Bootstrap auth + onAuthStateChange |
| globals-init.js | — | Declaración globals (`var`) |
| notificaciones-panel.js | — | Panel notifs |

**Regla de scope:** globals compartidos entre módulos DEBEN ser `var` top-level (no `let`, que es script-scoped).

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

---
*Versión: 18 Abr 2026 — consolidación post-depuración*
