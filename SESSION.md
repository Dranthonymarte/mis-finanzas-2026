# SESSION.md — Mis Finanzas 2026
*Actualizar después de cada corrección considerable*

---

## SESIÓN — 18 May 2026 (FASE 3 — críticos: PWA, auth refresh, patrimonio, sheets)

📊 **Modelo: Opus** (debugging causa-raíz multi-archivo)

### Causas raíz encontradas y corregidas
1. **PWA no instalable** — `vite-plugin-pwa` estaba configurado pero `main.tsx`
   NUNCA llamaba `registerSW()` → cero service worker en runtime → Android
   Chrome no ofrece "Instalar". Fix: `registerSW({immediate:true})` + `src/vite-env.d.ts`
   + manifest enriquecido (id, scope, maskable). Build genera `dist/sw.js` ✓
2. **Refresh → /login + "autologin" + "conexión tardó"** — el timer de 5s en
   `useAuth` disparaba `setAuthReady()` antes de resolver `getSession()`/household
   → RequireAuth flash-redirect a /login → al resolver sesión, RequireNoAuth
   rebota a / (percibido como autologin). Fix: `authReady`+`isAuthenticated` se
   fijan YA desde `getSession()` (lectura local, sin esperar DB); household
   resuelve en background; timer solo catastrófico 8s; `INITIAL_SESSION` skip
   para no duplicar buildSession. `supabase.ts`: auth config explícita.
3. **Candado/sheets "capa transparente sin diálogo"** — `.page-slide-*` aplica
   `transform` → se vuelve containing-block de `position:fixed` → la hoja se
   renderiza al fondo del scroll, no del viewport. Fix: `<Sheet>` con
   `createPortal` a `document.body` (Txn candado, More logout, DineroFuera).
4. **Patrimonio/Saldo incongruentes** — `useAccounts` sumaba montos sin
   normalizar moneda; Home filtraba solo `currency==='USD'`. Fix: `balanceUSD`
   (VES÷BCV) en useAccounts; Home patrimonio = Σ todas; saldo = Σ sin AHORRO;
   `fmt()` convierte USD→moneda activa. Quitados pills mock "+$342.18".
5. **Tasa manual imposible de escribir** — `parseFloat(e.target.value)||tasas.bcv`
   en cada tecla → input vacío/parcial resnapeaba a tasa DB. Fix: input
   string-backed (`rateStr`), parse solo si válido, normaliza en blur.
6. **DineroFuera vacío** — datos reales están en `movimientos`
   (tipo Prestamo recibido/pagado), no en tabla `dinero_fuera`. Fix: merge
   derivado read-only agrupado por descripción (Luis Eduardo/Prima Isa).
7. **Analisis ingresos** — revertido group-by-desc (generaba entradas basura);
   ahora Total + desglose Fijo·Anthony / Fijo·Isabel / Otros (por `author`).

### Pendientes reportados NO resueltos esta sesión
- Groq en producción: `VITE_GROQ_API_KEY` está en `.env.local` (gitignored) →
  **NO existe en build de Cloudflare Pages**. Requiere setear la env var en el
  dashboard de CF Pages (acción de Anthony, no código).
- Iconos info por card + reordenar dashboard cards (no integrado aún)
- Subcategorías/Categorías: filtro por categoría + CRUD igual que Tipos
- Lista de compras: rediseño + lógica + tablas Supabase (no integrado)
- Fondo emergencia: lógica completa + integración dinero-fuera/ahorros
- Presupuestos: validar en runtime tras fix de updateConfig optimista

---

## SESIÓN — 18 May 2026 (fix build CF Pages + CLAUDE.md React App)

📊 **Modelo próxima sesión: Sonnet 4.6**

### Qué se hizo
1. **fix(build) BUG-R27** — `MovSum.total → MovSum.amount` en `useAccounts.ts`
   - Error TS bloqueaba TODOS los deploys desde commit `9fe7992`
   - 1 línea cambiada. Build: ✅ 0 errores, 694 módulos, 28s
2. **docs(claude)** — CLAUDE.md actualizado con contexto React App completo
   - Stack React, reglas críticas (householdId, subcat, soft-delete, mes)
   - Arquitectura de carpetas, TypeScript strict, git push PowerShell
   - Versión: 25 Abr → 18 May 2026

### Commits esta sesión
```
8faba93 docs(claude): añadir contexto React App v1.0.3 a CLAUDE.md
f6e7262 fix(build): MovSum.total → MovSum.amount — resuelve error TS en CF Pages
```

### Estado post-sesión
| Item | Estado |
|------|--------|
| Build React App | ✅ 0 errores |
| CF Pages deploy | ✅ auto-build disparado (react-preview) |
| CLAUDE.md | ✅ Actualizado con contexto React App |
| BUG-R27 (MovSum) | ✅ Resuelto |

### PRÓXIMO PASO
```
Leer: CLAUDE.md + MORNING_BRIEF.md

PENDIENTES prioritarios:
1. Verificar deploy en CF Pages (react-preview)
2. Worker Cloudflare para Groq OCR (sacar fin_groq_api_key del localStorage)
3. Fonts offline PWA — /public/fonts/ woff2
4. Settings/Categories — color picker por categoría
5. Analisis — comparativa mes anterior real
```

