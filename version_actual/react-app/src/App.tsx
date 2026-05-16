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

// ── Auth pages (no shell) ──────────────────────────
import Onboarding     from './pages/Onboarding'
import Login          from './pages/Login'
import NewTransaction from './pages/NewTransaction'

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
        <Route path="/new-txn"     element={<NewTransaction />} />

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
