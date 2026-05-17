// ═══════════════════════════════════════════════════
// App — routing root
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
//   /more        — Más
//   /settings/*  — Configuración
//
// Guards:
//   RequireAuth   → redirects to /onboarding or /login
//   RequireNoAuth → redirects authenticated users to /
// ═══════════════════════════════════════════════════

import { Routes, Route } from 'react-router-dom'
import AppShell from './components/shell/AppShell'
import { RequireAuth, RequireNoAuth } from './components/shell/AuthGuard'
import { useAuth } from './hooks/useAuth'

// ── Auth pages (no shell) ──────────────────────────
import Onboarding     from './pages/Onboarding'
import Login          from './pages/Login'
import NewTransaction from './pages/NewTransaction'
import AccountDetail  from './pages/AccountDetail'
import TxnDetail      from './pages/TxnDetail'
import NewAccount     from './pages/NewAccount'
import Transfer       from './pages/Transfer'
import Monedas        from './pages/Monedas'
import Fire           from './pages/Fire'
import Metas          from './pages/Metas'
import Pareja         from './pages/Pareja'
import Exportar       from './pages/Exportar'
import Escanear       from './pages/Escanear'
import Notificaciones from './pages/Notificaciones'

// ── Main pages ─────────────────────────────────────
import Home     from './pages/Home'
import Txn      from './pages/Txn'
import Accounts from './pages/Accounts'
import AI       from './pages/AI'
import More     from './pages/More'
import Settings from './pages/Settings'

// ── Settings sub-pages ─────────────────────────────
import Profile    from './pages/settings/Profile'
import Categories from './pages/settings/Categories'
import Budgets    from './pages/settings/Budgets'
import Appearance from './pages/settings/Appearance'
import Security   from './pages/settings/Security'

export default function App() {
  useAuth()
  return (
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
        <Route path="/fire"            element={<Fire />}            />
        <Route path="/metas"           element={<Metas />}           />
        <Route path="/pareja"          element={<Pareja />}          />
        <Route path="/exportar"        element={<Exportar />}        />
        <Route path="/escanear"        element={<Escanear />}        />
        <Route path="/notificaciones"  element={<Notificaciones />}  />

        <Route element={<AppShell />}>
          <Route index                       element={<Home />}       />
          <Route path="/txn"                 element={<Txn />}        />
          <Route path="/accounts"            element={<Accounts />}   />
          <Route path="/ia"                  element={<AI />}         />
          <Route path="/more"                element={<More />}       />
          <Route path="/settings"            element={<Settings />}   />
          <Route path="/settings/profile"    element={<Profile />}    />
          <Route path="/settings/categories" element={<Categories />} />
          <Route path="/settings/budgets"    element={<Budgets />}    />
          <Route path="/settings/appearance" element={<Appearance />} />
          <Route path="/settings/security"   element={<Security />}   />
        </Route>
      </Route>
    </Routes>
  )
}
