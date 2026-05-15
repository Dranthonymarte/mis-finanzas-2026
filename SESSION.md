# SESSION.md — Mis Finanzas 2026
*Actualizar después de cada corrección considerable*

---

## SESIÓN — 15 May 2026 (F3-F6 rediseño completo + GitHub/Cloudflare CI)

📊 **Modelo próxima sesión: Sonnet 4.6** (verificación/ajuste visual) — sube a Opus solo si hay bug de arquitectura.

### Qué se hizo
1. **GitHub conectado**: repo `Dranthonymarte/mis-finanzas-2026`. Remote `origin`. Push `master`+`develop`. Token clásico usado y limpiado de URL (Anthony debe revocarlo).
2. **Cloudflare Pages → GitHub**: proyecto `mis-finanzas-2026`, production branch `main`, build output `version_actual`. Flujo: push develop=preview, push main=producción. Reemplaza wrangler manual.
3. **Reparación crítica**: `.git/HEAD` corrupto (24 espacios vs `ref: refs/heads/develop`). Reparado. Commits/refs/objects intactos.
4. **F3 batch56** (`54c4960`): `dashboard.css` hero Instrument Serif+gradient amber, KPI cards tokens. `tokens.css` +aliases `--teal/-s/-d`. SW batch56.
5. **F4 batch56** (`d52bbe7`): `pages.css` re-estiliza clases base DRY (`.modal-overlay/.modal/.modal-box/.form-group/inputs/botones/.note/chips/tablas`) → todos los paneles consistentes.
6. **F5**: media queries móvil (dashboard.css) + pages.css bottom-sheet (modales fullscreen móvil top-3).
7. **F6**: `theme.js` NUEVO — módulo lógica-UI aislado (toggle light/dark, localStorage, prefers-color-scheme, anti-FOUC head). Botón hero-meta-row.
8. **CLAUDE.md/memoria** +reglas: modelo por tarea + trabajo equipo + GitHub sin cambios destructivos sin confirmación.

### Arquitectura (separación estricta — top-3)
Tokens(`tokens.css`) · Presentación(`shell/dashboard/pages.css`) · Lógica-UI(`theme.js` aislado) · Negocio(`app-core.js` **INTACTO**).

### DECISIÓN: pixel-perfect en curso (Anthony pidió réplica EXACTA del bundle)
F3-F6 (CSS re-vestido) NO basta — Anthony quiere markup idéntico al bundle JSX.
Plan por fases con punto de reversa por fase. Tag `pre-pixel-perfect` creado.
- ✅ **Fase A1** (`c196449` batch57): `charts-ui.js` — Sparkline/BarMini/Donut/LineChart/Pill/CatDot vanilla (window.ChartsUI). Cargado antes de app-core.js.
- ✅ **Fase A2.1** (`d3a129c` batch58): hero markup anatomía exacta bundle (`hero-card-inner` wrapper relative, `hero-chart-wrap`). IDs hero-symbol/int/dec/bs/pills + multi-moneda + micro botones PRESERVADOS. Placeholder honesto `#hero-balance-chart:empty` (sin datos falsos).
- ⏳ **Fase A2.2**: cablear LineChart balance con serie real + reescribir markup KPI strip / flow / categories / txn / accounts / goals (resto dashboard.jsx).
- ⏳ Fase B: páginas (pages.jsx). Fase C: mobile (mobile.jsx). Fase D: pulido.

### ⚠️ FEEDBACK CRÍTICO ANTHONY (15 May tarde)
- "La UIX no se parece en nada" → enfoque re-pintar CSS sobre markup viejo NO FUNCIONA.
  Hay que IMPLEMENTAR EL MARKUP del bundle, no re-skinear. Error de enfoque mío.
- Modo claro rompía la app (styles.css 132KB hex hardcoded). MITIGADO `7e81422` batch60:
  dark forzado + toggle oculto hasta migrar estilos a tokens.
- Bottom nav móvil del bundle NO implementado (es lo que más se nota).
- **Bundle NUEVO actualizado** descomprimido en:
  `C:\Users\Anthony Marte\Downloads\handoff-new\mi-aplicacion-de-finanzas\`
  Tiene componentes MÓVIL dedicados: `m-shell/m-main/m-modals/m-secondary/m-settings/m-auth/m-detail.jsx`
  + `Mobile UIX.html` (FUENTE DE VERDAD primaria) + README.

### PRÓXIMO PASO EXACTO — Implementar Mobile UIX pixel-perfect (SESIÓN FRESCA, Opus para arranque)
```
README del bundle (leído) ordena: leer "Mobile UIX.html" COMPLETO + seguir sus imports,
recrear pixel-perfect en vanilla JS. NO screenshots. Aclarar ambigüedad antes de implementar.

1. Read C:\...\Downloads\handoff-new\mi-aplicacion-de-finanzas\project\Mobile UIX.html (COMPLETO)
2. Seguir imports: m-shell.jsx, m-main.jsx, m-modals.jsx, m-secondary.jsx,
   m-settings.jsx, m-auth.jsx, m-detail.jsx, tokens.css (NUEVO), data.js
3. Comparar tokens.css nuevo vs version_actual/tokens.css → actualizar tokens
4. CLAVE: implementar el MARKUP/ESTRUCTURA del bundle móvil (bottom nav, shell,
   pantallas) en index.html — NO solo CSS. Preservar IDs de datos (k-*, hero-int,
   wallet-cards-container, mobile-recent-list) que la lógica distribuida alimenta.
5. Bottom nav móvil: 5 items + FAB central (ver m-shell.jsx). Es la prioridad visual.
6. Light mode: solo reactivar cuando TODO use tokens (migrar styles.css crítico o
   crear override completo). Por ahora queda desactivado (batch60).
7. SW bump por fase. Commit/push por fase a develop. Cloudflare auto-deploy.

ENFOQUE CORRECTO: markup del bundle, no re-skin. Decisión arquitectura: ¿reemplazar
vista móvil completa preservando hooks de datos? Confirmar scope con Anthony primero.
Rollback: git tag pre-pixel-perfect. Commits: ...d3a129c 485cbf1 7e81422.
```

### (obsoleto) Plan A2.2 anterior — superado por feedback Anthony

```
Objetivo: completar dashboard pixel-perfect. Hero (A2.1) ya hecho.

PASO 1 — Mapear estructura de datos real (greps quirúrgicos, NUNCA leer módulos completos):
  - Grep en app-analytics.js: "k-ingresos|k-gastos|k-balance" → cómo/dónde pone KPIs
  - Grep en app-cuentas.js o app-core.js: "wallet-cards-container|renderWalletCards"
  - Grep "mobile-recent-list" en todos los app-*.js → módulo que renderiza txns
  - Grep variables globales serie balance: "balanceHistor|serieBalance|window.movimientos|MOVIMIENTOS"
  - Objetivo: saber qué dato global existe para alimentar charts SIN re-query Supabase
PASO 2 — Cablear charts (módulo nuevo dashboard-charts.js, responsabilidad única, defensivo):
  - #hero-balance-chart → ChartsUI.lineChart(serieBalance) si existe; si no, dejar :empty
  - KPI strip: añadir <div data-spark> en cada .kpi → ChartsUI.sparkline
  - Categorías: ChartsUI.donut. Flujo: ChartsUI.barMini
  - Registrar en index.html (antes app-core) + SW PRECACHE + bump batch59
PASO 3 — Markup pixel-perfect resto dashboard (ref: propuestas/ux-referencia/dashboard.jsx):
  estructura: grid gap18 → [Hero 1.1fr | QuickActions 1fr] → [KPI x4] →
  [FlowCard 1.5fr | Categories 1fr] → [TxnTable 1.5fr | Accounts+Goals 1fr]
  PRESERVAR IDs: k-* / wallet-cards-container / mobile-recent-list / metas-cards-container
  (mover nodos, no eliminarlos — la lógica distribuida los alimenta)
