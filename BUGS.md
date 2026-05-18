# BUGS.md — Mis Finanzas 2026
*Actualizar al trabajar cada bug*

> **Sesión 16 May 2026:** trabajo 100% React App (Bloque 2). Sin cambios en Vanilla JS. Bugs existentes sin modificación.

---

## ✅ BUG-SEC — Token Telegram expuesto
**Estado:** RESUELTO — 15 Abr 2026 (confirmado por Anthony)

---

## 🔴 BUG-SEC2 — hCaptcha sin configurar
**Estado:** PENDIENTE  
**Causa:** Supabase Auth Protection activo pero sin secret key real de hCaptcha.  
**Fix:** Supabase Dashboard → Auth → Attack Protection → pegar secret key de hcaptcha.com, o desactivar si no se usa.

---

## 🟡 BUG-1 — F5/login = datos $0 / login screen post-refresh
**Estado:** FIX APLICADO batch52 (18-Abr noche-4) — pendiente verificación incógnito por Anthony.
**Causa raíz (confirmada por logs [AUTH-DEBUG] de batch51):** `await onLoginSuccess()` se ejecutaba dentro del callback `onAuthStateChange` mientras el SDK Supabase aún corría su `_initialize()` interno post-F5. Las queries `sb.from(...)` en `resolveHouseholdId/loadFromSupabase` deadlockeaban con el lock interno del SDK → hang silencioso (no throw, no error). Primer login no rompía porque el evento se disparaba desde `signInWithPassword()` (fuera del lock). Patrón documentado en supabase/auth-js#762.
**Evidencia clave (logs Anthony 18-Abr noche-3 post-F5):**
- `_appInitialized=true después de 500ms` → confirmó entrada a onLoginSuccess
- NO aparece `[Household]`, `[plantillas]`, `[dinero_fuera]`, `[Healthcheck]`, `[UnhandledPromise]`
- Splash safety 12s dispara → confirma hang
**Fix batch52 (`init.js:222-232`):** desacoplar `onLoginSuccess()` con `setTimeout(0)` para liberar el call stack del callback antes de las queries. Agregado `try/catch` + log `[AUTH-DEBUG] Defer 0ms ejecutado` para evidencia futura.
**Fixes previos aplicados (mantenidos):**
  - batch43-45: guards `_appInitialized` + safety timer fix en init.js
  - batch47: eliminado registro SW duplicado en app-offline.js:98-116
  - batch48: diagnóstico revisado, scripts confirmados en index.html
  - batch49: eliminados `removeItem()` + `signOut()` del `unhandledrejection` en app-offline.js
  - batch50: eliminación de setSession() en init.js (usa await 500ms → getSession)
  - batch51: instrumentación `[AUTH-DEBUG]` (entregó la evidencia para causa raíz)

---

## ✅ BUG-2 — Botón "Conectar Google" no aparece
**Estado:** FIX EN CÓDIGO — incluido en batch40 (pendiente deploy)  
**Fix aplicado:** `gcal-integration.js` ahora escucha `sb-ready` en vez de polling — 15 Abr 2026.

---

## 🟡 BUG-3 — Push móvil no funciona
**Estado:** PENDIENTE  
**Causa:** `service-worker.js` no tiene handler `self.addEventListener('push', ...)`.  
**Fix:** Agregar handler push en `service-worker.js` + re-registrar en móvil.

---

## 🟡 BUG-4 — Login intermitente CDN
**Estado:** FIX APLICADO (Sesión 23) — pendiente confirmar  
**Causa:** Si jsdelivr fallaba, `_sbLoadPromise` era undefined → botones bloqueados.  
**Fix:** `index.html` v7 — inline script con fallback a unpkg.

---

## ✅ BUG-5 — CSP warning bancamiga
**Estado:** RESUELTO — 15 Abr 2026  
**Fix aplicado:** `_headers` img-src += `https://bancamiga.com https://*.bancamiga.com`.

---

## 🟡 BUG-6 — Split scope bug: globals inaccesibles cross-script
**Estado:** Fixes deployed hasta batch45. Pendiente auditoría nocturna (T02/T03) para identificar duplicados residuales raíz de regresiones.
**Causa raíz:** `let` top-level = script-scoped. Duplicados `const/let` entre app-core.js y módulos split → SyntaxError al cargar módulos.

