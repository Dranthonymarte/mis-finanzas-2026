import { useNavigate } from 'react-router-dom'
import Sparkline from '../components/ui/Sparkline'
import Pill     from '../components/ui/Pill'
import { MOCK_ACCOUNTS, fmt } from '../data/mock'

/* ── Account card ── */
function AccountCard({ acc, onClick }: { acc: typeof MOCK_ACCOUNTS[0]; onClick: () => void }) {
  const trendPos = acc.trend >= 0
  const displayBalance = acc.currency === 'USD'
    ? fmt(acc.balance)
    : `Bs ${acc.balance.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 18, overflow: 'hidden',
        background: `radial-gradient(ellipse at 88% 12%, ${acc.color}2e 0%, transparent 58%), var(--ink-2)`,
        border: `1px solid ${acc.color}30`,
        padding: '16px 16px 14px',
        cursor: 'pointer',
      }}
    >
      {/* top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
            color: acc.color, marginBottom: 3,
          }}>
            {acc.type}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{acc.name}</div>
        </div>
        <Pill tone="mute" size="xs">{acc.currency}</Pill>
      </div>

      {/* balance */}
      <div className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: acc.color }}>
        {displayBalance}
      </div>

      {/* sparkline + trend */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Sparkline data={acc.spark} color={acc.color} w={120} h={22} fill stroke={1.5} />
        <div style={{
          fontSize: 11.5, fontWeight: 600,
          color: trendPos ? 'var(--pos)' : 'var(--neg)',
        }}>
          {trendPos ? '▲' : '▼'} {Math.abs(acc.trend)}%
        </div>
      </div>
    </div>
  )
}

export default function Accounts() {
  const navigate  = useNavigate()
  const totalUSD  = MOCK_ACCOUNTS
    .filter(a => a.currency === 'USD')
    .reduce((s, a) => s + a.balance, 0)
  const totalCash = MOCK_ACCOUNTS.find(a => a.type === 'CASH')

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Patrimonio
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginTop: 2 }}>
            Cuentas
          </h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          style={{
            fontSize: 11.5, fontWeight: 600, color: 'var(--amber)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Gestionar
        </button>
      </div>

      {/* ── Patrimony summary ── */}
      <div style={{ padding: '4px 16px 16px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Total USD
        </div>
        <div className="font-display" style={{ fontSize: 42, lineHeight: 1.05, letterSpacing: '-.02em', marginTop: 4 }}>
          {fmt(totalUSD).slice(0, -3)}
          <span style={{ color: 'var(--fg-dim)', fontSize: '.55em' }}>
            {fmt(totalUSD).slice(-3)}
          </span>
        </div>
        {totalCash && (
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4 }}>
            + Bs {totalCash.balance.toLocaleString('es-VE', { maximumFractionDigits: 0 })} en efectivo
          </div>
        )}
      </div>

      {/* ── Account cards ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MOCK_ACCOUNTS.map(acc => (
          <AccountCard key={acc.id} acc={acc} onClick={() => navigate(`/accounts/${acc.id}`)} />
        ))}
      </div>

      {/* ── Add account ── */}
      <button
        onClick={() => navigate('/new-account')}
        style={{
          margin: '14px 16px 24px',
          background: 'transparent', border: '1px dashed var(--line)',
          borderRadius: 16, padding: '14px',
          color: 'var(--fg-mute)', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        Agregar cuenta
      </button>

    </div>
  )
}