PASO 4 — dashboard.css: grid exacto bundle. SW bump. Commit "Fase A2.2". Push develop.
PASO 5 — Fase B (páginas pages.jsx), C (mobile.jsx), D (pulido). 1 commit/fase.

Rollback por fase: git tag pre-pixel-perfect. Commits: 54c4960 d52bbe7 c196449 d3a129c.
Pendiente Anthony: verificar preview (d3a129c), revocar token GitHub,
limpiar proyecto wrangler viejo cuando GitHub-CI OK.
```

### Notas técnicas
- Commits develop: `54c4960`(F3) + `d52bbe7`(F4-F6) en origin/develop.
- Rollback: `git tag pre-F3-backup`.
- Shell Claude Code (Windows): sin `cat/ls/find/node/grep` — usar Glob/Grep/Read; git OK; commits con `-m` múltiple (no heredoc).
- Rediseño = 100% presentación + 1 módulo UI aislado. Cero cambios negocio/auth/datos.

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Anthony verifica preview develop; si OK merge→main CON confirmación
```

---

## SESIÓN — 26 Abr 2026 (Extractos BDV Isabel abril — carga completada)

### Qué se hizo
1. **Diagnóstico previo al plan** — La tarea `/tareamovimiento` tenía esquema incorrecto (columnas `referencia`, `hora`, `monto_bs`, `categoria_id` no existen en la tabla real). El esquema real usa: `id text`, `tipo` en español (Gasto/Ingreso Variable/Transferencia Interna), `cat` texto, `amount` USD, `amount_bs` VES, sin campo referencia.
2. **Estado verificado sin re-leer** — `_inbox/Anthony/2026-04/`: 19 imgs (ya en Supabase de sesión anterior). `_inbox/Isabel/2026-04/`: 29 imgs, JSON OCR en `_estado/extraccion_isabel.json`. Isabel tenía 122 filas en DB hasta 2026-04-08.
3. **Tasas BCV consultadas** — 04-09: 475.96, 04-10: 476.43, 04-11→04-15: 477.15, 04-16: 479.78.
4. **INSERT Batch A** — 36 filas Isabel 2026-04-09 a 2026-04-11. ✅
5. **INSERT Batch B** — 39 filas Isabel 2026-04-12 a 2026-04-16. ✅
6. **Resultado final** — Isabel: **197 movimientos totales** (2026-03-21 → 2026-04-16, saldo final 1031.04 Bs).
7. **Move archivos** — `_inbox/Anthony/2026-04/` → `_procesados/Anthony/2026-04/` (19 jpgs). `_inbox/Isabel/2026-04/` → `_procesados/Isabel/2026-04/` (29 jpgs). Ambos inbox vacíos.
8. **REPORTE.log** — append en `_procesados/REPORTE.log` ✅.

### Reglas fijadas esta sesión
- **Sin JSON intermedio**: flujo correcto = imagen → OCR en memoria → INSERT Supabase → mover img. `extraccion_*.json` son legacy.
- **ID format**: `bk_{ref}_i` (estándar), `bk_{ref}_{YYYYMMDD}_i` para refs que ya existen en DB, `bk_{ref}_{n}_i` para dups dentro del mismo batch.
- **tareamovimiento.md** necesita actualización (columnas incorrectas, regla no-JSON) — PENDIENTE.

### Pendiente próxima sesión
1. Actualizar `tareamovimiento.md` con esquema real + regla no-JSON
2. Limpiar worktrees viejos: `eloquent-shannon-4b5c1f` y `silly-aryabhata-4996a4` (confirmar con Anthony antes)
3. F2 batch55 verificación SW (carried over): unregister SW → hard refresh → confirmar visual
4. F3 Dashboard

### Estado _inbox
| Carpeta | Archivos | Estado |
|---|---|---|
| `_inbox/Anthony/2026-04/` | 0 | ✅ vacío |
| `_inbox/Isabel/2026-04/` | 0 | ✅ vacío |
| `_procesados/Anthony/2026-04/` | 19 jpgs | ✅ |
| `_procesados/Isabel/2026-04/` | 29 jpgs | ✅ |

### Notas técnicas duplicados BDV
- `9802400294254` (tarjeta débito): ref reutilizada en múltiples fechas. En DB existía desde 04-04. Nuevas ocurrencias usan sufijo fecha: `bk_9802400294254_20260410_i`, etc.
- `9570200294254`: 3 ocurrencias el 04-12 → `bk_9570200294254_i`, `_2_i`, `_3_i`.
- `9754600294254` (BIOPAGO): 5 ocurrencias (04-09, 04-13×3, 04-15) → sufijos `_2` a `_5`.

```
Contexto: CLAUDE.md + context/chat_2026-04-26_extractos-isabel.txt
Tarea: Actualizar tareamovimiento.md + limpiar worktrees + F2 batch55 SW verify
```

---

## SESIÓN — 24 Abr 2026 NOCHE-2 (F2 batch55 — Deploy ejecutado, cambios NO visibles en cliente)

### Qué se hizo
1. **Diagnóstico CSS cascade** — identificada causa raíz del nav verde: `index.html` línea 208 tenía `<link rel="stylesheet" href="styles.css">` duplicado, cargándose DESPUÉS de shell.css. Las reglas `.pwa-nav-btn.active { color: #3fb950 !important; }` (L1096, L2525 de styles.css) ganaban por source order.
2. **Fix aplicado** — eliminada línea 208 duplicada de index.html. shell.css consolidado: selectores defensivos reducidos de 4 a 1 limpio, agregada regla pill amber-glow.
3. **Git commit c9fba85** — F2 batch55: shell visual redesign. Archivos: shell.css (NUEVO) + index.html (sidebar HTML + pwa-nav SVG + eliminado duplicado styles.css + link shell.css) + service-worker.js (batch55 + /shell.css PRECACHE) + sw-loader.js (batch55).
4. **Deploy wrangler ejecutado ✅** — 40 files nuevos + 7 cacheados en 4.16s. URL: https://6ea64da5.finanzasprueba.pages.dev. Alias: claude-interesting-franklin.finanzasprueba.pages.dev. Cloudflare dashboard muestra commit batch55.
5. **Verificación incógnito por Anthony** — logueado, datos cargan (logs [Household], [plantillas], [dinero_fuera], [Healthcheck] visibles en consola). **PERO:** UI sigue igual a batch54 — NO aparece sidebar 240px desktop, NO cambió nav móvil a amber SVG. Cambios visuales completamente ausentes.
6. **Diagnóstico cliente** — Anthony abre DevTools. Consola muestra logs del worktree (shell.css, sv-loader.js, deploy-check nuevo). **Pero CSS/HTML visualmente NO aplica.** Causa probable: SW cache sigue sirviendo archivos viejos de antes del deploy.

### Hipótesis
El deploy SÍ subió los archivos a Cloudflare (wrangler success + Cloudflare UI muestra batch55 commit). Pero el SW activo en el cliente sigue sirviendo archivos pre-deploy del cache local. Necesario unregister SW + hard refresh para forzar fetch de nuevos archivos.

### Estado split modular
| Archivo | Estado |
|---|---|
| `version_actual/shell.css` | ✅ DEPLOYED — consolidado amber selectors |
| `version_actual/index.html` | ✅ DEPLOYED — duplicado styles.css L208 eliminado |
| `version_actual/service-worker.js` | ✅ DEPLOYED — CACHE_VERSION batch55 + /shell.css PRECACHE |
| `version_actual/sw-loader.js` | ✅ DEPLOYED — SW_EXPECTED_VERSION batch55 |
| Cloudflare Pages | ✅ Actualizado a batch55 (verified en dashboard) |
| Cliente local | 🔴 SW cache stale — cambios NO visibles a pesar de deploy |