**Fase 1 — 15 Abr 2026** (let→var + DOMContentLoaded):
- `app-core.js`: globals → `var` (sb, currentUser, HOUSEHOLD_ID, CONFIG, EXCEL_DATA, etc.)
- `app-core.js`: `let _appInitialized` eliminado + DOMContentLoaded → `DOMContentLoaded__disabled`
- `auth.js`: `let _appInitialized` eliminado
- `gcal-integration.js`: polling → `sb-ready` event ✅
- `data-load.js`: sbSaveFondo ya estaba ✅

**Fase 2 — 16 Abr 2026** (duplicados en app-core.js comentados):
- `app-core.js` (14): INACTIVITY_MINUTES/timers, _toastMobileStyle, recognition/voz, GROQ_URL/MODEL/FALLBACK, iaMode, _EMOJI_CATS, _EMOJI_RECIENTES_KEY, _emojiPickerCatActual, _emojiPickerTarget, _EMOJI_NOMBRES
- `audit.js` (1): `let realtimeChannel` comentado

**Pendiente:** Deploy batch41 a Cloudflare + verificar sin SyntaxError en consola.

---

---

# React App — Sprint Bugfix (2026-05-17)

> Sprint de correcciones al conectar la React App (`version_actual/react-app/`) a Supabase real.
> **25 bugs resueltos · 2 diferidos** · Sesiones 16-17 May 2026.
> Sin cambios en Vanilla JS durante este sprint.

---

## ✅ BUG-R01 — Crash null guard en useAccounts
**Commit:** `3fb0c3d`  
**Causa:** `inferType()` recibía `undefined` cuando `mov.tipo` no estaba en el array de tipos del config → TypeError.  
**Fix:** Guard `if (!tipo) return 'EXPENSE'` al inicio de `inferType` en `useAccounts.ts`.

---

## ✅ BUG-R02 — user_id incorrecto + subcat/method nullable
**Commit:** `4876604`  
**Causa:** Inserts en movimientos usaban `auth.uid()` en lugar del `householdId`. Campos `subcat` y `method` enviados como `null` violando NOT NULL en DB.  
**Fix:** `user_id: householdId` en todos los inserts. `subcat: subcat || ''`, `method: ''` siempre string vacío.  
**Afecta:** `NewTransaction.tsx`, `Escanear.tsx`, `CsvImport.tsx`, `Transfer.tsx`.

---

## ✅ BUG-R03 — Transfer usaba mock data, no cuentas reales
**Commit:** `b6e5b61`  
**Causa:** `Transfer.tsx` leía de `MOCK_ACCOUNTS` — cuentas siempre las mismas en producción.  
**Fix:** Reescritura completa con `useAccounts()` (hook Supabase). Inserción de par `{amount: -N} + {amount: +N}` con `pair_id` compartido.

---

## ✅ BUG-R04 — Fire: shape fire_config incorrecto
**Commit:** `134073a`  
**Causa:** `Fire.tsx` esperaba keys planas (`meta`, `extra`, `plazo`, `actual`) pero la DB almacena `{goal:{meta,extra,plazo,actual}}`.  
**Fix:** Load/save adaptados a shape real. Inicialización de defaults si `goal` es `null`.

---

## ✅ BUG-R05 — Lista Compras: schema JSONB incorrecto
**Commit:** `0e7a420`  
**Causa:** `ListaCompras.tsx` usaba estructura plana pero la tabla `listas_compras` almacena `items: [{id,nombre,cantidad,precio,checked}]` en JSONB.  
**Fix:** Reescritura completa con shape real. CRUD sobre el array JSONB con `update({ items: [...] })`.

---

## ✅ BUG-R06 — Auth: sin provisionar household ni config al registrar
**Commit:** `224929c`  
**Causa:** Al registrar un usuario nuevo no se creaban las filas en `households`, `household_members`, ni `config_usuario` → app rompía en primera sesión.  
**Fix:** Hook `useAuth` crea las 3 filas al primer `signUp` exitoso usando `household_id` = nuevo UUID.

---

