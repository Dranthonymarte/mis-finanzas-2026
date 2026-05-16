import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import RowGroup from '../components/shell/RowGroup'
import RowLink from '../components/shell/RowLink'
import {
  UserIcon, TagIcon, BudgetIcon, PaletteIcon, LockIcon, BellIcon,
  GlobeIcon, LogoutIcon, UsersIcon,
} from '../components/icons/Icons'

export default function More() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Más" sub="configuración" large />

      {/* User card */}
      <div
        style={{
          margin: '0 16px 20px',
          background: 'var(--ink-2)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--amber), var(--amber-s))',
            display: 'grid',
            placeItems: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          👤
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Anthony Marte</div>
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 2 }}>anthonymarte12@gmail.com</div>
        </div>
        <button
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            background: 'var(--ink-3)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fg-dim)',
          }}
          onClick={() => navigate('/settings/profile')}
        >
          Editar
        </button>
      </div>

      {/* Settings groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <RowGroup title="Configuración">
          <RowLink
            icon={<UserIcon />}
            iconBg="var(--ink-3)"
            label="Perfil"
            sub="Nombre, correo, foto"
            onClick={() => navigate('/settings/profile')}
          />
          <RowLink
            icon={<TagIcon />}
            iconBg="var(--ink-3)"
            label="Categorías"
            sub="Editar y crear categorías"
            onClick={() => navigate('/settings/categories')}
          />
          <RowLink
            icon={<BudgetIcon />}
            iconBg="var(--ink-3)"
            label="Presupuestos"
            sub="Límites por categoría"
            onClick={() => navigate('/settings/budgets')}
          />
          <RowLink
            icon={<PaletteIcon />}
            iconBg="var(--ink-3)"
            label="Apariencia"
            sub="Tema, fuente, colores"
            onClick={() => navigate('/settings/appearance')}
          />
          <RowLink
            icon={<LockIcon />}
            iconBg="var(--ink-3)"
            label="Seguridad"
            sub="PIN, biometría, sesión"
            last
            onClick={() => navigate('/settings/security')}
          />
        </RowGroup>

        <RowGroup title="Más opciones">
          <RowLink
            icon={<UsersIcon />}
            iconBg="var(--ink-3)"
            label="Hogar familiar"
            sub="Miembros del hogar"
            onClick={() => {}}
          />
          <RowLink
            icon={<GlobeIcon />}
            iconBg="var(--ink-3)"
            label="Monedas y tasas"
            sub="USD · VES · EUR"
            onClick={() => {}}
          />
          <RowLink
            icon={<BellIcon />}
            iconBg="var(--ink-3)"
            label="Notificaciones"
            sub="Preferencias de alertas"
            last
            onClick={() => {}}
          />
        </RowGroup>

        <RowGroup>
          <RowLink
            icon={<LogoutIcon />}
            iconBg="var(--neg-d)"
            iconColor="var(--neg)"
            label="Cerrar sesión"
            danger
            last
            onClick={() => {}}
          />
        </RowGroup>

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '20px 0 8px', fontSize: 11, color: 'var(--fg-mute)' }}>
          Mis Finanzas 2026 · React Preview · checkpoint-A
        </div>
      </div>
    </div>
  )
}
