import { Routes, Route } from 'react-router-dom'
import AppShell from './components/shell/AppShell'

// Main pages
import Home     from './pages/Home'
import Txn      from './pages/Txn'
import Accounts from './pages/Accounts'
import AI       from './pages/AI'
import More     from './pages/More'
import Settings from './pages/Settings'

// Settings sub-routes
import Profile    from './pages/settings/Profile'
import Categories from './pages/settings/Categories'
import Budgets    from './pages/settings/Budgets'
import Appearance from './pages/settings/Appearance'
import Security   from './pages/settings/Security'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"                    element={<Home />}       />
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
      </Routes>
    </AppShell>
  )
}