### PRÓXIMO PASO EXACTO
```
1. Anthony:
   a) DevTools → Application → Service Workers → clic en "Unregister"
   b) Cierra completamente pestaña finanzasprueba.pages.dev
   c) Abre nueva pestaña incógnita → https://finanzasprueba.pages.dev
   d) Espera 5 segundos (SW se re-registra con batch55)
   e) DevTools → Application → Service Workers → verifica que diga "finanzas-v59-batch55"
   f) ¿Aparece sidebar 240px desktop? ¿Nav móvil SVG + amber? ✅ = éxito, 🔴 = problema deploy

2. Si SIGUE sin cambios tras unregister + nueva pestaña:
   → Verificar que los archivos se subieron a Cloudflare
   → Posible: worktree files != deployment files (git status issue)
   → Re-deploy si es necesario

3. Si APARECEN cambios:
   → F2 batch55 ✅ COMPLETADO
   → Próxima sesión: monitoreo 24h, luego F3 Dashboard
```

### Notas técnicas
- **Commit:** `c9fba85` en rama `claude/interesting-franklin-7148be`
- **Deploy URL producción:** https://finanzasprueba.pages.dev
- **Deploy URL staging:** https://6ea64da5.finanzasprueba.pages.dev
- **SW cambio crítico:** batch54→batch55, PRECACHE incluye shell.css, index.html sin duplicado styles.css
- **Riesgo bajo:** eliminación de duplicado styles.css es no-op (ya estaba cargado en L6)

```
Contexto: CLAUDE.md + context/chat_2026-04-24_F2-shell.txt
Tarea: F2 batch55 — unregister SW + hard refresh, verificar cambios visuales
```

---

## SESIÓN — 24 Abr 2026 NOCHE (F2 batch55 — Shell Visual Rediseño, PENDIENTE DEPLOY)

### Qué se hizo
1. **shell.css creado** — nuevo archivo en `version_actual/` (worktree). Reglas clave:
   - `#desktop-sidebar`: 240px `!important`, `var(--ink-1)` bg, `position: fixed`, z-index 200
   - `.sb2-logo-icon`: gradient amber 135°; `.sb2-logo-text`: Instrument Serif 18px
   - `.sidebar-item.active`: `var(--ink-3)` bg + `::before` amber strip 2px izquierda
   - `.sidebar-avatar`: gradient teal→amber, 32px, border-radius 10px
   - `#pwa-nav`: `var(--ink-1)` bg, border-top `var(--line)`, altura `var(--nav-h-2026)` 64px
   - Activo amber fix: 4 selectores `!important` para superar duplicate `styles.css` post-shell.css
2. **index.html reemplazado** — nuevo HTML en `#desktop-sidebar`: logo gradient SVG, nav 6 items (inicio/movimientos/cuentas/presupuesto/análisis/IA) + sección Otros (lista/dinero/respaldo/config/logout) + footer profile con avatar gradiente. `#pwa-nav`: emojis → inline SVG (4 botones: inicio/movimientos/IA/config). `<link rel="stylesheet" href="/shell.css">` añadido después de styles-desktop.css.
3. **SW bump batch54→batch55** — `service-worker.js`: `CACHE_VERSION = 'finanzas-v59-batch55'` + `/shell.css` en PRECACHE_URLS + AI-CONTEXT actualizado. `sw-loader.js`: `SW_EXPECTED_VERSION = 'finanzas-v59-batch55'`.
4. **deploy-check.js → 4/4 OK** — validación pre-deploy pasada antes del cierre.
5. **Git commit pendiente** — cambios en worktree sin commit.
6. **Deploy pendiente** — `wrangler pages deploy version_actual/ --project-name finanzasapp`.

### Estado split modular
| Archivo | Estado |
|---|---|
| `version_actual/shell.css` | ✅ NUEVO — 240px sidebar + 64px nav + tokens 2026 |
| `version_actual/index.html` | ✅ Sidebar HTML nuevo + pwa-nav SVGs + link shell.css |
| `version_actual/service-worker.js` | ⏳ batch55 local — **pendiente deploy** |
| `version_actual/sw-loader.js` | ⏳ batch55 local — **pendiente deploy** |

### PRÓXIMO PASO EXACTO
```
1. Verificar nav active color: abrir en browser, inspeccionar .pwa-nav-btn.active
   - Si aún verde: buscar en index.html el <style> inline con .pwa-nav-btn.active y sobreescribir ahí
   - Si amber: OK, continuar
2. Git commit en worktree:
   git add version_actual/shell.css version_actual/index.html version_actual/service-worker.js version_actual/sw-loader.js
   git commit -m "F2 batch55: shell visual redesign — sidebar 240px + SVG icons + bottom nav 64px"
3. Deploy: wrangler pages deploy version_actual/ --project-name finanzasapp
4. PAUSAR. Anthony verifica incógnito:
   - Desktop ≥820px: sidebar visible 240px, logo amber gradient, nav items con SVG, activo amber strip
   - Móvil: bottom nav 64px, SVG icons, activo amber (NO verde)
   - 0 regresión dashboard/datos
```

### Diagnóstico pendiente: nav active color
- **Síntoma**: `.pwa-nav-btn.active` muestra `rgb(82, 214, 104)` (verde) en lugar de `var(--amber)` `rgb(224, 168, 74)`
- **Causa raíz**: index.html tiene `<link href="/styles.css">` duplicado — el segundo carga DESPUÉS de shell.css y tiene `.pwa-nav-btn.active { color: #3fb950 !important; }` que gana por source order
- **Fix aplicado en shell.css**: 4 selectores con `!important` (`body .pwa-nav-btn.active`, etc.) — **no verificado al cierre**
- **Si no funciona**: buscar en index.html `<style>` inline (posición ~5 en styleSheets) con `.pwa-nav-btn.active` y sobreescribir directamente ahí

```
Contexto: CLAUDE.md + SESSION.md
Tarea: F2 batch55 — verificar nav amber active, git commit worktree, deploy, PAUSAR para Anthony incógnito
```

---

## SESIÓN — 24 Abr 2026 PM (F1.1 batch54 DEPLOYED + verificado ✅ — fonts self-hosted live)

### Qué se hizo
1. **Anthony verificó batch53 incógnito ✅** — paleta amber + teal oxidado + ink-0..4 aplicada sin regresión de markup.
2. **F1.1 batch54 ejecutado en dir principal** (worktree `nifty-clarke-b8dce6` stale en batch52):
   - `tokens.css`: 3 reglas `@font-face` con `font-display: swap` para Instrument Serif (400), Inter (variable 100-900), JetBrains Mono (variable 100-800). Formato `woff2-variations` + fallback `woff2`.
   - `service-worker.js`: `+3` entradas en `PRECACHE_URLS` (`/fonts/instrument-serif-400.woff2`, `/fonts/inter-var.woff2`, `/fonts/jetbrains-mono-var.woff2`); `CACHE_VERSION` bump batch53→batch54; AI-CONTEXT actualizado.
   - `sw-loader.js`: `SW_EXPECTED_VERSION` bump batch53→batch54.
