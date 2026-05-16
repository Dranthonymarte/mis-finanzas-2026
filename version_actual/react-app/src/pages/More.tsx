import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import RowGroup from '../components/shell/RowGroup'
import RowLink  from '../components/shell/RowLink'
import {
  BudgetIcon, PaletteIcon, LockIcon,
  BellIcon, GlobeIcon, LogoutIcon, ScanIcon,
} from '../components/icons/Icons'

/* ── Icon with colored bg ── */
function IcoBg({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: color, display: 'grid', placeItems: 'center',
      fontSize: 15, lineHeight: 1,
    }}>
      {children}
    </div>
  )
}

/* ── Custom stat icon (no SVG) ── */
const FireIcon = () => <span style={{ fontSize: 15 }}>🔥</span>
const HeartIcon = () => <span style={{ fontSize: 15 }}>💑</span>
const ExportIcon = () => <span style={{ fontSize: 15 }}>📤</span>
const HelpIcon  = () => <span style={{ fontSize: 15 }}>💬</span>
const ShareIcon = () => <span style={{ fontSize: 15 }}>🎁</span>

export default function More() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── User card ── */}
      <div style={{ padding: '10px 16px 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--amber-d) 0%, transparent 70%), var(--ink-2)',
          border: '1px solid var(--line)', borderRadius: 18, padding: '16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--teal), var(--amber))',
            display: 'grid', placeItems: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--ink-0)',
          }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Anthony Marte</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 2 }}>anthonymarte12@gmail.com</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: 'var(--amber)', color: 'var(--ink-0)', letterSpacing: '.06em',
              }}>PRO</span>
              <span style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}>Miembro desde 2025</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings/profile')}
            style={{
              padding: '6px 12px', background: 'var(--ink-3)', border: '1px solid var(--line)',
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--fg-dim)', cursor: 'pointer',
            }}
          >
            Editar
          </button>
        </div>
      </div>

      {/* ── Groups ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        <RowGroup title="Finanzas">
          <RowLink
            icon={<IcoBg color="#1e4f3a"><BudgetIcon /></IcoBg>}
            iconBg="transparent"
            label="Presupuesto"
            sub="Límites y seguimiento mensual"
            onClick={() => navigate('/settings/budgets')}
          />
          <RowLink
            icon={<IcoBg color="#1a3a5c"><span style={{ color: '#6a94c4', display: 'grid', placeItems: 'center' }}><svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3 6 12H2"/></svg></span></IcoBg>}
            iconBg="transparent"
            label="Metas de ahorro"
            sub="Viaje a Japón · Fondo de emergencia"
            onClick={() => {}}
          />
          <RowLink
            icon={<IcoBg color="#3a1a1a"><FireIcon /></IcoBg>}
            iconBg="transparent"
            label="FIRE / Jubilación"
            sub="Proyección de independencia"
            onClick={() => {}}
          />
          <RowLink
            icon={<IcoBg color="#2d1a3d"><HeartIcon /></IcoBg>}
            iconBg="transparent"
            label="Finanzas en pareja"
            sub="Isabel · 2 miembros"
            last
            onClick={() => {}}
          />
        </RowGroup>

        <RowGroup title="Datos">
          <RowLink
            icon={<IcoBg color="#3a2d0a"><span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 14 }}>✦</span></IcoBg>}
            iconBg="transparent"
            label="Análisis con IA"
            sub="Insights personalizados"
            onClick={() => navigate('/ia')}
          />
          <RowLink
            icon={<IcoBg color="#1a2a3a"><ExportIcon /></IcoBg>}
            iconBg="transparent"
            label="Exportar datos"
            sub="CSV · Excel · PDF"
            onClick={() => {}}
          />
          <RowLink
            icon={<IcoBg color="#1a3428"><span style={{ color: 'var(--teal)', display: 'grid', placeItems: 'center' }}><ScanIcon /></span></IcoBg>}
            iconBg="transparent"
            label="Escanear recibo"
            sub="Capturar con cámara"
            last
            onClick={() => {}}
          />
        </RowGroup>

        <RowGroup title="Cuenta">
          <RowLink
            icon={<IcoBg color="#1a1a1a"><LockIcon /></IcoBg>}
            iconBg="transparent"
            label="Seguridad"
            sub="PIN · Biometría · Sesión"
            onClick={() => navigate('/settings/security')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a2a"><BellIcon /></IcoBg>}
            iconBg="transparent"
            label="Notificaciones"
            sub="Alertas y recordatorios"
            onClick={() => {}}
          />
          <RowLink
            icon={<IcoBg color="#1a2416"><span style={{ color: '#58b26a', display: 'grid', placeItems: 'center' }}><PaletteIcon /></span></IcoBg>}
            iconBg="transparent"
            label="Apariencia"
            sub="Tema · Fuente · Colores"
            onClick={() => navigate('/settings/appearance')}
          />
          <RowLink
            icon={<IcoBg color="#1a1a2a"><GlobeIcon /></IcoBg>}
            iconBg="transparent"
            label="Monedas y tasas"
            sub="USD · VES · EUR · BCV"
            last
            onClick={() => {}}
          />
        </RowGroup>

        <RowGroup title="Soporte">
          <RowLink
            icon={<IcoBg color="#1a1a2a"><HelpIcon /></IcoBg>}
            iconBg="transparent"
            label="Ayuda y soporte"
            sub="FAQ · Chat · Tutoriales"
            onClick={() => {}}
          />
          <RowLink
            icon={<IcoBg color="#1a2d1a"><ShareIcon /></IcoBg>}
            iconBg="transparent"
            label="Invitar amigos"
            sub="Comparte la app"
            last
            onClick={() => {}}
          />
        </RowGroup>

        <RowGroup>
          <RowLink
            icon={<IcoBg color="var(--neg-d)"><span style={{ color: 'var(--neg)', display: 'grid', placeItems: 'center' }}><LogoutIcon /></span></IcoBg>}
            iconBg="transparent"
            label="Cerrar sesión"
            danger
            last
            onClick={() => {}}
          />
        </RowGroup>

        <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: 10.5, color: 'var(--fg-mute)' }}>
          Mis Finanzas 2026 · checkpoint-B · v0.2.0
        </div>
      </div>

    </div>
  )
}
