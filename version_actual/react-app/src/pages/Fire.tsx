// ═══════════════════════════════════════════════════
// Fire — /fire  (BLOQUE 5)
// FIRE number · simulador · datos reales · useKPIs
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import AppHeader from '../components/shell/AppHeader'
import { useConfig } from '../hooks/useConfig'
import { useKPIs } from '../hooks/useKPIs'
import { useFormat } from '../hooks/useFormat'
import { useAccounts } from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { usePrefsStore } from '../store/prefs'

function yearsToFire(
  patrimony: number,
  target: number,
  annualSavings: number,
  returnPct: number,
): number {
  if (target <= patrimony) return 0
  if (annualSavings <= 0 && returnPct <= 0) return 9999
  const r = returnPct / 100
  let acc = patrimony,
    years = 0
  while (acc < target && years < 100) {
    acc = acc * (1 + r) + annualSavings
    years++
  }
  return years
}

const inp: React.CSSProperties = {
  width: '100%',
  background: 'var(--ink-1)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--fg)',
  outline: 'none',
  fontFamily: 'var(--f-num)',
  boxSizing: 'border-box',
}

export default function Fire() {
  const { config, updateConfig } = useConfig()
  const { fmt } = useFormat()
  const initialized = useRef(false)
  const mesActivo = usePrefsStore((s) => s.mesActivo)

  // Datos reales
  const { accounts } = useAccounts()
  const { transactions } = useTransactions(mesActivo)
  const kpis = useKPIs(transactions, config)

  const [gastos, setGastos] = useState('')
  const [ahorro, setAhorro] = useState('')
  const [patrimonio, setPatrimonio] = useState('')
  const [retorno, setRetorno] = useState('7')
  const [overridden, setOverridden] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  // ── 1) Inicializar desde config guardada (una sola vez) ──
  useEffect(() => {
    if (initialized.current) return
    const f = config.fireConfig as {
      goal?: {
        meta?: number
        extra?: number
        plazo?: number
        actual?: number
      }
    }
    const g = f?.goal
    if (g && (g.meta || g.actual || g.extra)) {
      initialized.current = true
      if (g.extra) setAhorro(String(g.extra))
      if (g.actual) setPatrimonio(String(g.actual))
    }
  }, [config.fireConfig])

  // ── 2) Gastos y ahorro desde KPIs del mes activo (default) ──
  useEffect(() => {
    if (!transactions) return
    if (!overridden.has('gastos') && kpis.gastos > 0) {
      setGastos((kpis.gastos * 12).toFixed(0))
    }
    if (!overridden.has('ahorro') && kpis.ahorro > 0) {
      setAhorro(kpis.ahorro.toFixed(0))
    }
  }, [transactions, kpis.gastos, kpis.ahorro, overridden])

  // ── 3) Patrimonio = cuentas USD (excluye DEBT) ──
  useEffect(() => {
    if (!accounts || overridden.has('patrimonio')) return
    const pat = accounts
      .filter((a) => a.currency === 'USD' && a.type !== 'DEBT')
      .reduce((s, a) => s + a.balance, 0)
    if (pat > 0) setPatrimonio(pat.toFixed(0))
  }, [accounts, overridden])

  function handleChange(field: string, setter: (v: string) => void, value: string) {
    setter(value)
    setOverridden((prev) => new Set(prev).add(field))
  }

  function handleResetToReal() {
    setOverridden(new Set())
  }

  async function handleSave() {
    await updateConfig('fire_config', {
      goal: {
        meta: Math.round(fireNumber),
        actual: parseFloat(patrimonio) || 0,
        plazo: years,
        extra: parseFloat(ahorro) || 0,
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const annualExpenses = parseFloat(gastos) || 0
  const monthlyAhorro = parseFloat(ahorro) || 0
  const currentPat = parseFloat(patrimonio) || 0
  const returnPct = parseFloat(retorno) || 7

  const hasData = annualExpenses > 0
  const fireNumber = hasData ? annualExpenses / 0.04 : 0
  const annualSav = monthlyAhorro * 12
  const years = hasData ? yearsToFire(currentPat, fireNumber, annualSav, returnPct) : 0
  const progress = hasData ? Math.min(100, (currentPat / fireNumber) * 100) : 0
  const fireYear = new Date().getFullYear() + years

  const isOverriding = overridden.size > 0

  const fields: {
    label: string
    value: string
    field: string
    set: (v: string) => void
  }[] = [
    { label: 'Gastos anuales (USD)', value: gastos, field: 'gastos', set: setGastos },
    { label: 'Ahorro mensual (USD)', value: ahorro, field: 'ahorro', set: setAhorro },
    {
      label: 'Patrimonio actual (USD)',
      value: patrimonio,
      field: 'patrimonio',
      set: setPatrimonio,
    },
    { label: 'Retorno anual esperado (%)', value: retorno, field: 'retorno', set: setRetorno },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <AppHeader title="FIRE / Jubilación" back />

      {/* ── Result card ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, var(--amber-d) 0%, transparent 70%), var(--ink-2)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: '20px 16px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* ℹ botón colapsable — patrón app: círculo 22px */}
          <button
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="¿Qué es FIRE?"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              background: infoOpen ? 'var(--amber)' : 'var(--ink-3)',
              color: infoOpen ? 'var(--ink-0)' : 'var(--fg-mute)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: 0,
              transition: 'background .15s',
            }}
          >
            i
          </button>

          {infoOpen && (
            <div
              style={{
                background: 'var(--ink-1)',
                border: '1px solid var(--amber)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 14,
                fontSize: 11.5,
                color: 'var(--fg-mute)',
                lineHeight: 1.65,
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>
                ¿Qué es FIRE?
              </div>
              <div>
                <strong style={{ color: 'var(--fg)' }}>FIRE</strong> ={' '}
                <em>Financial Independence, Retire Early</em> (Independencia financiera, retiro
                anticipado)
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: 'var(--fg)' }}>Regla del 4%:</strong> si tienes ahorrado
                25× tus gastos anuales, puedes vivir de los intereses indefinidamente — retirando
                solo el 4% al año.
              </div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: 'var(--fg)' }}>Tu FIRE number</strong> es el capital que
                necesitas acumular para lograrlo.
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 10.5,
              color: 'var(--amber)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            FIRE number · Regla del 4%
          </div>

          {!hasData ? (
            <div
              style={{
                padding: '12px 0',
                fontSize: 13,
                color: 'var(--fg-mute)',
                lineHeight: 1.6,
              }}
            >
              Registra transacciones para ver
              <br />
              tu proyección FIRE
            </div>
          ) : (
            <>
              <div className="num" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
                {fmt(fireNumber)}
              </div>
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--fg-mute)' }}>
                {years === 0 ? (
                  <span style={{ color: 'var(--pos)', fontWeight: 600 }}>¡Ya alcanzaste FIRE!</span>
                ) : years >= 100 ? (
                  <span style={{ color: 'var(--neg)' }}>
                    Incrementa tu ahorro mensual para alcanzar FIRE
                  </span>
                ) : (
                  <>
                    <span style={{ color: 'var(--fg)', fontWeight: 600, fontSize: 16 }}>
                      {years} años
                    </span>{' '}
                    para FIRE · meta en{' '}
                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{fireYear}</span>
                  </>
                )}
              </div>

              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  background: 'var(--ink-3)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--amber)',
                    borderRadius: 999,
                    transition: 'width .3s',
                  }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--fg-mute)' }}>
                {progress.toFixed(1)}% del camino · ahorro anual {fmt(annualSav)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Inputs ── */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Indicador datos reales / editados */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 10,
            background: isOverriding ? 'rgba(255,180,0,.08)' : 'rgba(88,178,106,.08)',
            border: `1px solid ${isOverriding ? 'rgba(255,180,0,.25)' : 'rgba(88,178,106,.25)'}`,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: isOverriding ? 'var(--amber)' : 'var(--pos)',
              fontWeight: 600,
            }}
          >
            {isOverriding ? '✏ Valores editados manualmente' : '⚡ Datos reales del mes activo'}
          </span>
          {isOverriding && (
            <button
              onClick={handleResetToReal}
              style={{
                fontSize: 10.5,
                color: 'var(--amber)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                fontWeight: 600,
              }}
            >
              Restablecer
            </button>
          )}
        </div>

        {fields.map((f) => (
          <div
            key={f.label}
            style={{
              background: 'var(--ink-2)',
              border: `1px solid ${overridden.has(f.field) ? 'var(--amber)' : 'var(--line)'}`,
              borderRadius: 14,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginBottom: 6 }}>
              {f.label}
              {overridden.has(f.field) && (
                <span style={{ color: 'var(--amber)', marginLeft: 6, fontSize: 10 }}>editado</span>
              )}
            </div>
            <input
              type="number"
              value={f.value}
              onChange={(e) => handleChange(f.field, f.set, e.target.value)}
              style={inp}
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          style={{
            background: saved ? 'var(--pos)' : 'var(--amber)',
            color: 'var(--ink-0)',
            border: 'none',
            borderRadius: 12,
            padding: '11px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background .2s',
          }}
        >
          {saved ? '✓  Guardado' : 'Guardar simulador'}
        </button>
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}
