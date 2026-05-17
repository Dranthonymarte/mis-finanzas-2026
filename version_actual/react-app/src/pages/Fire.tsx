// ═══════════════════════════════════════════════════
// Fire — /fire  (BLOQUE 5)
// FIRE number · simulador · useFormat
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useConfig } from '../hooks/useConfig'
import { useFormat }  from '../hooks/useFormat'

function yearsToFire(patrimony: number, target: number, annualSavings: number, returnPct: number): number {
  if (target <= patrimony) return 0
  if (annualSavings <= 0 && returnPct <= 0) return 9999
  const r = returnPct / 100
  let acc = patrimony, years = 0
  while (acc < target && years < 100) {
    acc = acc * (1 + r) + annualSavings
    years++
  }
  return years
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--ink-1)', border: '1px solid var(--line)',
  borderRadius: 10, padding: '9px 12px', fontSize: 16, fontWeight: 600,
  color: 'var(--fg)', outline: 'none', fontFamily: 'var(--f-num)',
  boxSizing: 'border-box',
}

export default function Fire() {
  const { config, updateConfig } = useConfig()
  const { fmt }       = useFormat()
  const initialized   = useRef(false)

  const [gastos,     setGastos]     = useState('15000')
  const [ahorro,     setAhorro]     = useState('500')
  const [patrimonio, setPatrimonio] = useState('5000')
  const [retorno,    setRetorno]    = useState('7')
  const [saved,      setSaved]      = useState(false)

  // Initialize from config once it loads
  useEffect(() => {
    if (initialized.current) return
    const f = config.fireConfig
    if (f.meta || f.gastos || f.retorno) {
      initialized.current = true
      if (f.gastos)  setGastos(String(f.gastos))
      if (f.retorno) setRetorno(String(f.retorno))
    }
  }, [config.fireConfig])

  async function handleSave() {
    await updateConfig('fire_config', {
      gastos:  parseFloat(gastos)     || 15000,
      retorno: parseFloat(retorno)    || 7,
      meta:    fireNumber,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const annualExpenses = parseFloat(gastos)     || 15000
  const monthlyAhorro  = parseFloat(ahorro)      || 500
  const currentPat     = parseFloat(patrimonio)  || 0
  const returnPct      = parseFloat(retorno)     || 7

  const fireNumber  = annualExpenses / 0.04
  const annualSav   = monthlyAhorro * 12
  const years       = yearsToFire(currentPat, fireNumber, annualSav, returnPct)
  const progress    = Math.min(100, (currentPat / fireNumber) * 100)
  const fireYear    = new Date().getFullYear() + years

  const fields = [
    { label: 'Gastos anuales (USD)',        value: gastos,     set: setGastos     },
    { label: 'Ahorro mensual (USD)',        value: ahorro,     set: setAhorro     },
    { label: 'Patrimonio actual (USD)',     value: patrimonio, set: setPatrimonio },
    { label: 'Retorno anual esperado (%)', value: retorno,    set: setRetorno    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="FIRE / Jubilación" back />

      {/* ── Result card ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--amber-d) 0%, transparent 70%), var(--ink-2)',
          border: '1px solid var(--line)', borderRadius: 18, padding: '20px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--amber)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            FIRE number · Regla del 4%
          </div>
          <div className="num" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
            {fmt(fireNumber)}
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--fg-mute)' }}>
            {years === 0 ? (
              <span style={{ color: 'var(--pos)', fontWeight: 600 }}>¡Ya alcanzaste FIRE!</span>
            ) : years >= 100 ? (
              <span style={{ color: 'var(--neg)' }}>Incrementa tu ahorro mensual para alcanzar FIRE</span>
            ) : (
              <>
                <span style={{ color: 'var(--fg)', fontWeight: 600, fontSize: 16 }}>{years} años</span>
                {' '}para FIRE · meta en{' '}
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{fireYear}</span>
              </>
            )}
          </div>

          <div style={{ marginTop: 16, height: 6, background: 'var(--ink-3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--amber)', borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--fg-mute)' }}>
            {progress.toFixed(1)}% del camino · ahorro anual {fmt(annualSav)}
          </div>
        </div>
      </div>

      {/* ── Inputs ── */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => (
          <div key={f.label} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 6 }}>{f.label}</div>
            <input type="number" value={f.value} onChange={e => f.set(e.target.value)} style={inp} />
          </div>
        ))}

        <button
          onClick={handleSave}
          style={{
            background: saved ? 'var(--pos)' : 'var(--amber)', color: 'var(--ink-0)',
            border: 'none', borderRadius: 12, padding: '11px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer', transition: 'background .2s',
          }}
        >
          {saved ? '✓  Guardado' : 'Guardar simulador'}
        </button>
      </div>

      {/* ── Info ── */}
      <div style={{ padding: '20px 16px 24px' }}>
        <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', fontSize: 11, color: 'var(--fg-mute)', lineHeight: 1.6 }}>
          La regla del 4% indica que puedes retirar el 4% de tu cartera anualmente sin agotarla en 30 años. El FIRE number es el capital necesario para que tus retiros anuales cubran tus gastos.
        </div>
      </div>
    </div>
  )
}
