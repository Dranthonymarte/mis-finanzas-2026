import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/shell/AppHeader'
import { MOCK_MONTH, MOCK_TRANSACTIONS, MOCK_ACCOUNTS, fmt, txnGroup } from '../data/mock'
import { BellIcon } from '../components/icons/Icons'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Hero header */}
      <AppHeader
        title="Mis Finanzas"
        sub={MOCK_MONTH.label}
        large
        right={
          <button
            className="m-app-header-icon-btn"
            onClick={() => {}}
            aria-label="Notificaciones"
          >
            <BellIcon />
          </button>
        }
      />

      {/* KPI hero card */}
      <div
        style={{
          margin: '0 16px 16px',
          background: 'var(--ink-2)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: '20px 20px 16px',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Neto del mes
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--pos)', letterSpacing: '-.02em', lineHeight: 1 }}>
          {fmt(MOCK_MONTH.net)}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 3 }}>Entradas</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pos)' }}>{fmt(MOCK_MONTH.income)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 3 }}>Salidas</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--neg)' }}>{fmt(MOCK_MONTH.expenses)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginBottom: 3 }}>Ahorro</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--info)' }}>{fmt(MOCK_MONTH.savings)}</div>
          </div>
        </div>
      </div>

      {/* Tasa BCV */}
      <div
        style={{
          margin: '0 16px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: 'var(--ink-2)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '10px 14px',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
          Tasa BCV:&nbsp;<strong style={{ color: 'var(--fg)' }}>Bs {MOCK_MONTH.rateBCV.toFixed(2)}</strong> / USD
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-mute)' }}>En vivo · hace 5 min</span>
      </div>

      {/* Accounts row */}
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px 10px',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
            Cuentas
          </span>
          <button
            style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}
            onClick={() => navigate('/accounts')}
          >
            Ver todas
          </button>
        </div>
        <div style={{ overflowX: 'auto', display: 'flex', gap: 10, padding: '0 16px 4px', scrollbarWidth: 'none' }}>
          {MOCK_ACCOUNTS.map((acc) => (
            <div
              key={acc.id}
              style={{
                flexShrink: 0,
                background: 'var(--ink-2)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '12px 16px',
                minWidth: 140,
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>{acc.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 3 }}>{acc.name}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: acc.color }}>
                {acc.currency === 'USD' ? fmt(acc.balance) : `Bs ${acc.balance.toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg-mute)' }}>
            Recientes
          </span>
          <button
            style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}
            onClick={() => navigate('/txn')}
          >
            Ver todo
          </button>
        </div>

        <div
          style={{
            background: 'var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {MOCK_TRANSACTIONS.slice(0, 5).map((txn, idx, arr) => {
            const group = txnGroup(txn.tipo)
            const isIncome = group === 'ingreso'
            const isAhorro = group === 'ahorro'
            const color = isIncome ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--fg)'
            const prefix = isIncome ? '+' : isAhorro ? '' : '−'
            return (
              <div
                key={txn.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 12px',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--ink-3)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 16,
                  }}
                >
                  {isIncome ? '💰' : isAhorro ? '📊' : '🛒'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {txn.desc}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
                    {txn.cat} · {txn.date.slice(8)}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color }}>
                  {prefix}{fmt(txn.amount)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
