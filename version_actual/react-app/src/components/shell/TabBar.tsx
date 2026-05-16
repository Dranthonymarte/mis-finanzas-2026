import { useNavigate, useLocation } from 'react-router-dom'
import { HomeIcon, ListIcon, WalletIcon, CogIcon } from '../icons/Icons'
import { useAppStore } from '../../store/app'
import FAB from './FAB'

const TABS = [
  { id: 'home',     label: 'Inicio',  path: '/',         Icon: HomeIcon   },
  { id: 'txn',      label: 'Mov.',    path: '/txn',       Icon: ListIcon   },
  { id: 'fab' },
  { id: 'accounts', label: 'Cuentas', path: '/accounts',  Icon: WalletIcon },
  { id: 'more',     label: 'Más',     path: '/more',      Icon: CogIcon    },
] as const

// Tab-to-path depth for determining slide direction
const TAB_ORDER = ['home', 'txn', 'fab', 'accounts', 'more']

function pathToTabId(pathname: string): string {
  if (pathname === '/')                      return 'home'
  if (pathname.startsWith('/txn'))           return 'txn'
  if (pathname.startsWith('/accounts'))      return 'accounts'
  if (pathname.startsWith('/ia'))            return 'fab'  // IA launched from FAB
  if (pathname.startsWith('/more'))          return 'more'
  if (pathname.startsWith('/settings'))      return 'more'
  return 'home'
}

export default function TabBar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { setNavDirection } = useAppStore()

  const activeId = pathToTabId(location.pathname)

  function handleTab(tabId: string, path: string) {
    if (tabId === activeId) return  // already active
    const prev = TAB_ORDER.indexOf(activeId)
    const next = TAB_ORDER.indexOf(tabId)
    setNavDirection(next >= prev ? 'forward' : 'back')
    navigate(path)
  }

  return (
    <nav id="pwa-nav" role="tablist" aria-label="Navegación principal">
      {TABS.map((tab) => {
        if (tab.id === 'fab') {
          return (
            <div key="fab" className="m-fab-cell">
              <FAB />
            </div>
          )
        }

        const t = tab as { id: string; label: string; path: string; Icon: React.ComponentType }
        const active = activeId === t.id

        return (
          <button
            key={t.id}
            className={`m-tab${active ? ' active' : ''}`}
            role="tab"
            aria-selected={active}
            aria-label={t.label}
            onClick={() => handleTab(t.id, t.path)}
          >
            <t.Icon />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
