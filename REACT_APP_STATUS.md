# REACT_APP_STATUS.md — Estado del React App

> Documento vivo. Actualizar al cerrar cada sesión.
> Fuente de verdad para la nueva UIX (react-app/).
> **Última actualización:** 2026-05-17 (BLOQUEs 6-9 completados — v1.0.0-rc)

---

## 📍 Ubicación y acceso

```
Proyecto local: version_actual/react-app/
Branch:         develop (+ push a react-preview para Cloudflare Pages)
Cloudflare:     Branch react-preview → auto-build
Git push:       SIEMPRE con PowerShell (bash no tiene auth):
  /c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command
  "cd '...react-app'; git push origin develop develop:react-preview 2>&1"
  (exit 1 = normal — PowerShell trata stderr de git como error)
```

---

## ✅ Pantallas completadas

| Ruta | Archivo | Estado | Notas |
|------|---------|--------|-------|
| `/onboarding` | Onboarding.tsx | ✅ | 3 slides, warm bg, A1 mockup |
| `/login` | Login.tsx | ✅ | PIN 4 dígitos, shake, A2 mockup |
| `/` | Home.tsx | ✅ | Hero, Sparkline, KPI 2×2, Insight, TxnPreview |
| `/txn` | Txn.tsx | ✅ | Filter chips, date groups, subtotales, CatIcon |
| `/accounts` | Accounts.tsx | ✅ | Cards gradiente radial, Sparkline, trend |
| `/ia` | AI.tsx | ✅ | Chat real, MiniChart, chips, input bar |
| `/more` | More.tsx | ✅ | BLOQUE 9 — grid 4×4 + RowGroups config + logout |
| `/new-txn` | NewTransaction.tsx | ✅ | Full screen, tipo/monto/cat/cuenta/autor, mes fix |
| `/accounts/:id` | AccountDetail.tsx | ✅ | Balance hero, stats, txn filtrado, eliminar |
| `/new-account` | NewAccount.tsx | ✅ | Preview vivo, tipo/moneda/color picker |
| `/transfer` | Transfer.tsx | ✅ | AccountPicker, monto teal, par DEBIT/CREDIT |
| `/fire` | Fire.tsx | ✅ | Regla 4%, simulador, useFormat |
| `/metas` | Metas.tsx | ✅ | Circular progress, inline abono |
| `/notificaciones` | Notificaciones.tsx | ✅ | Form creación + lista activas |
| `/dinero-fuera` | DineroFuera.tsx | ✅ | Abono inline, marcar pagado |
| `/buscar` | Buscar.tsx | ✅ | Search global ilike debounced, navega /txn/:id |
| `/voz` | VozTxn.tsx | ✅ | Web Speech API es-VE, prefill sessionStorage |
| `/csv-import` | CsvImport.tsx | ✅ | Parse+preview+bulk insert mesIdToDbKey |
| `/analisis` | Analisis.tsx | ✅ | Bar charts cat/tipo, top gastos, mes selector |
| `/recurrentes` | Recurrentes.tsx | ✅ | CRUD config.recurrentes, form inline |
| `/lista-compras` | ListaCompras.tsx | ✅ | Supabase listas_compras, toggle/soft-delete |
| `/settings` | Settings.tsx | ⚠️ | Estructura básica |
| `/settings/profile` | settings/Profile.tsx | ⚠️ | Placeholder |
| `/settings/categories` | settings/Categories.tsx | ⚠️ | Placeholder |
| `/settings/budgets` | settings/Budgets.tsx | ✅ | Presupuestos con progreso real |
| `/settings/appearance` | settings/Appearance.tsx | ⚠️ | Placeholder |
| `/settings/security` | settings/Security.tsx | ⚠️ | Placeholder |
| `/settings/tipos` | settings/Tipos.tsx | ✅ | CRUD tipos, toggle esIngreso, protect built-ins |
| `/settings/subcategorias` | settings/Subcategorias.tsx | ✅ | Collapsible, CRUD por cat |

---

## 🔐 Seguridad (BLOQUE 8)