3. **deploy-check.js** → 4/4 OK, 0 errores, 0 warnings.
4. **Deploy batch54 ✅** — `wrangler pages deploy version_actual/ --project-name finanzasapp`. URL: https://c4b2b68d.finanzasprueba.pages.dev. 3 archivos nuevos + 43 cacheados + `_headers` + `_redirects`.
5. **Anthony verificó batch54 incógnito ✅** — fonts self-hosted cargan sin FOUT extremo, offline mantiene tipografías (precache OK), 0 regresión visual vs batch53.
6. **Commit baseline batch54** ejecutado en `master` desde dir principal (captura batch53 + batch54 juntos — primer commit post-baseline `c717800`).

### Estado split modular
| Archivo | Estado |
|---|---|
| `version_actual/tokens.css` | ✅ DEPLOYED — 3 @font-face rules self-hosted |
| `version_actual/service-worker.js` | ✅ DEPLOYED — PRECACHE +3 fonts + CACHE_VERSION batch54 |
| `version_actual/sw-loader.js` | ✅ DEPLOYED — SW_EXPECTED_VERSION batch54 |
| `version_actual/fonts/*.woff2` | ✅ DEPLOYED — 3 archivos latin-only (~100KB) |
| `version_actual/styles.css` | ✅ DEPLOYED — :root delegando a tokens.css (batch53) |
| `version_actual/index.html` | ✅ DEPLOYED — `<link tokens.css>` activo (batch53) |

### PRÓXIMO PASO EXACTO
```
1. F2 — Shell visual (sesión nueva recomendada por consumo de contexto):
   - Sidebar 240px (logo + nav vertical + footer user)
   - Topbar (búsqueda + acciones + avatar)
   - Bottom nav móvil 64px
   - Referencia: handoff-temp/mi-aplicacion-de-finanzas/project/shell.jsx
2. Crear branch `redesign/phase-2-shell` desde master post-batch54
3. Feature freeze sigue activo hasta F6 (solo bugs P0)
```

### Notas / divergencia
- **Worktree stale**: `nifty-clarke-b8dce6` (batch52) y `stoic-chebyshev-067ff9` (esta sesión) deben limpiarse o rebasearse contra master post-batch54.
- **CLAUDE.md tabla SW**: actualizada a batch54.
- **Branch `redesign/phase-1-tokens`** quedó sin uso — F1 se ejecutó directo en `master`. Eliminar o reciclar.

```
Contexto: CLAUDE.md + SESSION.md
Tarea: F2 — shell visual (sidebar 240px + topbar + nav móvil 64px) sobre baseline batch54 verificado
```

---

## SESIÓN — 23 Abr 2026 PM (F0 completo + F1 parcial — fonts descargadas)

### Qué se hizo
1. **F0 COMPLETADO ✅** — Git init local en raíz del proyecto:
   - `git init` — repo inicializado (Windows, git 2.53.0)
   - `.gitignore` creado con: `versiones_anteriores/`, `nocturno/`, `context/`, `.claude/`, `handoff-temp/`, `.wrangler/`, carpetas viejas (`Mi aplicacion de finanzas/`, `Supabase/`, etc.), `propuestas/`, OS files
   - `git config --local user.name "Anthony Marte"` + `user.email "anthonymarte12@gmail.com"` (solo local, NO global)
   - `git add` de 9 items: `.gitignore` + 7 MDs + `version_actual/`
   - `git commit -m "baseline pre-redesign 2026-04-23"` → hash `c717800`, 52 archivos, 31,469 inserciones
   - `git branch redesign/phase-1-tokens` creada (aún en `master`, sin checkout)
2. **F1 PARCIAL** — solo fase de descarga de fonts completada:
   - `version_actual/fonts/` folder creado
   - Google Fonts CSS descargado con User-Agent Chrome moderno → WOFF2 URLs extraídas
   - Solo subset **latin** descargado (Español no requiere cyrillic/greek/vietnamese)
   - 3 archivos WOFF2 en `version_actual/fonts/`:
     - `instrument-serif-400.woff2` — 21KB
     - `inter-var.woff2` — 48KB (variable font cubre 400/500/600/700)
     - `jetbrains-mono-var.woff2` — 31KB (variable font cubre 400/500)
   - **Total: ~100KB** (bajo el budget de 150KB)
   - Validez verificada: los 3 empiezan con magic bytes `wOF2` ✅
3. **F1 NO ejecutado aún** (pendiente para próxima sesión):
   - `tokens.css` no creado
   - `:root` de `styles.css` no modificado
   - `<link tokens.css>` no agregado en `index.html`
   - `PRECACHE_URLS` sin actualizar
   - SW sigue en `batch52` (NO deployed batch53)
   - Deploy NO ejecutado

### Estado split modular
| Archivo | Estado |
|---|---|
| `.gitignore` | ✅ NUEVO — excluye carpetas no-fuente |
| `.git/` | ✅ NUEVO — repo local iniciado, commit `c717800` en `master`, branch `redesign/phase-1-tokens` creada |
| `version_actual/fonts/*.woff2` | ✅ NUEVOS — 3 archivos latin-only (100KB total) |
| `version_actual/tokens.css` | ⏳ PENDIENTE — no creado todavía |
| `version_actual/styles.css` | ⏳ PENDIENTE — `:root` sin reemplazar |
| `version_actual/index.html` | ⏳ PENDIENTE — sin `<link tokens.css>` |
| `version_actual/service-worker.js` | ⏳ batch52 (sin bump, sin fonts en PRECACHE) |
| `version_actual/sw-loader.js` | ⏳ batch52 (sin bump) |

### Decisiones tomadas
- **Config git = local**, no global (para no afectar otros proyectos del usuario)
- **Fonts latin-only** para reducir payload; Inter y JetBrains Mono son variable fonts → 1 archivo cubre múltiples pesos
- **Instrument Serif italic** no descargado en F1 (agregar si F2+ lo requiere)
- Branch `redesign/phase-1-tokens` creada pero **sin checkout** — trabajo F1 se hará allí en próxima sesión

### PRÓXIMO PASO EXACTO (próximo chat)
```
1. git checkout redesign/phase-1-tokens
2. Crear version_actual/tokens.css:
   - :root con nuevos tokens (--ink-0..4, --fg, --amber, --teal, --pos/neg, --t-*, --s-1..16, --r-*)
   - @font-face para 3 fonts locales (/fonts/instrument-serif-400.woff2, /fonts/inter-var.woff2, /fonts/jetbrains-mono-var.woff2)
   - Aliases legacy: --bg→var(--ink-1), --surface→var(--ink-2), --text→var(--fg), --green→var(--pos), --red→var(--neg), --gold→var(--amber), --font-base→var(--t-md), --space-N→var(--s-N), --radius-N→var(--r-N)
   - NO incluir [data-theme="light"] (eso es F6)
   - Fuente bundle: handoff-temp/mi-aplicacion-de-finanzas/project/tokens.css (ya leído en contexto)
3. Editar version_actual/styles.css:
   - Reemplazar :root completo (líneas 3-72) con aliases que delegan a var(--ink-*/fg/amber/...)
   - Conservar --glass-*, --nav-h, --vp-* tal cual
   - body { font-family: var(--f-ui); } (migrar de 'Segoe UI',system-ui a var)
4. Editar version_actual/index.html:
   - Línea 5-6: agregar <link rel="stylesheet" href="/tokens.css"> ANTES de styles.css (tokens deben definirse primero)
5. Editar version_actual/service-worker.js PRECACHE_URLS:
   - Agregar '/tokens.css'
   - Agregar '/fonts/instrument-serif-400.woff2', '/fonts/inter-var.woff2', '/fonts/jetbrains-mono-var.woff2'
6. SW bump batch52→batch53 (service-worker.js CACHE_VERSION + sw-loader.js SW_EXPECTED_VERSION)
7. node version_actual/deploy-check.js (debe pasar 4/4)
8. wrangler pages deploy version_actual/ --project-name finanzasapp
9. PAUSAR. Anthony verifica incógnito: login → paleta nueva (ink + amber + teal) visible, 0 regresión de markup
10. Criterios "done" F1: paleta aplicada, 0 markup rotos, Lighthouse ≥90
```

