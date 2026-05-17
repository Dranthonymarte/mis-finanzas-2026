// ═══════════════════════════════════════════════════
// FAB — floating action button  (BLOQUE 6)
// 5 actions: Buscar · CSV · Voz · Transferir · Movimiento
// ═══════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom'
import {
  PlusIcon, TxnIcon, TransferIcon,
  SearchIcon, MicIcon, UploadIcon,
} from '../icons/Icons'
import { useAppStore } from '../../store/app'

const FAB_ACTIONS = [
  { id: 'search',   label: 'Buscar',       Icon: SearchIcon,   color: '#6a94c4' },
  { id: 'csv',      label: 'Importar CSV', Icon: UploadIcon,   color: '#3d8b82' },
  { id: 'voice',    label: 'Por voz',      Icon: MicIcon,      color: '#b0a3c7' },
  { id: 'transfer', label: 'Transferir',   Icon: TransferIcon, color: '#4a9eda' },
  { id: 'txn',      label: 'Movimiento',   Icon: TxnIcon,      color: '#e0a84a' },
]

export default function FAB() {
  const { fabOpen, setFabOpen } = useAppStore()
  const navigate = useNavigate()

  function toggle() { setFabOpen(!fabOpen) }
  function close()  { setFabOpen(false)    }

  function handleAction(id: string) {
    close()
    if (id === 'txn')      navigate('/new-txn')
    if (id === 'transfer') navigate('/transfer')
    if (id === 'search')   navigate('/buscar')
    if (id === 'voice')    navigate('/voz')
    if (id === 'csv')      navigate('/csv-import')
  }

  return (
    <>
      {/* FAB overlay backdrop */}
      {fabOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,11,13,.65)',
            zIndex: 190,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Action options — stagger from bottom */}
      {fabOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            zIndex: 200,
          }}
        >
          {FAB_ACTIONS.map((action, i) => (
            <div
              key={action.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                animation: `fabItemIn 200ms ${i * 40}ms cubic-bezier(.4,0,.2,1) both`,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  background: 'var(--ink-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.label}
              </span>
              <button
                onClick={() => handleAction(action.id)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: action.color,
                  border: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--ink-0)',
                  boxShadow: '0 4px 12px rgba(0,0,0,.4)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <action.Icon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAB button — rendered inside .m-fab-cell in TabBar */}
      <button
        className="m-fab"
        onClick={toggle}
        aria-label="Acciones rápidas"
        aria-expanded={fabOpen}
        style={{
          transform: fabOpen ? 'rotate(45deg) scale(.9)' : undefined,
          transition: 'transform .2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <PlusIcon />
      </button>

      {/* FAB animation keyframes */}
      <style>{`
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateY(12px) scale(.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </>
  )
}