## ✅ BUG-R07 — Recurrentes: sin campo recDia (día del mes)
**Commit:** `c8d77f8`  
**Causa:** `Recurrentes.tsx` solo guardaba `recurrencia_dias` (período en días) sin un campo para el día del mes en que cae el pago.  
**Fix:** Nuevo campo `recDia: number` (1-28) en la interfaz + input separado en el formulario. Se muestra en lista como `· día N`.

---

## ✅ BUG-R08 — Home: Fondo de Emergencia hardcodeado
**Commit:** `c8657c6`  
**Causa:** `Home.tsx` mostraba valor EF estático (`$0` o constante) en lugar de leer de `fondo_emergencia` en Supabase.  
**Fix:** Query a tabla `fondo_emergencia` al montar. Muestra meta vs. actual con porcentaje real.

---

## ✅ BUG-R09 — Appearance: tema/acento no persistían al recargar
**Commit:** `493aca5`  
**Causa:** `Appearance.tsx` guardaba en localStorage pero `main.tsx` no aplicaba los valores antes del primer render → flash de tema incorrecto (FOUC).  
**Fix:** Bloque síncrono en `main.tsx` antes de `createRoot().render()`: lee `mis_finanzas_theme` + `mis_finanzas_accent` y aplica `data-theme` + `--amber` CSS var antes que React hidrate el DOM.

---

## ✅ BUG-R10 — Profile: nombre no se reflejaba en el header al guardar
**Commit:** `14cbe63`  
**Causa:** `Profile.tsx` guardaba el nombre en Supabase pero no actualizaba el Zustand store → `useAuthStore(s => s.userName)` seguía devolviendo el valor anterior.  
**Fix:** `useAuthStore.getState().setUserName(nombre)` tras el `update` exitoso en Supabase.

---

## ✅ BUG-R11 — Pareja: mostraba datos mock en lugar de household real
**Commit:** `6f4bd20`  
**Causa:** `Pareja.tsx` usaba datos hardcodeados. No leía `household_members` de Supabase.  
**Fix:** Query a `household_members JOIN auth.users` al montar. Muestra avatar, nombre y rol real de cada miembro.

---

## ✅ BUG-R12 — TxnDetail: edit sobreescribía fila (rompía audit trail)
**Commit:** `40312ab`  
**Causa:** `TxnDetail.tsx` hacía `update()` directo sobre el row original → violaba la inmutabilidad de movimientos (regla de negocio: soft-delete + recrear).  
**Fix:** `saveEdit()` ahora: (1) `update({ deleted_at: now() })` sobre el id original, (2) `insert({ ...datos_nuevos, id: newUUID, user_id: householdId, subcat: txn.subcat ?? '', method: '' })`, (3) actualiza estado local con el nuevo id.

---

## ✅ BUG-R13 — NewTransaction: guardaba sin confirmación
**Commit:** `4bcdd77`  
**Causa:** El botón "Guardar" insertaba en Supabase inmediatamente sin mostrar resumen al usuario.  
**Fix:** `handleSave()` ahora solo llama `setConfirm(true)`. Una hoja de confirmación (backdrop + modal) muestra monto/tipo/cat/fecha/recurrente. Solo `executeSave()` hace el INSERT real.

---

## ✅ BUG-R14 — Home: pronóstico no incluía recurrentes del mes
**Commit:** `ef563d6`  
**Causa:** El pronóstico de flujo de caja calculaba solo a partir del gasto diario sin considerar recurrentes pendientes del mes en curso.  
**Fix:** Filtrado de `config.recurrentes` con `recurrencia_dias <= 31 && recDia > today.getDate()`. Se suman/restan al pronóstico de ingresos y gastos. Nombre de usuario dinámico desde `useAuthStore`.

---

## ✅ BUG-R15 — Escanear: OCR era mock, no usaba IA real
**Commit:** `37508bb`  
**Causa:** `Escanear.tsx` tenía una implementación placeholder que no llamaba a ninguna API.  
**Fix:** Integración real con Groq Vision API (`llama-3.2-11b-vision-preview`). Extrae base64 de la imagen, llama a `https://api.groq.com/openai/v1/chat/completions`, parsea `{monto, fecha, descripcion, cat}` del JSON de respuesta. Formulario editable post-OCR con save a movimientos. API key configurable en Security.tsx vía localStorage `fin_groq_api_key`.