| Item | Estado |
|------|--------|
| Groq API key → .env.local (VITE_GROQ_API_KEY) | ✅ |
| Sin `gsk_` en código fuente ni en dist/ | ✅ |
| RLS USING(false) en 4 tablas deprecated | ✅ |
| ErrorBoundary wrapeando Routes | ✅ |
| handleError en todos los hooks de datos | ✅ |
| React.lazy() todas las rutas | ✅ |
| Suspense con SkeletonScreen amber pulse | ✅ |
| PWA manifest.webmanifest standalone+portrait+#0a0b0d | ✅ |
| icon-192.png + icon-512.png generados | ✅ |
| Toast store + componente global | ✅ |

---

## 🧩 Componentes del design system

### ui/ (primitivos)
| Componente | Props clave | Uso |
|------------|------------|-----|
| `Sparkline` | `data, color, w, h, fill, stroke` | Mini chart SVG sin dependencias |
| `Pill` | `tone, size` (pos/neg/amber/info/mute, xs/sm/md) | Badge de estado |
| `CatIcon` | `cat, size` — auto-color por nombre | Ícono de categoría |
| `catColor(cat)` | helper — devuelve hex por nombre de cat | |

### brand/
| Componente | Props | Uso |
|------------|-------|-----|
| `AppIcon` | `size` | Ícono bar-chart amber (onboarding, login, settings) |
| `Logo` | `iconSize, textSize, color` | Lockup completo brand |

### shell/
| Componente | Notas |
|------------|-------|
| `AppShell` | Layout route con `<Outlet />` + TabBar + Toast |
| `TabBar` | 5 tabs (Menú label) + FAB cell |
| `FAB` | Overlay con 5 acciones: Buscar/CSV/Voz/Transferir/Movimiento |
| `ErrorBoundary` | Catch render errors, muestra UI de recuperación |
| `SkeletonScreen` | Suspense fallback, 3 amber dots pulsantes |
| `Toast` | Notificaciones globales desde useToastStore |
| `AuthGuard` | `RequireAuth` + `RequireNoAuth` layout routes |
| `RowGroup` | Contenedor de lista con título |
| `RowLink` | Fila de lista con icon, label, sub, chevron |

---

## ⚙️ Build y deploy

```bash
# Build
cd version_actual/react-app
npm run build   # tsc -b && vite build

# Build flags importantes
build.cssMinify = false  # lightningcss falla con combined selectors

# TypeScript strict
noUnusedLocals: true
noUnusedParameters: true
verbatimModuleSyntax: true  # → import { type X } en lugar de import { X }

# Push (SIEMPRE PowerShell)
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command
  "cd '...react-app'; git push origin develop develop:react-preview 2>&1"
```

---

## 📝 Commit history (React App)

```
92f46da feat(app): FAB voz busqueda CSV NewTransaction  ← BLOQUE 6+7
97c370c feat(secondary): BLOQUE 5 — pantallas secundarias mejoradas
0edd5ac feat(accounts): BLOQUE 4 — Cuentas + AccountDetail con datos reales
bf429d7 feat(txn): BLOQUE 3 — Movimientos completo con prefs + presupuesto
35a6200 feat(home): BLOQUE 2 — Home completo 11 secciones datos reales
a0caec6 feat(format): BLOQUE 1 — useFormat en todos los componentes
```

---

## 🔑 Datos críticos

```
household_id:  fa3f7b3b-148b-4dea-8e2a-37f740c08b3d
Supabase URL:  https://jcgoccaisemrfsuwwrrl.supabase.co
Proyecto ID:   jcgoccaisemrfsuwwrrl
Autores:       Anthony (A) | Isabel (I)
Monedas:       USD | VES (BCV rate de tasas_cambio)
Movimientos:   682+ rows — SIEMPRE deleted_at IS NULL
Regla crítica: NUNCA UPDATE amount/tipo/fecha → soft-delete + recrear
Transferencias: par TRANSFER_DEBIT + TRANSFER_CREDIT con pair_id lógico
mes DB:        "Mayo" (nombre español) — prefs store: "may-26"
```

---

## 📌 Pendientes futuros

| Item | Prioridad |
|------|-----------|
| settings/Profile — editar nombre real desde DB | 🟡 Media |
| settings/Categories — CRUD colores | 🟡 Media |
| settings/Appearance — dark/light theme toggle real | 🟠 Baja |
| settings/Security — cambiar PIN | 🟠 Baja |
| Analisis — comparativa mes anterior | 🟠 Baja |
| Transferencia — fix Transfer.tsx con pair_id | 🟡 Media |
| Worker de Cloudflare para Groq (no exponer key en frontend) | 🔴 Alta (post v1) |
