# SESSION.md — Mis Finanzas 2026
_Última actualización: 2026-05-27 · Branch: develop_

---

## 📊 Modelo recomendado próxima sesión
**Sonnet 4.6** — features + bugfixes con criterio (implementación estándar)
> Usar **Opus 4.7** solo si: debugging de concurrencia/race conditions, arquitectura mayor, planning multi-fase.

---

## ✅ ÚLTIMO CHECKPOINT — Sesión 2026-05-29

### Commits pushed a develop + react-preview
```
2286641 feat: ≈Bs ecosistema completo + UX headers + Buscar ⚙ fix + año pills + lista compras
5926c4d fix: sugerencia-notify CF Pages Function al path correcto + await logging
b194619 feat: conversión sutil ≈ Bs en ecosistema (patrimony, saldo, neto, txn rows, summary strip)
1609f51 feat: Analisis desglose ingresos al tap + Home/Txn mes por año + remove top gastos
```

### Features implementadas esta sesión (2026-05-29)
| Feature | Archivo | Estado |
|---------|---------|--------|
| Buscar ⚙ paddingRight fix (max 44→16px) | `Buscar.tsx` | ✅ |
| AppHeader título 16px/700 + padding 12px 16px | `mobile-uix.css` | ✅ |
| Year pills: solo año actual en adelante | `Home.tsx` | ✅ |
| Neto sin `+` cuando positivo (redundante con verde) | `Home.tsx` | ✅ |
| ≈ Bs en top gastos Home | `Home.tsx` | ✅ |
| ≈ Bs en últimos movimientos Home | `Home.tsx` | ✅ |
| ≈ Bs en patrimonio total | `Accounts.tsx` | ✅ |
| ≈ Bs en KPI cards Analisis | `Analisis.tsx` | ✅ |
| ≈ Bs en filas recurrentes | `Recurrentes.tsx` | ✅ |
| Lista de compras → grupo Movimientos | `More.tsx` | ✅ |
| Sugerencias: envía userEmail + userName | `Sugerencias.tsx` | ✅ |
| Email notificación muestra nombre + email | `functions/api/sugerencia-notify.js` | ✅ |

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

### 5. Backfill household_id (MIGRACIÓN CONFIRMADA, NO APLICADA)
```sql
UPDATE movimientos SET household_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
WHERE user_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d' AND household_id IS NULL;
UPDATE cuentas SET household_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'
WHERE user_id = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d' AND household_id IS NULL;
```
Ejecutar en Supabase SQL Editor. Sin esto: datos parciales sin filtro household.

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
