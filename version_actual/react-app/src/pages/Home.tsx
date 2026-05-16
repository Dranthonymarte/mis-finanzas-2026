import { useNavigate } from 'react-router-dom'
import Sparkline from '../components/ui/Sparkline'
import Pill      from '../components/ui/Pill'
import CatIcon   from '../components/ui/CatIcon'
import { MOCK_BALANCE_SERIES, MOCK_KPIS, MOCK_TRANSACTIONS, MOCK_MONTH, fmtShort, fmt, txnGroup } from '../data/mock'
import { SearchIcon, BellIcon } from '../components/icons/Icons'

/* ── User avatar ── */
function Avatar({ letter }: { letter: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--teal), var(--amber))',
      display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: 13, color: 'var(--ink-0)', flexShrink: 0,
    }}>{letter}</div>
  )
}

/* ── Icon circle button ── */
const iBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: 'var(--ink-2)', border: '1px solid var(--line)',
  display: 'grid', placeItems: 'center', color: 'var(--fg-dim)',
  cursor: 'pointer',
}

/* ── Pill button (insight actions) ── */
function PillBtn({ primary, children, onClick }: { primary?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 11.5,
        background: primary ? 'var(--amber)' : 'transparent',
        color:      primary ? 'var(--ink-0)' : 'var(--fg-dim)',
        border:     primary ? 'none' : '1px solid var(--line)',
        fontWeight: 500, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/* ── TxnRow preview (home) ── */
function TxnRowPreview({ t, last }: { t: typeof MOCK_TRANSACTIONS[0]; last: boolean }) {
  const isIncome = txnGroup(t.tipo) === 'ingreso'
  const isAhorro = txnGroup(t.tipo) === 'ahorro'
  const color = isIncome ? 'var(--pos)' : isAhorro ? 'var(--info)' : 'var(--fg)'
  const sign  = isIncome ? '+' : '−'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10,
      alignItems: 'center', padding: '11px 12px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <CatIcon cat={t.cat} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.desc}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
          <span>{t.cat}</span>
          <span>·</span>
          <span>{t.time}</span>
          {t.author && (
            <>
              <span>·</span>
              <span style={{
                display: 'inline-flex', width: 14, height: 14, borderRadius: '50%',
                background: t.author === 'isabel' ? '#b0a3c7' : '#6a94c4',
                color: 'var(--ink-0)', fontSize: 9, fontWeight: 700,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {t.author === 'isabel' ? 'I' : 'A'}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {sign}{fmt(Math.abs(t.amount))}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── User bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px', gap: 10 }}>
        <Avatar letter="A" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1 }}>Hola,</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>Anthony</div>
        </div>
        <button style={iBtn} aria-label="Buscar"><SearchIcon /></button>
        <button style={{ ...iBtn, position: 'relative' }} aria-label="Notificaciones">
          <BellIcon />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)',
          }} />
        </button>
      </div>

      {/* ── Hero balance ── */}
      <div style={{ padding: '14px 22px 8px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-mute)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
          Patrimonio neto · USD
        </div>
        <div className="font-display" style={{ fontSize: 52, lineHeight: 1, letterSpacing: '-.02em', marginTop: 6 }}>
          {fmtShort(MOCK_MONTH.net).slice(0, -3)}
          <span style={{ color: 'var(--fg-dim)', fontSize: '.55em' }}>
            {fmt(MOCK_MONTH.net).slice(-3)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone="pos" size="xs">↑ +$342.18</Pill>
          <Pill tone="pos" size="xs">+2.4%</Pill>
          <span style={{ fontSize: 10.5, color: 'var(--fg-mute)' }}>vs. marzo</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <Sparkline data={MOCK_BALANCE_SERIES} color="var(--amber)" w={350} h={36} fill stroke={1.8} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--fg-mute)' }}>
            <span>May</span><span>Jul</span><span>Sep</span><span>Nov</span><span>Ene</span><span>Abr</span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ padding: '8px 16px 4px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { emoji: '＋', l: 'Añadir',    c: 'var(--amber)',  onClick: () => {} },
          { emoji: '⇄',  l: 'Transferir', c: 'var(--teal-s)', onClick: () => {} },
          { emoji: '⊡',  l: 'Escanear',  c: 'var(--info)',   onClick: () => {} },
          { emoji: '✦',  l: 'IA',         c: '#b0a3c7',      onClick: () => navigate('/ia') },
        ].map((a) => (
          <button
            key={a.l}
            onClick={a.onClick}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20, color: a.c, lineHeight: 1 }}>{a.emoji}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-dim)', fontWeight: 500 }}>{a.l}</span>
          </button>
        ))}
      </div>

      {/* ── KPI cards 2×2 ── */}
      <div style={{ padding: '12px 16px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {MOCK_KPIS.map((k) => {
          const good = k.neg ? k.delta < 0 : k.delta > 0
          return (
            <div key={k.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, color: 'var(--fg-mute)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {k.label}
                </span>
                <Pill tone={good ? 'pos' : 'neg'} size="xs">
                  {k.delta > 0 ? '+' : ''}{k.delta}%
                </Pill>
              </div>
              <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>
                {k.suffix
                  ? `${k.value}${k.suffix}`
                  : `$${k.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              </div>
              <div style={{ marginTop: 5 }}>
                <Sparkline data={k.spark} color={k.neg ? 'var(--neg)' : 'var(--amber)'} w={140} h={18} fill stroke={1.4} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Insight IA card ── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          padding: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, var(--amber-d) 0%, transparent 75%), var(--ink-2)',
          border: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: 'var(--amber)', color: 'var(--ink-0)',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
            }}>✦</div>
            <span style={{ fontSize: 9.5, letterSpacing: '.12em', color: 'var(--amber)', textTransform: 'uppercase', fontWeight: 600 }}>
              Insight
            </span>
            <span style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 'auto' }}>Hace 2h</span>
          </div>
          <div className="font-display" style={{ fontSize: 16, lineHeight: 1.4 }}>
            Gastaste{' '}
            <span style={{ color: 'var(--neg)' }}>32% más</span>
            {' '}en restaurantes esta semana.
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <PillBtn primary onClick={() => navigate('/ia')}>Ver detalle</PillBtn>
            <PillBtn>Descartar</PillBtn>
          </div>
        </div>
      </div>

      {/* ── Últimos movimientos ── */}
      <div style={{ padding: '14px 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 400 }}>Últimos movimientos</h2>
          <button
            onClick={() => navigate('/txn')}
            style={{ fontSize: 11.5, color: 'var(--amber)', fontWeight: 600, cursor: 'pointer' }}
          >
            Ver todos →
          </button>
        </div>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {MOCK_TRANSACTIONS.slice(0, 5).map((t, i, arr) => (
            <TxnRowPreview key={t.id} t={t} last={i === arr.length - 1} />
          ))}
        </div>
      </div>

    </div>
  )
}
