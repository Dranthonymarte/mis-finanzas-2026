// ═══════════════════════════════════════════════════
// FAQ — /soporte/faq
// Preguntas frecuentes con accordion nativo
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '../../components/icons/Icons'

interface FAQItem {
  q: string
  a: string
}

const FAQS: FAQItem[] = [
  {
    q: '¿Qué puedo registrar en Mis Finanzas?',
    a: 'Puedes registrar gastos, ingresos fijos y variables, ahorros, préstamos recibidos y pagados, transferencias entre cuentas y ajustes de saldo. Cada movimiento puede tener categoría, subcategoría, descripción, cuenta asociada y fecha.',
  },
  {
    q: '¿Cómo funciona el manejo de dos monedas (USD y Bs.)?',
    a: 'Todos los montos se guardan en dólares (USD) internamente. Al visualizar, puedes elegir mostrar en USD o en bolívares (Bs.) usando la tasa de cambio activa. La conversión es automática y puedes actualizarla desde la sección Monedas y tasas.',
  },
  {
    q: '¿Qué es la tasa BCV y para qué sirve?',
    a: 'La tasa BCV es el tipo de cambio oficial publicado por el Banco Central de Venezuela. Mis Finanzas la obtiene automáticamente cada 30 minutos para que tus conversiones USD ↔ Bs. estén siempre actualizadas. Puedes ver el historial de tasas en Monedas y tasas.',
  },
  {
    q: '¿Puedo compartir la app con mi pareja u otro miembro del hogar?',
    a: 'Sí. Desde Más → Pareja / Hogar puedes invitar a otra persona. Una vez aceptada la invitación, ambos comparten las mismas cuentas y transacciones en tiempo real. Solo puedes tener un hogar activo por cuenta.',
  },
  {
    q: '¿Mis datos están seguros? ¿Quién puede verlos?',
    a: 'Tus datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y acceso controlado por reglas de seguridad a nivel de fila (Row Level Security). Solo tú y los miembros de tu hogar pueden ver tus datos. Mis Finanzas no comparte ni vende información personal.',
  },
  {
    q: '¿Cómo registro un gasto recurrente?',
    a: 'Ve a Más → Recurrentes y crea la regla con monto, categoría y frecuencia (diaria, semanal, mensual, etc.). La app registrará automáticamente el gasto en la fecha indicada y te enviará una notificación si las tienes activadas.',
  },
  {
    q: '¿Puedo importar mis transacciones desde otro sistema?',
    a: 'Sí. Desde Más → Importar CSV puedes subir un archivo .csv con tus transacciones. La app mapea las columnas automáticamente. También puedes exportar tus datos en cualquier momento desde Más → Exportar.',
  },
  {
    q: '¿La app funciona sin internet?',
    a: 'Mis Finanzas es una Progressive Web App (PWA). Una vez instalada, puedes consultar los datos en caché sin conexión. Para registrar nuevas transacciones o sincronizar datos necesitas conectividad.',
  },
  {
    q: '¿Cómo cambio o recupero mi contraseña?',
    a: 'En la pantalla de inicio de sesión, toca "¿Olvidaste tu contraseña?" e ingresa tu correo electrónico. Recibirás un enlace seguro para restablecerla. También puedes cambiarlo desde Ajustes → Seguridad cuando estés autenticado.',
  },
  {
    q: '¿Cómo elimino una transacción o cuenta?',
    a: 'Entra al detalle de la transacción o cuenta y usa el botón de eliminar. Las transacciones se archivan (no se borran permanentemente) para mantener la integridad del historial. Las cuentas solo se pueden eliminar si no tienen movimientos asociados.',
  },
]

export default function FAQ() {
  const navigate = useNavigate()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i))
  }

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
          Preguntas frecuentes
        </span>
      </div>

      {/* ── FAQ list ── */}
      <div style={{
        padding: '16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              style={{
                background: 'var(--ink-2)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggle(i)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--fg)',
                  fontFamily: 'var(--f-ui)', lineHeight: 1.4,
                }}>
                  {item.q}
                </span>
                <span style={{
                  fontSize: 11, color: 'var(--fg-mute)', flexShrink: 0,
                  transition: 'transform .2s',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▼
                </span>
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 16px 14px',
                  fontSize: 13.5, color: 'var(--fg-mute)',
                  lineHeight: 1.6, fontFamily: 'var(--f-ui)',
                  borderTop: '1px solid var(--line)',
                  paddingTop: 12,
                }}>
                  {item.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
