import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import RowGroup from '../components/shell/RowGroup'
import RowLink from '../components/shell/RowLink'
import {
  UserIcon, TagIcon, BudgetIcon, PaletteIcon, LockIcon, BellIcon, UsersIcon,
} from '../components/icons/Icons'

export default function Settings() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Configuración" back large />

      <RowGroup title="Mi cuenta">
        <RowLink
          icon={<UserIcon />}
          label="Perfil"
          sub="Nombre y correo electrónico"
          onClick={() => navigate('/settings/profile')}
        />
        <RowLink
          icon={<LockIcon />}
          label="Seguridad"
          sub="PIN y biometría"
          last
          onClick={() => navigate('/settings/security')}
        />
      </RowGroup>

      <RowGroup title="Finanzas">
        <RowLink
          icon={<TagIcon />}
          label="Categorías"
          onClick={() => navigate('/settings/categories')}
        />
        <RowLink
          icon={<BudgetIcon />}
          label="Presupuestos"
          last
          onClick={() => navigate('/settings/budgets')}
        />
      </RowGroup>

      <RowGroup title="Personalización">
        <RowLink
          icon={<PaletteIcon />}
          label="Apariencia"
          sub="Tema y colores"
          last
          onClick={() => navigate('/settings/appearance')}
        />
      </RowGroup>

      <RowGroup title="Automatización">
        <RowLink
          icon={<BellIcon />}
          label="Notificaciones"
          sub="Alertas programadas y push"
          onClick={() => navigate('/notificaciones')}
        />
        <RowLink
          icon={<UsersIcon />}
          label="Pareja / Hogar"
          sub="Invitar, compartir y gestionar acceso"
          last
          onClick={() => navigate('/pareja')}
        />
      </RowGroup>
    </div>
  )
}
