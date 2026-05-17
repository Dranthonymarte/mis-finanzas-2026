# MORNING_BRIEF — Mis Finanzas 2026

**Última actualización:** 2026-05-17 (cierre sesión bugfix sprint — v1.0.1)

---

## ⚡ Estado actual del proyecto (17 May 2026)

### Dos apps en paralelo
| App | Estado | Deploy |
|-----|--------|--------|
| **Vanilla JS** (`version_actual/`) | Productivo. Supabase conectado, 1319+ movimientos reales. SW: `finanzas-v59-batch54`. Sin cambios en bugfix sprint. | https://c4b2b68d.finanzasprueba.pages.dev |
| **React App** (`version_actual/react-app/`) | **v1.0.1-bugfix**. Supabase real en TODAS las pantallas. 31 rutas ✅. 20+ bugs corregidos. Branch `react-preview` → Cloudflare Pages auto-build | https://[react-preview-url].pages.dev |

### Git — React App
- **Rama activa:** `develop`
- **Último commit:** `63890d7` docs: actualizar SUPABASE_SCHEMA + REACT_APP_STATUS con estado post-bugfix
- **Push to:** `origin/develop` + `origin/react-preview`

### Historial de commits React App (más recientes)
```
63890d7 docs: actualizar SUPABASE_SCHEMA + REACT_APP_STATUS
012372b feat(subcategorias): rename inline + todas las categorías (BUG-R19)
b842727 fix(budgets): inline edit por fila, sin panel separado (BUG-R18)
8da7cc0 fix(fonts): eliminar @font-face rotos, CDN JetBrains Mono (BUG-R17)
232cefd fix(metas): inline edit en MetaCard + overflow mobile (BUG-R16)
37508bb feat(escanear): OCR real Groq Vision + API key en Security (BUG-R15)
ef563d6 fix(home): pronóstico recurrentes + nombre dinámico (BUG-R14)
4bcdd77 feat(new-txn): hoja confirmación pre-save (BUG-R13)
40312ab fix(txn-detail): soft-delete + recreate en saveEdit (BUG-R12)
6f4bd20 fix(pareja): household_members reales desde Supabase (BUG-R11)
14cbe63 fix(profile): update Zustand store al guardar nombre (BUG-R10)
493aca5 fix(appearance): theme+accent init en main.tsx antes del render (BUG-R09)
c8657c6 fix(home): fondo_emergencia desde tabla DB (BUG-R08)
c8d77f8 fix(recurrentes): recDia campo separado (BUG-R07)
224929c fix(auth): provisionar household+config al registrar (BUG-R06)
0e7a420 fix(lista-compras): schema JSONB real (BUG-R05)
134073a fix(fire): shape real fire_config {goal:{...}} (BUG-R04)
b6e5b61 feat(transfer): rewrite con cuentas reales y Supabase (BUG-R03)
4876604 fix(data): user_id=householdId + subcat/method NOT NULL (BUG-R02)
3fb0c3d fix(crash): null guard en inferType useAccounts (BUG-R01)
```

---

## ✅ Lo que se completó en el bugfix sprint (2026-05-16 / 17)

### React App — Checkpoint C completado
- **Supabase real** en TODAS las pantallas (antes: mock data)
- **movimientos:** 1319+ rows reales — `user_id = householdId`, `subcat/method` siempre `''`
- **Edición inmutable:** soft-delete + recrear en TxnDetail (audit trail preservado)
- **Confirmación pre-save** en NewTransaction antes de insertar
- **OCR real** en Escanear: Groq Vision `llama-3.2-11b-vision-preview` + API key en Security
- **Transfer:** reescritura con cuentas reales, par DEBIT/CREDIT con `pair_id`
- **Fire, Lista Compras, Recurrentes:** conectados al shape real de DB
- **Fonts:** @font-face rotos eliminados, Google Fonts CDN (Inter + Instrument Serif + JetBrains Mono)
- **RLS:** `project_files` bloqueado para anon (solo authenticated SELECT)
- **Metas:** inline edit en MetaCard
- **Subcategorias:** rename inline + mostrar todas las categorías
- **Budgets:** inline edit en cada fila (sin panel separado)
- **Pronóstico Home:** incluye recurrentes pendientes del mes
- **Tema/Acento:** inicializados en main.tsx antes del primer render (sin FOUC)

### Documentación actualizada
- `SUPABASE_SCHEMA.md` — schema real actualizado (mes="Mayo" no ISO, tipos en español, subcat='')
- `REACT_APP_STATUS.md` — v1.0.1-bugfix, 31 rutas ✅, tablas seguridad, pendientes futuros
- `BUGS.md` — sección React App Sprint (BUG-R01 a BUG-R22)
- `FLUJO_APP.md` — tabla React App actualizada, Checkpoint C ✅
- `MORNING_BRIEF.md` — este archivo

---

## ⏳ Pendiente React App

| Item | Prioridad | Notas |
|------|-----------|-------|
| BUG-R21: Balance cuentas = saldo_inicial + movimientos reales | 🔴 Alta | AccountDetail.tsx muestra saldo incorrecto |
| BUG-R22: tasas_cambio mes 'global' vs mesActivo | 🟡 Media | Verificar si realmente hay bug |
| Bloque 3: Charts recharts (Home/Txn) | 🟡 Media | AreaChart ingresos/gastos, Donut categorías |
| Groq Worker Cloudflare (sacar key del frontend) | 🟡 Media | Por ahora: localStorage |
| Fonts offline (woff2 en /public/fonts/) | 🟠 Baja | Por ahora: CDN |
| Invite pareja real (email link Supabase) | 🟠 Baja | Por ahora: comparte household_id manual |

