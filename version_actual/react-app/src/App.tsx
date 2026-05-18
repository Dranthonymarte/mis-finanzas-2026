// ═══════════════════════════════════════════════════
// App — routing root  (BLOQUE 8)
//
// Layer 1: Auth routes (no shell, warm dark bg)
//   /onboarding  — first-time users
//   /login       — PIN keypad (every launch)
//
// Layer 2: App routes (RequireAuth → AppShell → TabBar)
//   /            — Home
//   /txn         — Movimientos
//   /accounts    — Cuentas
//   /ia          — Asistente IA
//   /more        — Menú
//   /settings/*  — Configuración
//
// Guards:
//   RequireAuth   → redirects to /onboarding or /login
//   RequireNoAuth → redirects authenticated users to /
//
// Performance: all pages are React.lazy() + wrapped in Suspense
// Reliability:  wrapped in ErrorBoundary
// ═══════════════════════════════════════════════════

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell     from './components/shell/AppShell'
import ErrorBoundary from './components/shell/ErrorBoundary'
import SkeletonScreen from './components/shell/SkeletonScreen'
import { RequireAuth, RequireNoAuth } from './components/shell/AuthGuard'
import { useAuth } from './hooks/useAuth'

// ── Auth pages ─────────────────────────────────────
const Onboarding     = lazy(() => import('./pages/Onboarding'))
const Login          = lazy(() => import('./pages/Login'))

// ── Full-screen flows (sin TabBar) ─────────────────
const NewTransaction = lazy(() => import('./pages/NewTransaction'))
const AccountDetail  = lazy(() => import('./pages/AccountDetail'))
const TxnDetail      = lazy(() => import('./pages/TxnDetail'))
const NewAccount     = lazy(() => import('./pages/NewAccount'))
const Transfer       = lazy(() => import('./pages/Transfer'))
const Monedas        = lazy(() => import('./pages/Monedas'))
const Calculadora    = lazy(() => import('./pages/Calculadora'))
const Fire           = lazy(() => import('./pages/Fire'))
const Metas          = lazy(() => import('./pages/Metas'))
const Pareja         = lazy(() => import('./pages/Pareja'))
const Exportar       = lazy(() => import('./pages/Exportar'))
const Escanear       = lazy(() => import('./pages/Escanear'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))
const DineroFuera    = lazy(() => import('./pages/DineroFuera'))
const Buscar         = lazy(() => import('./pages/Buscar'))
const VozTxn         = lazy(() => import('./pages/VozTxn'))
const CsvImport      = lazy(() => import('./pages/CsvImport'))

// ── BLOQUE 9 pages (lazy so they can be added incrementally) ──
const Analisis       = lazy(() => import('./pages/Analisis'))
const Recurrentes    = lazy(() => import('./pages/Recurrentes'))
const ListaCompras   = lazy(() => import('./pages/ListaCompras'))
const TiposSettings  = lazy(() => import('./pages/settings/Tipos'))
const SubcatSettings = lazy(() => import('./pages/settings/Subcategorias'))

// ── Main pages (with TabBar) ───────────────────────
const Home     = lazy(() => import('./pages/Home'))
const Txn      = lazy(() => import('./pages/Txn'))
const Accounts = lazy(() => import('./pages/Accounts'))
const AI       = lazy(() => import('./pages/AI'))
const More     = lazy(() => import('./pages/More'))
const Settings = lazy(() => import('./pages/Settings'))

// ── Settings sub-pages ─────────────────────────────
const Profile    = lazy(() => import('./pages/settings/Profile'))
const Categories = lazy(() => import('./pages/settings/Categories'))
const Budgets    = lazy(() => import('./pages/settings/Budgets'))
const Appearance = lazy(() => import('./pages/settings/Appearance'))
const Security   = lazy(() => import('./pages/settings/Security'))

export default function App() {
  useAuth()
  return (
    <ErrorBoundary>
      <Suspense fallback={<SkeletonScreen />}>
        <Routes>
          {/* ── Auth layer (public, no AppShell) ─────── */}
          <Route element={<RequireNoAuth />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login"      element={<Login />}      />
          </Route>

          {/* ── App layer (protected, with AppShell) ─── */}
          <Route element={<RequireAuth />}>
            {/* Full-screen flows — sin TabBar */}
            <Route path="/new-txn"         element={<NewTransaction />}  />
            <Route path="/accounts/:id"    element={<AccountDetail />}   />
            <Route path="/txn/:id"         element={<TxnDetail />}       />
            <Route path="/new-account"     element={<NewAccount />}      />
            <Route path="/transfer"        element={<Transfer />}         />
            <Route path="/monedas"         element={<Monedas />}         />
            <Route path="/calculadora"     element={<Calculadora />}     />
            <Route path="/fire"            element={<Fire />}            />
            <Route path="/metas"           element={<Metas />}           />
            <Route path="/pareja"          element={<Pareja />}          />
            <Route path="/exportar"        element={<Exportar />}        />
            <Route path="/escanear"        element={<Escanear />}        />
            <Route path="/notificaciones"  element={<Notificaciones />}  />
            <Route path="/dinero-fuera"    element={<DineroFuera />}     />
            <Route path="/buscar"          element={<Buscar />}          />
            <Route path="/voz"             element={<VozTxn />}          />
            <Route path="/csv-import"      element={<CsvImport />}       />
            <Route path="/analisis"        element={<Analisis />}        />
            <Route path="/recurrentes"     element={<Recurrentes />}     />
            <Route path="/lista-compras"   element={<ListaCompras />}    />

            <Route element={<AppShell />}>
              <Route index                             element={<Home />}        />
              <Route path="/txn"                       element={<Txn />}         />
              <Route path="/accounts"                  element={<Accounts />}    />
              <Route path="/ia"                        element={<AI />}          />
              <Route path="/more"                      element={<More />}        />
              <Route path="/settings"                  element={<Settings />}    />
              <Route path="/settings/profile"          element={<Profile />}     />
              <Route path="/settings/categories"       element={<Categories />}  />
              <Route path="/settings/budgets"          element={<Budgets />}     />
              <Route path="/settings/appearance"       element={<Appearance />}  />
              <Route path="/settings/security"         element={<Security />}    />
              <Route path="/settings/tipos"            element={<TiposSettings />}   />
              <Route path="/settings/subcategorias"    element={<SubcatSettings />}  />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