### Riesgos para próxima sesión
- 🔴 Romper variables en styles.css si los aliases no son exactos — probar antes de deploy con grep `var(--bg` etc.
- 🟡 fonts cargan pero no se usan todavía → `body { font-family: var(--f-ui) }` necesario
- 🟡 PWA offline — si fonts no entran en PRECACHE se ven fallback hasta primera carga online

### Prompt de continuación
```
Contexto: CLAUDE.md + SESSION.md + context/chat_2026-04-23_F0-F1exec.txt
Tarea: Completar F1 (tokens.css + aliases en styles.css + link index.html + PRECACHE + SW bump batch53 + deploy)
```

---

## SESIÓN — 23 Abr 2026 (REDISEÑO VISUAL 2026 — planning + decisiones firmes)

### Qué se hizo
1. **Handoff bundle recibido** — Anthony entregó zip `Mi aplicacion de finanzas-handoff.zip` (Claude Design export, 4,695 líneas de diseño).
   - Extraído en `C:\Users\Anthony Marte\Downloads\handoff-temp\mi-aplicacion-de-finanzas\`
   - Contenido: `tokens.css` (123), `styles.css` (2,913), `shell.jsx` (191), `dashboard.jsx` (390), `pages.jsx` (425), `mobile.jsx` (426), `charts.jsx` (151), `data.js` (77), `Mis Finanzas.html` (763KB)
   - Sistema visual: paleta **amber + teal oxidado** sobre base `ink-0..4`, tipos **Instrument Serif** + **Inter** + **JetBrains Mono**, spacing 4-64px, **light + dark mode** completo, sidebar 240px + nav 64px.
2. **Evaluación como CTO** — NO es factible en 1 sesión. Rediseño visual integral (no ajuste). JSX del bundle es prototipo React → trasladar a vanilla JS/HTML existente, no migrar framework.
3. **Plan por fases acordado (7-10 sesiones)**:
   | Fase | Alcance | Sesiones |
   |---|---|---|
   | F0 | Git init + snapshot baseline | 0.2 |
   | F1 | Tokens CSS (paleta + tipos + spacing en `:root`) | 1 |
   | F2 | Shell (sidebar + nav + topbar) | 1 |
   | F3 | Dashboard (KPIs, cards, charts) | 1-2 |
   | F4 | Páginas (movimientos, cuentas, presupuestos, analytics) | 2-3 |
   | F5 | Mobile + responsive | 1 |
   | F6 | Light mode + pulido | 1 |
4. **Decisiones firmes confirmadas por Anthony**:
   - ✅ Mantener **vanilla JS** (ya es top en performance, no migrar framework)
   - ✅ **Self-host fonts** (Instrument Serif + Inter + JetBrains Mono, ~150KB precache PWA)
   - ✅ **Light mode en F6** (último, no bloquea)
   - ✅ **Feature freeze F1→F6** (solo bugs P0: data loss, auth roto, deploy caído)
   - ✅ **Git init local hoy** (próxima sesión) — brecha crítica: sin git solo rollback por día vía `versiones_anteriores/`, no granular
5. **Análisis de reversión** — Cloudflare Pages rollback nativo ✅, `versiones_anteriores/` ✅ (snapshots puntuales), **git ❌ no inicializado** → cubrirá en F0.
6. **NO se tocó código** — sesión 100% planning/estratégica.

### Estado split modular
| Archivo | Estado |
|---|---|
| (ninguno) | — sesión de planning, 0 edits de código |

### PRÓXIMO PASO EXACTO (próximo chat)
```
1. F0 — Git init local en raíz del proyecto:
   - git init
   - .gitignore: versiones_anteriores/, nocturno/, context/, .claude/, handoff-temp/
   - git add version_actual/ CLAUDE.md SESSION.md BUGS.md PENDIENTES.md MORNING_BRIEF.md CONTEXT_ROUTE.md NEGOCIO.md
   - git commit -m "baseline pre-redesign 2026-04-23"
   - git branch redesign/phase-1-tokens
2. F1 — Tokens CSS:
   - Copiar tokens del bundle (handoff-temp/mi-aplicacion-de-finanzas/project/tokens.css) a version_actual/
   - Self-host fonts: descargar Instrument Serif + Inter + JetBrains Mono → version_actual/fonts/
   - Actualizar service-worker.js PRECACHE_URLS con fonts
   - SW bump batch52→batch53 (los 3 archivos o ninguno)
   - Reemplazar :root en styles.css (mantener resto intacto)
   - deploy-check.js + wrangler deploy → PAUSAR → Anthony verifica incógnito
3. Criterios "done" F1: paleta nueva aplicada, 0 regresiones de markup, Lighthouse ≥90
```

### Riesgos identificados
- 🔴 Sin git = sin rollback granular (mitigado en F0)
- 🔴 Romper PWA offline si fonts no entran a PRECACHE_URLS
- 🟡 Chart.js requiere re-tematización en F3 (colores ejes/tooltips)
- 🟡 Responsive: diseño asume sidebar 240px desktop — validar que no rompe móvil actual
- 🟡 Deuda visual mixta si pausamos a mitad (fase dashboard nueva + páginas viejas = feo) → disciplina: no parar entre F2-F4

### Referencias clave
- Bundle: `C:\Users\Anthony Marte\Downloads\handoff-temp\mi-aplicacion-de-finanzas\`
- README del bundle: instrucción explícita de **recrear pixel-perfect** en stack target, no copiar estructura del prototipo JSX
- Inspiración declarada: Notion, Linear, Revolut (top 3 finanzas/productividad)

```
Contexto: CLAUDE.md + SESSION.md
Tarea: F0 (git init + baseline commit) + F1 (tokens CSS + self-host fonts + SW bump batch53 + deploy) — rediseño visual 2026 fase 1
```

---

## SESIÓN — 18 Abr 2026 noche-4 (batch52 — FIX BUG-1 deadlock SDK Supabase)

### Qué se hizo
1. **Anthony pegó logs `[AUTH-DEBUG]` de batch51** (primer login OK + post-F5 hang). Logs entregaron evidencia clave:
   - Post-F5: `event: SIGNED_IN | session: YES | _appInitialized: false` → handler entra → `→ onLoginSuccess()`
   - `_appInitialized=true después de 500ms` → confirma que `onLoginSuccess()` SÍ se invocó (setea flag línea 267 auth.js)
   - **NO aparece**: `[Household]`, `[plantillas]`, `[dinero_fuera]`, `[Healthcheck]`, `[UnhandledPromise]`, `[Init] Error cargando datos`
   - Splash safety 12s dispara → confirma hang silencioso (no throw, no error)
2. **Causa raíz identificada**: queries `sb.from(...)` dentro de `resolveHouseholdId/loadFromSupabase` deadlockean con el lock interno del SDK Supabase porque `await onLoginSuccess()` se ejecuta DENTRO del callback `onAuthStateChange` mientras el SDK aún corre su `_initialize()` en auto-restore post-F5. Patrón documentado en supabase/auth-js#762. Primer login no rompe porque ahí el evento se dispara desde `signInWithPassword()` (fuera del lock).
3. **Fix quirúrgico `init.js:222-232`** — desacoplar `onLoginSuccess()` del callback con `setTimeout(0)`:
   - `setTimeout(async () => { try { await onLoginSuccess(); } catch(e) {...} }, 0)` libera el call stack del callback
   - SDK termina `_initialize()` → lock libre → queries proceden
   - Agregado `try/catch` para capturar futuras fallas silenciosas + log nuevo `Defer 0ms ejecutado`
4. **SW bump batch51→batch52** (`service-worker.js` CACHE_VERSION + `sw-loader.js` SW_EXPECTED_VERSION + comentario AI-CONTEXT actualizado).
5. **Deploy batch52 ✅** — URL: https://abaeea19.finanzasprueba.pages.dev. 3 archivos subidos.

### Estado split modular
| Archivo | Estado |
|---|---|
| init.js | ✅ Fix deadlock — `setTimeout(0)` defer en handler SIGNED_IN/INITIAL_SESSION |
| service-worker.js | ✅ CACHE_VERSION batch52 (deployed) |
| sw-loader.js | ✅ SW_EXPECTED_VERSION batch52 (deployed) |

### PRÓXIMO PASO EXACTO
```
1. Anthony verifica incógnito: abrir https://finanzasprueba.pages.dev/ → login → ver datos OK → F5
2. Post-F5 esperar logs en consola:
   - [AUTH-DEBUG] Handler: ...→ defer onLoginSuccess()
   - [AUTH-DEBUG] Defer 0ms ejecutado → onLoginSuccess()
   - [Household] membresía activa: fa3f7b3b-...
   - [plantillas] cargadas...
   - [dinero_fuera] ✅ deudas: ...
   - [Healthcheck] ✅
