# MORNING_BRIEF — Mis Finanzas 2026

**Última actualización:** 2026-05-18 (v1.0.3 — build fix CF Pages + CLAUDE.md)

---

## ⚡ Estado actual

### Apps en paralelo
| App | Versión | Estado | Deploy |
|-----|---------|--------|--------|
| **Vanilla JS** `version_actual/` | batch54 | Productivo. 1300+ movimientos reales. Sin cambios en sprint React. | https://finanzasprueba.pages.dev |
| **React App** `version_actual/react-app/` | **v1.0.3** | 31 rutas ✅. Supabase real. Build ✅ 0 errores. | react-preview → CF Pages auto-build |

### Git React App
- **Branch activo:** `develop` → push también a `react-preview`
- **Último commit:** `8faba93` docs(claude): añadir contexto React App v1.0.3

### Commits recientes
```
8faba93 docs(claude): añadir contexto React App v1.0.3 a CLAUDE.md
f6e7262 fix(build): MovSum.total → MovSum.amount — resuelve error TS en CF Pages
76157b0 docs: SESSION + MORNING_BRIEF + PENDIENTES + FLUJO_APP v1.0.3
fce3797 docs: BUG-R24/R25/R26 resueltos, historial v1.0.3
9fe7992 fix(data): balance real cuentas + tasas por mes activo
6ab2a97 fix(crash): null guard CatIcon.cat + txnGroup.tipo
5e672eb perf(auth): login instantaneo F5 cache householdId
```

---

## ✅ Completado (sprint bugfix May 2026)

### React App v1.0.3 — bugs resueltos
| Bug | Fix | Commit |
|-----|-----|--------|
| BUG-R01 | inferType null guard en useAccounts | `3fb0c3d` |
| BUG-R02 | user_id=householdId + subcat/method NOT NULL | `4876604` |
| BUG-R03 | Transfer: cuentas reales, Supabase real | `b6e5b61` |
| BUG-R04 | Fire: shape `{goal:{meta,extra,plazo,actual}}` | `134073a` |
| BUG-R05 | ListaCompras: schema JSONB `{id,nombre,cantidad,precio,checked}` | `0e7a420` |
| BUG-R06 | Auth: provisionar household+config al registrar | `224929c` |
| BUG-R07 | Recurrentes: campo recDia separado | `c8d77f8` |
| BUG-R08 | Home: fondo_emergencia desde tabla DB | `c8657c6` |
| BUG-R09 | Appearance: tema+acento init en main.tsx (sin FOUC) | `493aca5` |
| BUG-R10 | Profile: nombre refleja en Zustand store | `14cbe63` |
| BUG-R11 | Pareja: household_members reales | `6f4bd20` |
| BUG-R12 | TxnDetail: edit = soft-delete + recrear | `40312ab` |
| BUG-R13 | NewTransaction: hoja confirmación pre-save | `4bcdd77` |
| BUG-R14 | Home: pronóstico con recurrentes pendientes | `ef563d6` |
| BUG-R15 | Escanear: OCR real Groq Vision llama-3.2-11b | `37508bb` |
| BUG-R16 | Metas: inline edit + overflow mobile | `232cefd` |
| BUG-R17 | Fonts: @font-face rotos → Google Fonts CDN | `8da7cc0` |
| BUG-R18 | Budgets: inline edit dentro de fila | `b842727` |
| BUG-R19 | Subcategorias: rename inline + todas las cats | `012372b` |
| BUG-R20 | project_files RLS: anon bloqueado | MCP migration |
| BUG-R21 | AccountDetail: balance = saldoInicial + SUM(movimientos) | `c52da61` |
| BUG-R22 | useTasas: mes 'global' — verificado, ahora por mes activo | `9fe7992` |
| BUG-R23 | useAccounts: householdId en query cuentas | `0153570` |
| BUG-R24 | CatIcon.cat null crash + txnGroup null guard | `6ab2a97` |
| BUG-R25 | useAccounts: balance real (2 queries paralelas + SUM) | `9fe7992` |
| BUG-R26 | useTasas: tasa por mesActivo con fallback 'global' | `9fe7992` |

---

## ⏳ Pendiente React App

| Item | Prioridad |
|------|-----------|
| **Bloque 3: Charts recharts** — AreaChart Home, DonutChart Txn/Analisis | 🔴 Próximo |
| Groq Worker Cloudflare (sacar API key del frontend) | 🟡 |
| Fonts offline woff2 en /public/fonts/ | 🟠 |
| Invite pareja real (Supabase email invite) | 🟠 |
| Settings/Categories: color picker por categoría | 🟠 |
| Analisis: comparativa mes anterior real | 🟠 |

---

## 🗺️ Próxima sesión — Bloque 3 Charts

```
Lee: CLAUDE.md + MORNING_BRIEF.md + REACT_APP_STATUS.md

TAREA: npm install recharts → AreaChart ingresos/gastos 6M en Home
       DonutChart top-5 categorías en Txn o Analisis
       Colores: catColor(), tokens var(--pos)/var(--neg)/var(--ink-2)
       Build 0 errores → commit → push develop + react-preview

CONTEXTO CRÍTICO:
- user_id inserts: householdId (NUNCA auth.uid())
- subcat/method: siempre '' (NOT NULL)
- mes DB: "Mayo" | store: "may-26" → mesIdToDbKey()
- household_id: fa3f7b3b-148b-4dea-8e2a-37f740c08b3d
- Supabase: jcgoccaisemrfsuwwrrl.supabase.co
```

---

## 📐 Arquitectura React App

```
src/
├── components/
│   ├── brand/   Logo, AppIcon
│   ├── shell/   AppShell, TabBar, FAB, AuthGuard, ErrorBoundary, SkeletonScreen, Toast
│   ├── ui/      Sparkline, Pill, CatIcon (null-safe), catColor()
│   └── icons/   Icons.tsx (SVG set)
├── store/
│   ├── auth.ts  isAuthenticated, userId, householdId (persistidos), userName
│   ├── prefs.ts mesActivo ("may-26"), moneda, ocultarMontos
│   └── toast.ts
├── hooks/
│   ├── useAuth.ts        fast-path cache, provisionHousehold
│   ├── useAccounts.ts    2 queries paralelas, balance real
│   ├── useTransactions.ts household_id, mesIdToDbKey
│   ├── useConfig.ts      upsert, DEFAULTS fallback
│   ├── useTasas.ts       mesActivo + fallback global
│   ├── useKPIs.ts        null guards tipos
│   └── useFormat.ts
├── pages/        31 rutas — todas conectadas Supabase real
└── lib/
    ├── supabase.ts
    ├── mes.ts     mesIdToDbKey("may-26" → "Mayo")
    └── handleError.ts
```

---

## 🧹 Reglas irrompibles

1. Claude NO ejecuta deploys — Anthony hace wrangler/CF Pages
2. TypeScript strict: 0 errores antes de commit
3. Commits atómicos — 1 feature = 1 commit
4. Push después de CADA commit: `origin develop` + `origin develop:react-preview`
5. user_id en INSERT movimientos = householdId (NUNCA auth.uid())
6. subcat/method: NUNCA null → siempre `''`
7. Edición movimientos: soft-delete + INSERT nuevo UUID
8. SUPABASE_SCHEMA.md consultar antes de cualquier query nueva