---

## SESIÓN — 17 May 2026 sesión 2 (sprint 27 bugs React App + auth fast-path)

📊 **Modelo próxima sesión: Sonnet 4.6** — Charts recharts (implementación con referencia visual)

### Qué se hizo
1. **PASO 0 — Fix ID en queries**
   - `useAccounts.ts`: cambiado `userId` → `householdId` en query cuentas (BUG-R23 `0153570`)
   - Isabel ahora ve sus cuentas correctamente
2. **perf(auth) — login instantáneo en F5** (`5e672eb`)
   - `userId` + `householdId` persistidos en localStorage via zustand persist
   - `useAuth`: cache-hit → `setSession()` inmediato sin DB round-trip
   - Verificación en background, fallback cold-start si userId no coincide
   - `setUserName()` action añadida al AuthState
3. **fix(crash) BUG-R24** — `CatIcon.tsx` crashaba con `cat: null` de DB real (`6ab2a97`)
   - `cat: string|null|undefined`, `safe.slice(0,2) || '??'`
   - `txnGroup()`: guard `if (!tipo) return 'gasto'`
4. **fix(data) BUG-R25** — `useAccounts` retornaba saldo estático (`9fe7992`)
   - 2 queries paralelas: cuentas + `movimientos SELECT cuenta_id,amount`
   - `balance = balance_override ?? saldoInicial + SUM(movimientos by cuenta_id)`
5. **fix(data) BUG-R26** — `useTasas` siempre usaba mes `'global'` (`9fe7992`)
   - Lee `mesActivo` del prefs store → `mesIdToDbKey()` → row mes-específico, fallback `'global'`
   - `saveTasas` guarda mes-específico + actualiza `global` para compat
   - `Monedas.tsx` pasa `mesActivo` a `saveTasas`
6. **Auditoría 27 bugs** — verificados BUG-1 a BUG-26 del checklist:
   - 22 ya estaban correctamente implementados de sesiones anteriores
   - 3 necesitaron código nuevo (BUG-1/BUG-10/BUG-11 → BUG-R24/R25/R26)
7. **Docs** — BUGS.md, REACT_APP_STATUS.md actualizados (`fce3797`)

### Commits esta sesión
```
fce3797 docs: marcar BUG-R24/R25/R26 resueltos, historial v1.0.3
9fe7992 fix(data): balance real en cuentas + tasas por mes activo
6ab2a97 fix(crash): null guard en CatIcon.cat + txnGroup.tipo
5e672eb perf(auth): login instantaneo en F5 via cache householdId
c9163d2 docs: marcar BUG-R21/R22/R23 resueltos, actualizar pendientes
0153570 fix(data): useAccounts usa householdId en lugar de userId
```

### Estado React App post-sesión
| Item | Estado |
|------|--------|
| BUG-R01..R26 | ✅ Todos resueltos |
| Balance cuentas real | ✅ saldoInicial + SUM(movimientos) |
| Tasas por mes activo | ✅ fallback a 'global' |
| Login F5 instantáneo | ✅ cache householdId persistido |
| CatIcon null safe | ✅ |
| Bloque 3 Charts recharts | ⏳ PRÓXIMO |

### PRÓXIMO PASO EXACTO
```
Leer: CLAUDE.md + MORNING_BRIEF.md + REACT_APP_STATUS.md

CONTEXTO:
- v1.0.3-bugfix ✅: todos los bugs del checklist resueltos
- branch: develop → push también a react-preview
- household_id: fa3f7b3b-148b-4dea-8e2a-37f740c08b3d

TAREA — Bloque 3 Charts (recharts):
1. npm install recharts (en version_actual/react-app/)
2. AreaChart ingresos vs gastos 6M en Home.tsx
   - Datos reales de useKPIs + últimos 5 meses estáticos como base
   - Colores: var(--pos) ingresos, var(--neg) gastos, fondo ink-2
   - Tooltip oscuro, sin ejes pesados
3. DonutChart top-5 categorías en /txn (Txn.tsx o Analisis.tsx)
   - Colores de catColor() — consistente con CatIcon
4. Mantener Sparkline para KPI cards (no tocar)
5. Build 0 errores → commit → push develop + react-preview

REGLAS:
- user_id inserts = householdId
- subcat: siempre '' (NOT NULL)
- mes DB: "Mayo" | store: "may-26" → mesIdToDbKey()
```

---

## SESIÓN — 17 May 2026 sesión 1 (PASO 0 + PASO 0 queries + docs v1.0.2)

📊 **Modelo próxima sesión: Sonnet 4.6**

### Qué se hizo
1. **PASO 0 Supabase**: verificados IDs reales por tabla (movimientos/cuentas/config_usuario)
2. **BUG-R23**: `useAccounts` userId → householdId (Isabel: 0 cuentas con auth.uid()) (`0153570`)
3. **BUG-R21 ✅**: AccountDetail balance real confirmado en commit `c52da61`
4. **BUG-R22 ✅**: useTasas mes 'global' verificado — por diseño (corregido en sesión 2)
5. **perf(auth)**: `userId+householdId` persistidos en zustand localStorage (`5e672eb`)
6. **Docs**: BUGS.md, REACT_APP_STATUS.md v1.0.2 actualizados

