// ═══════════════════════════════════════════════════
// Consentimiento — /soporte/consentimiento
// Términos y política de privacidad
// ═══════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '../../components/icons/Icons'

interface LegalSection {
  heading: string
  body: string
}

const SECTIONS: LegalSection[] = [
  {
    heading: '1. RESPONSABILIDAD DEL USUARIO',
    body: 'Al registrarte en Mis Finanzas, declaras que la información que ingresas es verídica y de tu exclusiva responsabilidad. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades realizadas desde tu cuenta.',
  },
  {
    heading: '2. PRIVACIDAD Y PROTECCIÓN DE DATOS',
    body: 'Mis Finanzas recopila y almacena únicamente los datos que tú ingresas voluntariamente. Esta información está protegida conforme a la Ley de Infogobierno de Venezuela (Decreto N° 825/2000) y los principios del Habeas Data reconocidos en el artículo 28 de la Constitución de la República Bolivariana de Venezuela. Para usuarios en jurisdicciones internacionales, aplicamos los principios de la LGPD (Brasil) y las mejores prácticas de privacidad reconocidas a nivel internacional (GDPR referencial).',
  },
  {
    heading: '3. CARÁCTER NO FINANCIERO DE LA INFORMACIÓN',
    body: 'Mis Finanzas es una herramienta de gestión personal de finanzas y NO constituye asesoría financiera, fiscal, legal ni de inversión. Los datos y proyecciones que muestra la aplicación son meramente referenciales. Consulta a un profesional certificado para decisiones financieras importantes.',
  },
  {
    heading: '4. ALMACENAMIENTO Y SEGURIDAD',
    body: 'Tus datos se almacenan en servidores de Supabase (ubicados en Estados Unidos), protegidos con cifrado TLS en tránsito y control de acceso mediante Row Level Security (RLS). Mis Finanzas no almacena contraseñas en texto plano. Tus datos nunca son vendidos ni compartidos con terceros con fines comerciales.',
  },
  {
    heading: '5. DERECHOS DEL USUARIO',
    body: 'Tienes derecho a: acceder a todos tus datos, corregir información incorrecta, exportar tu historial en formato CSV, y solicitar la eliminación de tu cuenta y datos asociados. Para ejercer estos derechos, usa la sección Sugerencias o escríbenos directamente.',
  },
  {
    heading: '6. MODIFICACIONES DEL SERVICIO',
    body: 'Mis Finanzas se reserva el derecho de modificar estos términos con un aviso previo de al menos 15 días mediante notificación en la aplicación. El uso continuado de la app tras la fecha de vigencia implica la aceptación de los nuevos términos.',
  },
  {
    heading: '7. ACEPTACIÓN',
    body: 'Al crear una cuenta o iniciar sesión en Mis Finanzas, confirmas que has leído, comprendido y aceptado estos términos y condiciones.',
  },
]

export default function Consentimiento() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink-1)', fontFamily: 'var(--f-ui)' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--ink-1)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate('/more')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg)', padding: 4, display: 'grid', placeItems: 'center',
          }}
          aria-label="Volver"
        >
          <ArrowLeftIcon />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
          Consentimiento y privacidad
        </span>
      </div>

      {/* ── Legal content ── */}
      <div style={{
        padding: '20px 16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 640, margin: '0 auto',
      }}>
        <p style={{
          fontSize: 11.5, color: 'var(--fg-mute)', marginBottom: 24,
          letterSpacing: '.03em',
        }}>
          Last updated: Mayo 2026
        </p>

        {SECTIONS.map((section, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--fg-dim)',
              letterSpacing: '.08em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {section.heading}
            </div>
            <p style={{
              fontSize: 14, color: 'var(--fg-mute)',
              lineHeight: 1.6, margin: 0,
            }}>
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
