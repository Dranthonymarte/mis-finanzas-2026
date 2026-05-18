# REACT_APP_STATUS.md — Estado del React App

> Documento vivo. Actualizar al cerrar cada sesión.
> Fuente de verdad para la nueva UIX (react-app/).
> **Última actualización:** 2026-05-17 sesión 2 (33 bugs corregidos — v1.0.3-bugfix)

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
| `/` | Home.tsx | ✅ | userName dinámico, EF desde fondo_emergencia DB, pronóstico con recurrentes |
| `/txn` | Txn.tsx | ✅ | Filter chips, date groups, subtotales, CatIcon |
| `/accounts` | Accounts.tsx | ✅ | Cards gradiente radial, Sparkline, trend |
| `/ia` | AI.tsx | ✅ | Chat real, MiniChart, chips, input bar |
| `/more` | More.tsx | ✅ | grid 4×4 + RowGroups config + logout |
| `/new-txn` | NewTransaction.tsx | ✅ | Confirmación pre-save, user_id=householdId, subcat='' |
| `/accounts/:id` | AccountDetail.tsx | ✅ | Balance hero, stats, txn filtrado, eliminar |
| `/new-account` | NewAccount.tsx | ✅ | Preview vivo, tipo/moneda/color picker |
| `/transfer` | Transfer.tsx | ✅ | AccountPicker, 2 rows DEBIT/CREDIT, user_id=householdId |
| `/fire` | Fire.tsx | ✅ | Regla 4%, shape real {goal:{meta,extra,plazo,actual}} |
| `/metas` | Metas.tsx | ✅ | Circular progress, inline abono, **inline edit** |
| `/notificaciones` | Notificaciones.tsx | ✅ | Form creación + lista activas |
| `/dinero-fuera` | DineroFuera.tsx | ✅ | Abono inline, marcar pagado |
| `/buscar` | Buscar.tsx | ✅ | Search global ilike debounced, navega /txn/:id |
| `/voz` | VozTxn.tsx | ✅ | Web Speech API es-VE, prefill sessionStorage |
| `/csv-import` | CsvImport.tsx | ✅ | Parse+preview+bulk insert, user_id=householdId |
| `/analisis` | Analisis.tsx | ✅ | Bar charts cat/tipo, top gastos, mes selector |
| `/recurrentes` | Recurrentes.tsx | ✅ | CRUD config.recurrentes, recDia (día del mes) |
| `/lista-compras` | ListaCompras.tsx | ✅ | Schema JSONB real — items[]{id,nombre,cantidad,precio,checked} |
| `/escanear` | Escanear.tsx | ✅ | **OCR real** Groq Vision llama-3.2-11b, editar+guardar movimiento |
| `/pareja` | Pareja.tsx | ✅ | Real household_members desde Supabase |
| `/txn/:id` | TxnDetail.tsx | ✅ | Soft-delete + recrear en edit, user_id=householdId |
| `/settings` | Settings.tsx | ✅ | Estructura completa |
| `/settings/profile` | settings/Profile.tsx | ✅ | Edita nombre real, refleja en store |
| `/settings/categories` | settings/Categories.tsx | ✅ | CRUD categorías |
| `/settings/budgets` | settings/Budgets.tsx | ✅ | Inline edit en cada fila (no panel separado) |
| `/settings/appearance` | settings/Appearance.tsx | ✅ | Tema dark/light/system + accent picker |
| `/settings/security` | settings/Security.tsx | ✅ | Cambio contraseña + **Groq API key storage** |
| `/settings/tipos` | settings/Tipos.tsx | ✅ | CRUD tipos, toggle esIngreso, protect built-ins |
| `/settings/subcategorias` | settings/Subcategorias.tsx | ✅ | CRUD completo — rename inline + todas las cats |

---

## 🔐 Seguridad