---

## SESIÓN — 16-17 May 2026 (sprint bugfix v1.0.1 — Checkpoint C React App)

📊 **Modelo: Sonnet 4.6**

### Qué se hizo
- Checkpoint C completo: Supabase real en las 31 rutas de React App
- 20 bugs corregidos (BUG-R01 a BUG-R20)
- OCR real Groq Vision, Transfer cuentas reales, Fire shape real, ListaCompras JSONB
- RLS project_files, fonts CDN, tema FOUC fix, inline edits metas/budgets/subcats
- Docs: SUPABASE_SCHEMA.md, REACT_APP_STATUS.md v1.0.1, BUGS.md, FLUJO_APP.md

Commits principales: `63890d7` (docs) · `012372b..3fb0c3d` (BUG-R01..R20)

---

## SESIÓN — 16 May 2026 — React App Bloque 2 (AccountDetail + NewAccount + Transfer)

📊 **Modelo: Sonnet 4.6**

### Qué se hizo
1. `/accounts/:id` — hero radial, Sparkline, stats 3 col, filtro chips, soft-delete log
2. `/new-account` — preview card en vivo, tipo/moneda/color picker
3. `/transfer` — AccountPicker, monto hero teal, par DEBIT/CREDIT con pairId
4. Icons.tsx → EditIcon + TrashIcon
5. Build ✅ · Push `384ef91` → develop + react-preview

---

## SESIÓN — 15 May 2026 (F3-F6 rediseño + GitHub/Cloudflare CI)

### Qué se hizo
1. GitHub conectado: repo `Dranthonymarte/mis-finanzas-2026`, remote origin, push master+develop
2. Cloudflare Pages → GitHub: `react-preview` auto-build
3. `.git/HEAD` corrupto reparado
4. F3 batch56: dashboard.css hero Instrument Serif, KPI tokens
5. F4 batch56: pages.css base DRY (modales/forms/botones)
6. F5: media queries móvil + bottom-sheet
7. F6: theme.js NUEVO módulo lógica-UI aislado
8. Feedback Anthony: "UIX no se parece" → enfoque re-skin no funciona → markup del bundle necesario

---

## SESIÓN — 26 Abr 2026 (Extractos BDV Isabel abril)

### Qué se hizo
- INSERT Batch A: 36 filas Isabel 2026-04-09..11 ✅
- INSERT Batch B: 39 filas Isabel 2026-04-12..16 ✅
- Isabel: 197 movimientos totales (03-21 → 04-16)
- _inbox limpiado → _procesados

---

## SESIÓN — 24 Abr 2026 NOCHE-2 (F2 batch55 deploy — cambios NO visibles)
SW cache stale. Deploy OK en Cloudflare. Cliente necesita unregister SW + hard refresh.

## SESIÓN — 24 Abr 2026 NOCHE (F2 batch55 — Shell Visual)
shell.css: sidebar 240px + nav 64px. Deploy pendiente verificación.

## SESIÓN — 24 Abr 2026 PM (F1.1 batch54 DEPLOYED ✅)
fonts self-hosted (Inter/Instrument Serif/JetBrains Mono). Anthony verificó ✅.

## SESIÓN — 23 Abr 2026 PM (F0 + F1 parcial)
git init baseline. Fonts descargadas (100KB latin). tokens.css pendiente.

## SESIÓN — 23 Abr 2026 (Planning rediseño visual)
Bundle handoff recibido. Plan F0→F6 acordado. Vanilla JS mantenido.

## SESIÓN — 18 Abr 2026 noche-4 (batch52 — BUG-1 deadlock fix)
`setTimeout(0)` en onAuthStateChange para liberar lock SDK. Deploy ✅.

## SESIÓN — 18 Abr 2026 noche-3 (batch51 instrumentación)
[AUTH-DEBUG] logs agregados. Deploy ✅.

## SESIÓN — 18 Abr 2026 noche-2 (batch49 — unhandledrejection fix)
`signOut()` + `removeItem()` eliminados de handler. Deploy ✅.

## SESIÓN — 18 Abr 2026 noche (batch48 + deploy-check.js)
Validador pre-deploy Node.js creado. Safety timer 3s→8s pendiente.

## SESIÓN — 18 Abr 2026 tarde (batch47)
Registro SW duplicado en app-offline.js:98-116 eliminado.

## SESIÓN — 18 Abr 2026 PM (batch46)
Ghost files eliminados. sw-loader.js v13 desregistra sw.js viejo.

## SESIÓN — 18 Abr 2026 (batch45 deploy + infraestructura nocturna)
Deploy batch45 ✅. CLAUDE.md consolidado. Triggers nocturnos configurados.

## SESIÓN — 16 Abr 2026 PM (batch42-44 + BUG-1 fix real)
app-features.js: RECURRENTES doble-decl eliminada. BUG-1 fixes × 4.