---

## 🗺️ Próxima sesión — Bloque 3 Charts

```
Lee CLAUDE.md, MORNING_BRIEF.md, REACT_APP_STATUS.md, SUPABASE_SCHEMA.md antes de cualquier acción.

CONTEXTO RÁPIDO:
- Proyecto: Mis Finanzas 2026 — finanzas personales hogar (Anthony + Isabel)
- Stack React: Vite 8, React 19, TypeScript 6 (strict), react-router-dom v7, zustand v5
- Branch activo: develop → push también a react-preview (CF Pages auto-build)
- Último commit: 63890d7 — post-bugfix sprint completo
- Design system: dark ink, amber accent, Instrument Serif display, tokens.css

ESTADO:
- v1.0.1-bugfix ✅: 31 rutas funcionando, Supabase real en todo, 0 mock data
- BUG-R21 ⏳: Account balance (alta prioridad)
- Bloque 3 ⏳: Charts con recharts (PRÓXIMO)

REGLAS CRÍTICAS:
- user_id en INSERT movimientos = householdId (NUNCA auth.uid())
- subcat/method: SIEMPRE '' (NOT NULL en DB), NUNCA null
- Edición movimientos: soft-delete (deleted_at=now()) + INSERT nuevo UUID
- mes en DB = "Mayo" (español). Store prefs = "may-26". Convertir con mesIdToDbKey()
- household_id activo: fa3f7b3b-148b-4dea-8e2a-37f740c08b3d
- Supabase URL: https://jcgoccaisemrfsuwwrrl.supabase.co

GIT PUSH (SIEMPRE PowerShell):
/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command
"cd 'C:\Users\Anthony Marte\Documents\Documentos de Anthony\Proyectos Anthony\APP WEB - FINANZAS\version_actual\react-app'; git push origin develop develop:react-preview 2>&1"
(exit 1 = normal — PowerShell trata stderr de git como error)

PRÓXIMA TAREA — BUG-R21 + Bloque 3:
1. BUG-R21: Corregir AccountDetail.tsx — balance = saldo_inicial + SUM(movimientos reales)
2. Bloque 3: recharts AreaChart (ingresos vs gastos 6m) en Home, DonutChart categorías en /txn
Mismos design tokens: ink-2 cards, amber/pos/neg, tooltips oscuros, mismo responsive.
```

---

## 📐 Arquitectura React App

```
src/
├── components/
│   ├── brand/        Logo.tsx, AppIcon
│   ├── shell/        AppShell, TabBar, FAB, AuthGuard, RowGroup, RowLink,
│   │                 ErrorBoundary, SkeletonScreen, Toast
│   ├── ui/           Sparkline, Pill, CatIcon, catColor()
│   └── icons/        Icons.tsx (stroke SVG set)
├── store/
│   ├── app.ts        fabOpen, activeTab, navDirection
│   ├── auth.ts       hasSeenOnboarding, pin, userName, isAuthenticated
│   └── toast.ts      toasts[]
├── hooks/
│   ├── useAuth.ts    signIn, signUp, signOut, provisioning
│   ├── useAccounts.ts
│   ├── useMovimientos.ts
│   ├── useConfig.ts  config_usuario (recurrentes, metas, presupuestos, tipos…)
│   ├── useFormat.ts  fmt(), mesIdToDbKey()
│   ├── useTasa.ts    tasa BCV desde tasas_cambio
│   └── useHousehold.ts
├── pages/
│   ├── Onboarding / Login
│   ├── Home / Txn / Accounts / AI / More
│   ├── NewTransaction / AccountDetail / NewAccount / Transfer
│   ├── Fire / Metas / Pareja / Recurrentes / ListaCompras
│   ├── Buscar / VozTxn / CsvImport / Analisis
│   ├── Escanear / Notificaciones / DineroFuera / TxnDetail
│   └── settings/ Profile, Categories, Budgets, Appearance, Security, Tipos, Subcategorias
├── lib/
│   └── supabase.ts   createClient + tipos
└── styles/
    ├── tokens.css    design tokens (sin @font-face — CDN)
    ├── mobile-uix.css
    └── index.css
```

---

## 🧹 Reglas de sesión irrompibles

1. Claude NO ejecuta deploys — solo edita `version_actual/`. Anthony hace `wrangler`/CF Pages.
2. Código top-3 mundial — limpio, sin duplicados, TypeScript estricto, 0 errores en build.
3. Ante ambigüedad → preguntar. No suponer. Operaciones destructivas → confirmación.
4. Auto-monitoreo contexto: ≥25% avisar, ≥30% sugerir `/close`.
5. GitHub: push force, merge a main, eliminar ramas → confirmación explícita.
6. FLUJO_APP.md = mapa funcional app — consultar antes de wirear lógica.
7. SUPABASE_SCHEMA.md = consultar antes de cualquier query.
8. Commits atómicos (1 feature = 1 commit). Siempre build 0 errores antes de commit.