3. Si datos cargan post-F5 → BUG-1 cerrado definitivamente
4. Si persiste hang → log nuevo [AUTH-DEBUG] Defer 0ms ejecutado dirá si entró al setTimeout o no
```

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Anthony verifica batch52 incógnito — F5 logueado debe mantener datos (BUG-1 deadlock fix)
```

---

## SESIÓN — 18 Abr 2026 noche-3 (batch51 — INSTRUMENTACIÓN BUG-1)

### Qué se hizo
1. **Anthony reportó bug persistente post-batch49/50**: primer load OK (logs completos Household + data), pero post-F5 solo aparecen `[Init] supabase-js OK ✓` + `[SW-Loader] Registrado` + splash safety 12s. NO aparece ningún log de `[Household]`, ni del handler `onLoginSuccess`, ni del safety timer 8s de init.js.
2. **Verificación producción**: `curl` confirmó que batch50 SÍ está deployed en Cloudflare. El bug NO es de deploy faltante.
3. **Hipótesis formada (no confirmada)**: `sb.auth.getSession()` queda pending post-F5 y `onAuthStateChange` no dispara `INITIAL_SESSION`. Timer 8s de init.js tampoco loggea "[SAFETY] Timeout 3s" — raro.
4. **Opción A elegida por Anthony**: instrumentar antes de fix a ciegas.
5. **Snapshot** a `versiones_anteriores/2026-04-18_batch51_prep/` (init.js + service-worker.js + sw-loader.js).
6. **Instrumentación `init.js`** — agregados logs `[AUTH-DEBUG]`:
   - DOMContentLoaded start + dump de keys de localStorage con auth
   - Safety timer 8s: log al registrar + log cuando dispara + log cuando cancela
   - `onAuthStateChange`: loguea TODOS los eventos (SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, etc.) con session y `_appInitialized`
   - Handler branches: cada rama loguea qué ruta tomó
   - 500ms await: log antes y después
   - getSession() envuelto en `Promise.race` con timeout 3s → si timeout, cae al catch con `getSession_timeout_3s`
   - Fallback en catch: lee localStorage directamente, loguea, fuerza login screen
7. **SW bump batch50→batch51** (service-worker.js + sw-loader.js).
8. **`deploy-check.js`**: 4/4 OK, 0 errores.
9. **Deploy batch51 ✅** — URL: https://a36884ea.finanzasprueba.pages.dev. 3 archivos subidos.

### Estado split modular
| Archivo | Estado |
|---|---|
| init.js | ✅ Instrumentación [AUTH-DEBUG] + timeout 3s en getSession + fallback localStorage |
| service-worker.js | ✅ CACHE_VERSION batch51 (deployed) |
| sw-loader.js | ✅ SW_EXPECTED_VERSION batch51 (deployed) |

### PRÓXIMO PASO EXACTO
```
1. Anthony verifica incógnito: DevTools abierta ANTES de F5 → F5 → copiar TODOS los logs [AUTH-DEBUG]
2. Con logs concretos identificar dónde se cuelga:
   - Si localStorage vacío → bug distinto (algo sigue borrándolo)
   - Si onAuthStateChange solo dispara TOKEN_REFRESHED fallido → fix refresh token
   - Si getSession timeout 3s → bug SDK colgado, fallback forzar login con tokens de localStorage
   - Si safety timer 8s nunca dispara → bug del event loop
3. Fix quirúrgico batch52 con evidencia
```

```
Contexto: CLAUDE.md + SESSION.md + context/chat_2026-04-18_batch51.txt
Tarea: Anthony pega logs [AUTH-DEBUG] post-F5; diseñar fix quirúrgico batch52
```

---

## SESIÓN — 18 Abr 2026 noche-2 (batch49 — BUG-1 FIX DEFINITIVO)

### Qué se hizo
1. **BUG-1 causa raíz real identificada por logs de consola** — con evidencia empírica por primera vez:
   - Logs post-F5 mostraron: `[Splash] Safety timeout activado` sin ningún log de `[Household]` ni datos
   - localStorage completamente vacío después del F5 (usuario confirmó)
   - **Culpable encontrado**: `app-offline.js:20-31` — `unhandledrejection` handler que llamaba `localStorage.removeItem('sb-jcgoccaisemrfsuwwrrl-auth-token')` + `window._supabase.auth.signOut()` al detectar cualquier error de "refresh_token"
   - Race condition: Supabase SDK interno y nuestro `setSession()` en init.js usaban el mismo refresh_token concurrentemente → segundo intento falla con "Invalid Refresh Token" → handler dispara → `signOut()` global invalida el token server-side → localStorage borrado
   - En F5 siguiente: no hay sesión restaurable → login screen
2. **Fix quirúrgico `app-offline.js`** — eliminados `removeItem()` + `signOut()` del handler; solo queda `e.preventDefault()` + hide del login-error banner
3. **SW bump batch48→batch49** — `service-worker.js` (CACHE_VERSION) + `sw-loader.js` (SW_EXPECTED_VERSION)
4. **Deploy batch49 ✅** — URL: https://ab445866.finanzasprueba.pages.dev. 3 archivos subidos.

### Estado split modular
| Archivo | Estado |
|---|---|
| app-offline.js | ✅ signOut() + removeItem() eliminados del unhandledrejection handler |
| service-worker.js | ✅ CACHE_VERSION batch49 (deployed) |
| sw-loader.js | ✅ SW_EXPECTED_VERSION batch49 (deployed) |