| Item | Estado |
|------|--------|
| Groq API key → localStorage `fin_groq_api_key` (configurable en Ajustes → Seguridad) | ✅ |
| Sin `gsk_` en código fuente ni en dist/ | ✅ |
| project_files RLS: anon bloqueado, SELECT solo authenticated | ✅ (BUG-25 fix 2026-05-17) |
| RLS USING(false) en deprecated + working_version_files + vapid_config | ✅ |
| ErrorBoundary wrapeando Routes | ✅ |
| handleError en todos los hooks de datos | ✅ |
| React.lazy() todas las rutas | ✅ |
| Suspense con SkeletonScreen amber pulse | ✅ |
| PWA manifest.webmanifest standalone+portrait+#0a0b0d | ✅ |
| icon-192.png + icon-512.png generados | ✅ |
| Toast store + componente global | ✅ |
| Fonts: CDN Google Fonts (Inter + Instrument Serif + JetBrains Mono) — @font-face rotos eliminados | ✅ |

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

## 📝 Commit history (React App — bugfix sprint)

```
9fe7992 fix(data): balance real en cuentas + tasas por mes activo (BUG-R25/R26)
6ab2a97 fix(crash): null guard en CatIcon.cat + txnGroup.tipo (BUG-R24)
5e672eb perf(auth): login instantaneo en F5 via cache householdId persistido
0153570 fix(data): useAccounts usa householdId en lugar de userId (BUG-R23)
c52da61 fix(crash): null guards toLowerCase + balance real en AccountDetail (BUG-R21)
fabc1c8 fix(new-txn): eliminar variable userId no usada (TS6133)
98122bf docs: actualizar MDs restantes post-bugfix sprint React App v1.0.1
63890d7 docs: actualizar SUPABASE_SCHEMA + REACT_APP_STATUS con estado post-bugfix
012372b feat(subcategorias): CRUD completo — rename inline + todas las cats (BUG-R19)
b842727 fix(budgets): inline edit dentro de cada fila (BUG-R18)
8da7cc0 fix(fonts): eliminar @font-face rotos, CDN incluye JetBrains Mono (BUG-R17)
232cefd fix(metas): inline edit + overflow mobile en MetaCard (BUG-R16)
37508bb feat(escanear): OCR real via Groq Vision + API key en Seguridad (BUG-R15)
ef563d6 fix(home): pronostico recurrentes pendientes + nombre dinamico header (BUG-R14)
4bcdd77 feat(new-txn): hoja de confirmacion antes de guardar movimiento (BUG-R13)
...      [commits anteriores BUG-R01 a BUG-R12 en sesiones anteriores]
```

---

## 🔑 Datos críticos

```
household_id:  fa3f7b3b-148b-4dea-8e2a-37f740c08b3d
Supabase URL:  https://jcgoccaisemrfsuwwrrl.supabase.co
Proyecto ID:   jcgoccaisemrfsuwwrrl
Autores:       Anthony (A) | Isabel (I)
Monedas:       USD | VES (BCV rate de tasas_cambio)
Movimientos:   1319+ rows — SIEMPRE deleted_at IS NULL
Regla crítica: NUNCA UPDATE amount/tipo/fecha → soft-delete + recrear
user_id en INSERT: SIEMPRE householdId (UUID del household). NUNCA auth.uid()
Transferencias: par Transferencia Interna {amount:-N} + {amount:+N}
mes DB:        "Mayo" (nombre español) — prefs store: "may-26" — convertir con mesIdToDbKey()
subcat/method: NUNCA null → siempre '' (NOT NULL en DB)
```

---

## 📌 Pendientes futuros

| Item | Prioridad |
|------|-----------|
| settings/Categories — CRUD colores por categoría | 🟡 Media |
| Analisis — comparativa mes anterior real con recharts | 🟡 Media |
| Worker Cloudflare para Groq OCR (no exponer key en frontend localStorage) | 🟡 Media |
| Fonts self-hosted PWA offline: crear /public/fonts/ con woff2 reales | 🟠 Baja |
| Invite real a pareja (email link via Supabase invite) | 🟠 Baja |
| useAuth.ts: paralelizar resolveHousehold para login más rápido en mobile | ✅ Resuelto 5e672eb |
