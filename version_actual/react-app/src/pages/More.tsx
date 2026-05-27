// ═══════════════════════════════════════════════════
// More / Menú — /more  (BLOQUE 9)
// Avatar · Grid 4×4 accesos rápidos · Config groups · Logout
// ═══════════════════════════════════════════════════

import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import RowGroup from '../components/shell/RowGroup'
import RowLink  from '../components/shell/RowLink'
import {
  BudgetIcon, PaletteIcon, LockIcon, BellIcon, GlobeIcon,
  LogoutIcon, SearchIcon, TransferIcon,
  UserIcon, TagIcon, MicIcon, UploadIcon,
} from '../components/icons/Icons'
import { useAuthStore } from '../store/auth'
import { supabase }     from '../lib/supabase'
import Sheet            from '../components/ui/Sheet'
import { usePwaInstall } from '../hooks/usePwaInstall'

// ── Icon with colored bg ─────────────────────────────
function IcoBg({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: color, display: 'grid', placeItems: 'center',
    }}>
      {children}
    </div>
  )
}

export default function More() {
  const navigate        = useNavigate()
  const logout          = useAuthStore(s => s.logout)
  const userName        = useAuthStore(s => s.userName)
  const userEmail       = useAuthStore(s => s.userEmail)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { canInstall, install } = usePwaInstall()

  // Initial for avatar
  const initial = (userName ?? 'A')[0].toUpperCase()

  async function handleLogout() {
    // Invalidate Supabase session server-side → onAuthStateChange fires SIGNED_OUT
    await supabase.auth.signOut()
    // Reset Zustand store (isAuthenticated=false, userId=null, householdId=null)
    // Zustand persist re-writes localStorage — preserves hasSeenOnboarding
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Avatar card ── */}
      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--amber-d) 0%, transparent 60%), var(--ink-2)',
          border: '1px solid var(--line)', borderRadius: 18, padding: '16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--teal), var(--amber))',
            display: 'grid', placeItems: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--ink-0)',
          }}>
            {initial}
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName ?? 'Anthony Marte'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail ?? 'anthonymarte12@gmail.com'}
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: 'var(--amber)', color: 'var(--ink-0)', letterSpacing: '.06em',
              }}>
                PRO
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}>Hogar compartido</span>
            </div>
          </div>

          {/* Edit profile */}
          <button
            onClick={() => navigate('/settings/profile')}
            style={{
              padding: '6px 12px', background: 'var(--ink-3)',
              border: '1px solid var(--line)', borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
            }}
          >
            Editar
          </button>
        </div>
      </div>

      {/* ── Config groups ── */}
      <div style={{ marginTop: 8 }}>

        <RowGroup title="Movimientos">
          <RowLink
            icon={<IcoBg color="#2a1a0a"><span style={{ fontSize: 14 }}>🏷️</span></IcoBg>}
            iconBg="transparent"
            label="Tipos de movimiento"
            sub="Ingresos, gastos, ahorros…"
            onClick={() => navigate('/settings/tipos')}
          />
          <RowLink
            icon={<IcoBg color="#1a2a1a"><TagIcon /></IcoBg>}
            iconBg="transparent"
            label="Categorías"
            sub="CRUD y colores"
            onClick={() => navigate('/settings/categories')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a2a"><span style={{ fontSize: 14 }}>🗂️</span></IcoBg>}
            iconBg="transparent"
            label="Subcategorías"
            sub="Detalle por categoría"
            last
            onClick={() => navigate('/settings/subcategorias')}
          />
        </RowGroup>

        <RowGroup title="Finanzas">
          <RowLink
            icon={<IcoBg color="#1e4f3a"><BudgetIcon /></IcoBg>}
            iconBg="transparent"
            label="Presupuestos"
            sub="Límites mensuales por categoría"
            onClick={() => navigate('/settings/budgets')}
          />
          <RowLink
            icon={<IcoBg color="#3a1a1a"><span style={{ fontSize: 14 }}>🔥</span></IcoBg>}
            iconBg="transparent"
            label="FIRE / Jubilación"
            sub="Proyección de independencia"
            onClick={() => navigate('/fire')}
          />
          <RowLink
            icon={<IcoBg color="#1a2a3a"><span style={{ fontSize: 14 }}>🎯</span></IcoBg>}
            iconBg="transparent"
            label="Metas de ahorro"
            sub="Seguimiento de objetivos"
            last
            onClick={() => navigate('/metas')}
          />
        </RowGroup>

        <RowGroup title="Cuenta y configuración">
          <RowLink
            icon={<IcoBg color="#1a1a2a"><PaletteIcon /></IcoBg>}
            iconBg="transparent"
            label="Apariencia"
            sub="Tema · Fuente · Tamaño"
            onClick={() => navigate('/settings/appearance')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a2a"><GlobeIcon /></IcoBg>}
            iconBg="transparent"
            label="Monedas y tasas"
            sub="USD · VES · EUR · BCV"
            onClick={() => navigate('/monedas')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a2a"><BellIcon /></IcoBg>}
            iconBg="transparent"
            label="Notificaciones"
            sub="Alertas programadas"
            onClick={() => navigate('/notificaciones')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a1a"><LockIcon /></IcoBg>}
            iconBg="transparent"
            label="Seguridad"
            sub="PIN · Biometría · Sesión"
            onClick={() => navigate('/settings/security')}
          />
          <RowLink
            icon={<IcoBg color="#1a2416"><UserIcon /></IcoBg>}
            iconBg="transparent"
            label="Perfil"
            sub="Nombre · Email · Avatar"
            last
            onClick={() => navigate('/settings/profile')}
          />
        </RowGroup>

        <RowGroup title="Herramientas">
          <RowLink
            icon={<IcoBg color="#2a1a2a"><MicIcon /></IcoBg>}
            iconBg="transparent"
            label="Registro por voz"
            sub="Dicta un movimiento"
            onClick={() => navigate('/voz')}
          />
          <RowLink
            icon={<IcoBg color="#1a3428"><UploadIcon /></IcoBg>}
            iconBg="transparent"
            label="Importar CSV"
            sub="Carga movimientos desde archivo"
            onClick={() => navigate('/csv-import')}
          />
          <RowLink
            icon={<IcoBg color="#1a2a1a"><SearchIcon /></IcoBg>}
            iconBg="transparent"
            label="Búsqueda global"
            sub="Encuentra cualquier movimiento"
            onClick={() => navigate('/buscar')}
          />
          <RowLink
            icon={<IcoBg color="#1a2a3a"><TransferIcon /></IcoBg>}
            iconBg="transparent"
            label="Exportar datos"
            sub="CSV · Excel · PDF"
            last
            onClick={() => navigate('/exportar')}
          />
        </RowGroup>

        {/* ── Instalar PWA (visible cuando Chrome lo permite) ── */}
        {canInstall && (
          <RowGroup>
            <RowLink
              icon={
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(224,168,74,.15)',
                  display: 'grid', placeItems: 'center', fontSize: 15,
                }}>
                  📲
                </div>
              }
              iconBg="transparent"
              label="Instalar app"
              sub="Acceso directo desde la pantalla de inicio"
              last
              onClick={install}
            />
          </RowGroup>
        )}

        {/* ── Logout ── */}
        <RowGroup>
          <RowLink
            icon={
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(214,106,90,.15)',
                display: 'grid', placeItems: 'center',
                color: 'var(--neg)',
              }}>
                <LogoutIcon />
              </div>
            }
            iconBg="transparent"
            label="Cerrar sesión"
            danger
            last
            onClick={() => setConfirmLogout(true)}
          />
        </RowGroup>

        <div style={{ textAlign: 'center', padding: '12px 0 8px', fontSize: 10.5, color: 'var(--fg-mute)' }}>
          Mis Finanzas 2026 · v1.0.0-rc
        </div>
      </div>

      {/* ── Logout confirmation sheet ── */}
      <Sheet open={confirmLogout} onClose={() => setConfirmLogout(false)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
            background: 'rgba(214,106,90,.12)', border: '1px solid rgba(214,106,90,.25)',
            display: 'grid', placeItems: 'center', fontSize: 24,
          }}>
            👋
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>¿Cerrar sesión?</div>
          <div style={{ fontSize: 13, color: 'var(--fg-mute)', marginBottom: 20, lineHeight: 1.5 }}>
            Tendrás que volver a ingresar con tu email y contraseña.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setConfirmLogout(false)}
              style={{
                flex: 1, padding: '13px', borderRadius: 13,
                background: 'var(--ink-3)', border: '1px solid var(--line)',
                fontSize: 14, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { setConfirmLogout(false); handleLogout() }}
              style={{
                flex: 1, padding: '13px', borderRadius: 13,
                background: 'var(--neg)', border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </Sheet>

    </div>
  )
}