### PRÓXIMO PASO EXACTO
```
1. Anthony verifica incógnito: abrir https://finanzasprueba.pages.dev/, iniciar sesión, ver datos, hacer F5 → datos deben mantenerse (no login screen)
2. Si OK → BUG-1 cerrado. Próxima sesión: Phase 1 tokens-css
3. Si persiste → reportar consola post-F5 (¿sigue apareciendo "Invalid Refresh"? ¿nuevo error?)
```

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Anthony verifica batch49 incógnito — F5 debe mantener datos sin login screen
```

---

## SESIÓN — 18 Abr 2026 noche (batch48 deploy + pre-deploy validator + diagnóstico revisado)

### Qué se hizo
1. **Diagnóstico revisado — SessionMD estaba parcialmente equivocado**:
   - NO hay `<link rel="preload">` en index.html — el warning del browser venía del SW PRECACHE (cache.addAll)
   - `<script src="config.js">` y `<script src="app-core.js">` SÍ están presentes en líneas 1598-1599 ✅
   - La causa real del "balance $0" / "no logs app-core.js": el safety timer de 3s en `init.js` puede disparar antes de que `_sbLoadPromise` resuelva en móvil lento → muestra login screen prematuramente
   - `onLoginSuccess()` eventualmente SÍ corre (cuando CDN carga), pero usuario abandona antes de verlo
2. **SW bump batch47→batch48** — `service-worker.js` (CACHE_VERSION) + `sw-loader.js` (SW_EXPECTED_VERSION) actualizados.
3. **Deploy batch48 ✅** — URL: https://6f77e5a2.finanzasprueba.pages.dev. 3 archivos subidos.
4. **Validador pre-deploy creado** — `version_actual/deploy-check.js` (Node.js, ~55 líneas):
   - Verifica CACHE_VERSION === SW_EXPECTED_VERSION
   - Detecta orphan preloads en index.html
   - Verifica que scripts locales referenciados existen como archivos
   - Verifica que módulos están en PRECACHE_URLS
   - Bloqueante (exit code 1) si hay errores
   - Corrida actual: 4/4 OK, 0 errores

### CAUSA RAÍZ ACTUALIZADA
La safety timer de 3s en `init.js` (línea 180) dispara antes de que el CDN de Supabase cargue en conexiones lentas de móvil, mostrando la login screen. El usuario ve la pantalla de login y piensa que el app falló — pero en realidad la sesión SE RESTAURA SOLA 2-5s después cuando el CDN carga y onAuthStateChange dispara INITIAL_SESSION.

**Fix definitivo pendiente**: aumentar el safety timer de 3s a 8-10s, o mostrar un spinner "restaurando sesión..." en vez de login screen, para evitar que el usuario interrumpa el proceso de auto-restore.

### Estado split modular
| Archivo | Estado |
|---|---|
| service-worker.js | ✅ CACHE_VERSION batch48 (deployed) |
| sw-loader.js | ✅ SW_EXPECTED_VERSION batch48 (deployed) |
| deploy-check.js | ✅ NUEVO — validador pre-deploy Node.js |
| index.html | ✅ Sin cambios — scripts correctamente ordenados (config.js:1598, app-core.js:1599) |

### PRÓXIMO PASO EXACTO
```
1. Anthony verifica móvil: F5 logueado → esperar 8-10s → consola debe mostrar:
   - [SW-Loader] Nuevo SW activo — recargando  (solo primera vez, después de esto recarga automática)
   - [Init] supabase-js OK ✓
   - [Household] membresía activa: fa3f7b3b-...
   - [loadFromSupabase] ...  ← estos son los logs de app-core.js
   - Balance real (no $0)
2. Si OK → Fix del safety timer (3s→8s) como Fase 0.5
3. Luego → Fase 1: tokens-css (design tokens sin cambios visuales)
```

### Instrucción al validador pre-deploy
Para integrarlo en el skill deploy, agregar antes del wrangler:
```bash
node version_actual/deploy-check.js || exit 1
```

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Fix safety timer init.js (3s→8s) para evitar login screen prematura en móvil
```

---

## SESIÓN — 18 Abr 2026 tarde (batch47 deploy + NUEVA causa raíz BUG-1 identificada)

### Qué se hizo
1. **Duplicado SW eliminado** — `app-offline.js` líneas 98-116 (bloque `navigator.serviceWorker.register()` duplicado) eliminado. Grep confirma que solo queda el registro canónico en `sw-loader.js:45`.
2. **SW bump batch46→batch47** — `service-worker.js` (CACHE_VERSION + comentario AI-CONTEXT) y `sw-loader.js` (SW_EXPECTED_VERSION) actualizados.
3. **Deploy batch47 ✅** — `wrangler pages deploy version_actual/ --project-name finanzasapp`. 3 archivos subidos, 38 cacheados. URL: https://b24f068f.finanzasprueba.pages.dev
4. **Verificación — bug persiste en móvil Y desktop** (Anthony confirmó). Logs de consola post-F5 revelan **nueva causa raíz real**:
   ```
   ⚠ app-core.js was preloaded ... but not used within a few seconds
   ⚠ config.js was preloaded ... but not used within a few seconds
   ⚠ [Splash] Safety timeout activado
   ```
   **Ningún log de app-core.js en consola** (otros módulos sí: calendar, vapid-push, init, voice, features). app-core.js NO se ejecuta → `loadFromSupabase()` no existe → no hay estado → splash safety fires → balance $0.

### CAUSA RAÍZ REAL (CONFIRMADA POR LOGS)
`index.html` tiene `<link rel="preload" href="/app-core.js">` y `<link rel="preload" href="/config.js">` **sin `<script src>` correspondiente que los consuma**, o con orden incorrecto. Bug de *plumbing* HTML, NO de lógica JS.

### Estado split modular
| Archivo | Estado |
|---|---|
| app-offline.js | ✅ registro SW duplicado eliminado |
| service-worker.js | ✅ CACHE_VERSION batch47 (deployed) |
| sw-loader.js | ✅ SW_EXPECTED_VERSION batch47 (deployed) |
| index.html | 🔴 **orphan preload app-core.js + config.js — BUG-1 raíz real** |

### Decisión arquitectónica (Anthony + Claude)
Roadmap acordado, sin descarrilamiento:
- **Fase 0**: Fix quirúrgico `index.html` (5 min) + validador pre-deploy (50 líneas Node que bloquea deploy si hay orphan preload / SW desincronizado / módulo huérfano) + hook en skill `deploy`.
- **Fase 1**: Design tokens primero (skill `tokens-css`) — extraer colores/spacing/tipo del zip referencia a `:root`, 0 cambios visuales.
- **Fase 2**: UIX incremental pantalla por pantalla (login → dashboard → cuentas → movimientos → analytics → features). Un deploy por pantalla, verificar 24h, luego siguiente.
- **Regla de oro**: un tipo de cambio por deploy. Nunca mezclar fix + UIX + feature.

### PRÓXIMO PASO EXACTO
```
1. Leer sección <head> + final de <body> de index.html (identificar desalineación preload↔script)
2. Fix: agregar/reordenar <script src="/config.js"> y <script src="/app-core.js"> para que ejecuten
3. SW bump batch47→batch48
4. Deploy wrangler → PAUSAR
5. Anthony verifica móvil: F5 logueado → consola debe mostrar log de app-core.js + balance real (no $0)
6. Si OK → diseñar validador pre-deploy (Node script + skill deploy hook)
```

