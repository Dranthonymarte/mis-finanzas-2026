# MORNING_BRIEF — Mis Finanzas 2026

**Última actualización:** 2026-05-26 (sesión arch cleanup + fixes A+B+C+D + multi-user provisioning)

---

## ESTADO DEL PROYECTO

**App:** React App v1.x — production en `mis-finanzas-2026.pages.dev` (CF Pages → main)
**Preview:** `react-preview.pages.dev` (CF Pages → branch react-preview)
**Supabase:** `jcgoccaisemrfsuwwrrl` | household `fa3f7b3b` (Anthony + Isabel)

---

## CAMBIOS SESIÓN 2026-05-26

### Arquitectura
- **Vanilla JS DEPRECADO** — 51 archivos movidos a `versiones_anteriores/vanilla-js-backup/`
- `version_actual/` ahora contiene SOLO `react-app/` + `fonts/` + `.wrangler/`
- Commit raíz: `ce01f95`

### Base de datos (Supabase)
- **Backfill household_id**: 0 NULLs confirmados en movimientos/cuentas/dinero_fuera
- **Trigger `on_auth_user_created_provision_household`**: aplicado — nuevos usuarios reciben household_members automáticamente (owner/accepted + config_usuario)

### React App commits
- `f1f7f23` fix(pareja): invite flow real — signInWithOtp + household_members pending + toast
- `6988e96` fix(pwa): Web Push SW completo (push/notificationclick/subscriptionchange) — injectManifest
- `822197b` feat(calendar): Google Calendar sync UI — /calendar con status, sync, eventos

---

## ESTADO RAMAS

```
repo RAÍZ:      develop  ce01f95 (vanilla JS deprecado)
react-app:      develop  822197b — PENDIENTE push a react-preview + merge main
```

---

## PRÓXIMOS PASOS (orden estricto)

1. **ANTHONY**: Push develop → react-preview → merge main (comandos abajo)
2. **ANTHONY**: Verificación móvil — PWA Chrome Android + datos correctos
3. **ANTHONY**: Groq env var en CF Pages → VITE_GROQ_API_KEY
4. Sesión siguiente: P1.2 Patrimonio Neto + P1.3 Presupuesto + Auditoría 28 bugs

---

## GIT PUSH (Anthony ejecuta)

```powershell
# Push develop + react-preview
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "cd 'C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app'; git push origin develop develop:react-preview 2>&1"
```

```powershell
# Merge a main (producción)
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "cd 'C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app'; git checkout main; git pull origin main; git merge develop --no-ff -m 'merge(prod): session 2026-05-26 — arch cleanup + A+B+C+D fixes + multi-user provisioning'; git push origin main; git checkout develop 2>&1"
```

---

## DATOS CLAVE

- household_id (Anthony + Isabel): `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d`
- Anthony uid: `fa3f7b3b` (owner), Isabel uid: `455c23cd` (partner/accepted)
- Telegram bot v13: OK | Google Login: OK
- 611 movimientos activos | 13 cuentas | 10 dinero_fuera
