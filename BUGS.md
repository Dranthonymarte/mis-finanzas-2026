# BUGS.md — Mis Finanzas 2026
*Actualizar al trabajar cada bug*

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
