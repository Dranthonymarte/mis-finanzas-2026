import AppHeader from '../components/shell/AppHeader'
import { MOCK_ACCOUNTS, fmt } from '../data/mock'

export default function Accounts() {
  const totalUSD = MOCK_ACCOUNTS
    .filter((a) => a.currency === 'USD')
    .reduce((s, a) => s + a.balance, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="Cuentas" sub="patrimonio" large />

      {/* Total */}
      <div style={{ margin: '0 16px 18px' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 4, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Total en USD
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--pos)' }}>
          {fmt(totalUSD)}
        </div>
      </div>

      {/* Account list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MOCK_ACCOUNTS.map((acc) => (
          <div
            key={acc.id}
            style={{
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
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--ink-3)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {acc.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{acc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{acc.currency}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: acc.color }}>
                {acc.currency === 'USD' ? fmt(acc.balance) : `Bs ${acc.balance.toLocaleString()}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add account placeholder */}
      <button
        style={{
          margin: '16px 16px 0',
          background: 'var(--ink-2)',
          border: '1px dashed var(--ink-4)',
          borderRadius: 16,
          padding: '14px',
          color: 'var(--fg-mute)',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>+</span>
        Agregar cuenta
      </button>
    </div>
  )
}