---

## ✅ BUG-R16 — Metas: sin edición inline
**Commit:** `232cefd`  
**Causa:** `Metas.tsx` / `MetaCard` no tenía modo edición — solo crear y eliminar metas.  
**Fix:** `MetaCard` ahora tiene modo edit (pencil button ✎). Muestra formulario inline con emoji picker + inputs de nombre/objetivo/fecha. `onEdit(id, patch)` llama `updateConfig('metas_ahorro', updated)`. Fix de overflow en mobile (`minWidth: 0, overflow: 'hidden'`).

---

## ✅ BUG-R17 — Fonts: @font-face rotos causaban OTS errors
**Commit:** `8da7cc0`  
**Causa:** `tokens.css` tenía 3 bloques `@font-face` que referenciaban `/fonts/*.woff2` files inexistentes → errores OTS en consola, fuentes no cargaban offline.  
**Fix:** Eliminados los bloques `@font-face` rotos. Fuentes cargadas 100% desde Google Fonts CDN. `index.html` actualizado para incluir JetBrains Mono (`wght@400;500;700`).

---

## ✅ BUG-R18 — Budgets: panel inferior separado al agregar límite
**Commit:** `b842727`  
**Causa:** Al hacer click en "+ Límite" para categorías sin presupuesto, aparecía un panel flotante en la parte inferior de la pantalla — UX inconsistente con el resto.  
**Fix:** Input inline dentro de cada fila de categoría sin presupuesto. Mismo patrón que las filas existentes (`isAddEdit = editCat === cat`). Borde amber al editar.

---

## ✅ BUG-R19 — Subcategorias: sin rename inline + categorías vacías ocultas
**Commit:** `012372b`  
**Causa:** (1) Las subcategorías no eran editables — solo eliminar/agregar. (2) Solo se mostraban las categorías que tenían subcategorías en `config.subcategorias`, ocultando las demás.  
**Fix:** Click en nombre de subcategoría → input inline con `autoFocus`, Enter guarda, Escape cancela. `allCatKeys` = unión de `Object.keys(config.categorias)` + `Object.keys(subcats)` → todas las categorías visibles.

---

## ✅ BUG-R20 — project_files RLS: anon podía leer/escribir
**Vía:** Supabase MCP migration `fix_project_files_rls` (2026-05-17)  
**Causa:** La policy `allow_all_project_files` tenía `USING (true)` — cualquier usuario (incluso anónimo) podía SELECT/INSERT/UPDATE/DELETE en `project_files`.  
**Fix:** Dropped `allow_all_project_files`. Created `project_files_authenticated_read`: `FOR SELECT TO authenticated USING (auth.role() = 'authenticated')`. Anon bloqueado.

---

## ✅ BUG-R21 — Cuentas: balance calculado desde movimientos
**Commit:** `c52da61`  
**Causa:** `AccountDetail.tsx` mostraba `cuenta.saldo_inicial` sin sumar los movimientos reales → saldo incorrecto para cuentas con actividad.  
**Fix:** `realBalance = balanceOverride ?? saldoInicial + SUM(movimientos WHERE cuenta_id=X AND deleted_at IS NULL)`. Query a movimientos en `useEffect` con `householdId`. Muestra a 50% opacidad mientras carga.

---

## ✅ BUG-R22 — tasas_cambio mes 'global' — verificado, por diseño
**Estado:** VERIFICADO — no es bug  
**Verificación:** `useTasas.ts` usa `.eq('mes', 'global')` para leer la tasa activa. `saveTasas()` también graba con `mes: 'global'` y además persiste en `tasas_historicas` para historial. Diseño correcto.

---

## ✅ BUG-R23 — useAccounts usaba userId en lugar de householdId
**Commit:** `0153570`  
**Causa:** `useAccounts.ts` filtraba `cuentas` con `.eq('user_id', userId)` (auth.uid()), pero `cuentas.user_id = householdId`. Isabel (auth.uid() ≠ householdId) veía 0 cuentas.  
**Fix:** Cambiar a `householdId = useAuthStore(s => s.householdId)` y `[householdId]` en dependency array. Confirmado por PASO 0 (SUPABASE COUNT: 0 cuentas con Isabel's auth.uid()).