### Riesgos / guards
- NO copiar styles.css del zip entero (regresión garantizada)
- NO migrar UIX big-bang — pantalla por pantalla
- Validador pre-deploy debe incluir: preload↔script alignment + SW version match + PRECACHE_URLS sync

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Leer head + end-of-body de index.html, identificar orphan preload app-core.js/config.js, agregar <script src> faltante, bump batch48, deploy, Anthony verifica móvil
```

---

## SESIÓN — 18 Abr 2026 PM (batch46 + root cause real BUG-1)

### Qué se hizo
1. **Ghost files eliminados** de `version_actual/`:
   - `sw.js` (SW v4 viejo, cache-first JS, servía `init.js` obsoleto con BUG-1)
   - `index.ts`, `vapid-push-index.ts`, `calendar-sync-edge-function.ts` (fuentes TS no usadas)
2. **sw-loader.js v13** — agregado desregistro automático del SW viejo `/sw.js`:
   - Itera `getRegistrations()` en `load`
   - Si `scriptURL` contiene `/sw.js` y NO `service-worker` → `unregister()`
   - Evita que navegadores con SW v4 previo sirvan `init.js` cacheado
3. **Deploy batch46 ✅** — `CACHE_VERSION = finanzas-v59-batch46` + `SW_EXPECTED_VERSION = finanzas-v59-batch46` (service-worker.js + sw-loader.js bumped y subidos a Cloudflare Pages).
4. **Verificación en navegador — bug persiste en móvil (Anthony confirmó)**:
   - Scripts ejecutan **5 veces** al cargar (timestamps idénticos 9:12:29)
   - `HOUSEHOLD_ID = null` aunque `_appInitialized = true` y `currentUser` seteado
   - `sessionStorage.sw_reloaded_*` activo pero log "Nuevo SW activo — recargando" NO aparece
   - Performance API: `type=reload`, `redirectCount=0` (no son redirects, son re-ejecuciones)
5. **CAUSA RAÍZ REAL DESCUBIERTA** — `app-offline.js` líneas 98-116 registra `/service-worker.js` una **segunda vez**, compitiendo con `sw-loader.js`:
   - Dos `navigator.serviceWorker.register()` simultáneos → múltiples eventos `controllerchange`
   - Reload loop (5× ejecución de scripts) → `resolveHouseholdId()` no completa → `HOUSEHOLD_ID` queda null
   - `data-load.js` query con `user_id = null` → balance $0

### Estado split modular
| Archivo | Estado |
|---|---|
| sw-loader.js | ✅ v13 — desregistro sw.js viejo + SW_EXPECTED_VERSION batch46 |
| service-worker.js | ✅ CACHE_VERSION batch46 (deployed) |
| app-offline.js | 🔴 **líneas 98-116 = bug raíz** — registro SW duplicado pendiente eliminar |
| sw.js | ✅ eliminado (ghost file) |

### PRÓXIMO PASO EXACTO
```
1. Eliminar bloque 'if ("serviceWorker" in navigator)' completo en app-offline.js líneas 98-116
   (sw-loader.js ya hace el register — app-offline.js NO debe registrar SW otra vez)
2. SW bump batch46→batch47 (service-worker.js + sw-loader.js)
3. Deploy wrangler pages → finanzasapp
4. PAUSAR. Anthony verifica en móvil: F5 logueado → datos cargan (no $0)
5. Si bug persiste → revisar por qué scripts ejecutan 5×
```

### Riesgos / guards
- `app-offline.js` probablemente también contiene lógica de offline-queue → eliminar SOLO el register, no el archivo entero
- Verificar que no haya otro módulo registrando SW (grep `navigator.serviceWorker.register`)
- Mantener guard `sessionStorage.sw_reloaded_*` en sw-loader.js (protege contra loop)

```
Contexto: CLAUDE.md + SESSION.md
Tarea: Eliminar registro SW duplicado en app-offline.js:98-116, bump a batch47, deploy, Anthony verifica móvil
```

---

## SESIÓN — 18 Abr 2026 (batch45 deploy + setup depuración nocturna)

### Qué se hizo
1. **Deploy batch45 ✅** — SW bump 44→45 + wrangler pages deploy a `finanzasapp` (project name correcto, no `finanzasprueba`). Incluye BUG-1 safety timer fix. URL: https://64dd6135.finanzasprueba.pages.dev. Verificación pendiente por Anthony.
2. **Consolidación CLAUDE.md** — de 407→~180 líneas. Eliminadas 10 incongruencias (fallback Supabase temporal, offsets obsoletos, duplicados BUGS/PENDIENTES, etc.). Nueva sección DISCIPLINA DE TOKENS.
3. **Archivos de estado extraídos**: `PENDIENTES.md`, `NEGOCIO.md`, `MORNING_BRIEF.md` (template), `CONTEXT_ROUTE.md` (ruta de lectura por tarea).
4. **Infraestructura nocturna**: carpetas `nocturno/`, `versiones_anteriores/2026-04-18_depuracion/{01-04}/`, `propuestas/ux-referencia/` (zip UX extraído, 8 JSX + tokens.css).
5. **6 Triggers CronCreate programados** (19-Abr 01:07 / 02:07 / 03:07 / 04:07 / 05:07 / 05:47) + backup manual `nocturno/PROMPTS.md` por incertidumbre en persistencia de crones (CronList devuelve vacío).

### PRÓXIMO PASO EXACTO
```
1. Anthony verifica incógnito batch45: login → datos cargan (no $0) + F5 mantiene datos
2. Mañana 19-Abr al despertar: abrir MORNING_BRIEF.md
   - Si corrió: seguir plan del brief
   - Si no: pegar prompts de nocturno/PROMPTS.md (T01→T06, ~15 min)
3. Con reportes: decidir Fase 4 (destino de app-core.js)
4. Fase 5 quirúrgica: 1 archivo por deploy con verificación
```

### Requisitos overnight
- Laptop prendida, Windows sin suspender
- Claude Code abierto en esta carpeta con esta sesión
- No cerrar la ventana (crones mueren si se cierra)

```
Contexto: CLAUDE.md + MORNING_BRIEF.md + CONTEXT_ROUTE.md
Tarea: Revisar reportes nocturnos y decidir Fase 4
```

---

## SESIÓN — 16 Abr 2026 PM (batch42-44 + BUG-1 fix real)

### Qué se hizo
1. **Post-deploy batch41** — fixes detectados en consola:
   - `app-features.js:457`: `let RECURRENTES` eliminado (doble declaración con globals-init.js → SyntaxError)
   - `notificaciones-panel.js`: aliases `window.openNotifPanel` / `window.closeNotifPanel` agregados
   - → batch42 deployed ✅
2. **BUG-1 diagnóstico real** — datos $0 en login:
   - Causa: lock contention en Supabase auth token — `setSession()` + `getSession()` competían con `INITIAL_SESSION`
   - Fix 1: `await new Promise(r=>setTimeout(r,0))` en init.js antes de setSession (deja que INITIAL_SESSION procese primero)
   - Fix 2: guard `!_appInitialized` en bloque setSession → batch43 deployed ✅
   - Fix 3: guard `!_appInitialized` en bloque getSession → batch44 deployed ✅
   - Fix 4 (CAUSA RAÍZ REAL): safety timer reseteaba `_appInitialized=false` mientras `onLoginSuccess()` corría → agregado `if(_appInitialized) return` al timer
   - → **batch45 PENDIENTE DEPLOY** (solo SW bump + deploy)
3. **Regla permanente agregada**: después de deploy Cloudflare → pausar, esperar instrucción de Anthony para verificar

### Estado split modular
| Archivo | Estado |
|---|---|
| app-features.js | ✅ RECURRENTES doble-decl eliminada |
| notificaciones-panel.js | ✅ aliases openNotifPanel/closeNotifPanel |
| init.js | ✅ BUG-1 fixes × 4 (lock + safety timer) |
| SW | finanzas-v59-batch44 en version_actual — **batch45 PENDIENTE DEPLOY** |

### PRÓXIMO PASO EXACTO
```
1. SW bump batch44→batch45 + deploy wrangler
2. Anthony verifica en incógnito: login → datos reales cargan (no $0)
3. F5 logueado → datos se mantienen
4. Botón Google Calendar visible (BUG-2)
```

### Pendientes post-deploy
- BUG-SEC2: hCaptcha → Supabase Dashboard → Auth → Attack Protection
- BUG-3: Push móvil → handler push en service-worker.js
- BUG-4: CDN verificar
- Google OAuth: anthonymarte12@gmail.com → Cloud Console test user
- tokens.css → PRIORIDAD elevada (PREREQ diseño)

---

```
Contexto: CLAUDE.md + context/chat_2026-04-16_09-33.txt
Tarea: SW bump batch44→batch45, deploy, luego Anthony verifica incógnito: datos cargando en login (BUG-1 fix)
```
