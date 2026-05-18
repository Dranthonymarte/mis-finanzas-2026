import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export interface TipoConfig {
  nombre: string
  esIngreso: boolean
  emoji?: string
  color?: string
}

export interface MetaAhorro {
  id: string
  nombre: string
  objetivo: number
  actual: number
  fechaLimite: string
  emoji: string
  color?: string
  creada?: string
  completada?: boolean
}

// Real DB shape: { goal: { meta, extra, plazo, actual } }
// Kept loose to allow reading the stored object without crashing
export type FireConfig = Record<string, unknown>

export interface RecurrenteConfig {
  id:               string
  descripcion:      string
  monto:            number
  tipo:             string
  cat:              string
  recurrencia_dias: number    // period in days (e.g. 30 = monthly)
  recDia?:          number    // day of month to trigger (1-28)
}

export interface Config {
  tipos:         TipoConfig[]
  categorias:    Record<string, string[]>
  subcategorias: Record<string, string[]>
  presupuestos:  Record<string, number>
  recurrentes:   RecurrenteConfig[]
  closedMonths:  string[]
  metasAhorro:   MetaAhorro[]
  fireConfig:    FireConfig
}

export const DEFAULTS: Config = {
  tipos: [
    { nombre: 'Gasto',                 esIngreso: false },
    { nombre: 'Ingreso Fijo',          esIngreso: true  },
    { nombre: 'Ingreso Variable',      esIngreso: true  },
    { nombre: 'Ahorro en efectivo',    esIngreso: false },
    { nombre: 'Transferencia Interna', esIngreso: false },
    { nombre: 'Prestamo recibido',     esIngreso: true  },
    { nombre: 'Prestamo pagado',       esIngreso: false },
    { nombre: 'Ajuste',                esIngreso: false },
  ],
  categorias: {
    'Gasto':              ['Alimentación','Restaurantes','Transporte','Entretenimiento','Salud','Hogar','Servicios','Suscripciones','Ropa','Ocio','Educación'],
    'Ingreso Fijo':       ['Trabajo','Salario','Arrendamiento','Pensión'],
    'Ingreso Variable':   ['Freelance','Negocio','Inversión','Comisión','Venta','Otro'],
    'Ahorro en efectivo': ['Ahorro general','Emergencia','FIRE','Meta viaje','Meta hogar'],
    'Transferencia Interna': ['Transferencia Interna'],
    'Prestamo recibido':  ['Familiar','Amigo','Banco','Personal'],
    'Prestamo pagado':    ['Familiar','Amigo','Banco','Personal'],
    'Ajuste':             ['Corrección','Diferencia cambiaria','Otro'],
  },
  subcategorias: {
    'Alimentación':    ['Supermercado','Panadería','Carnicería','Bodega','Frutas y verduras'],
    'Restaurantes':    ['Almuerzo','Cena','Domicilio','Fast Food','Café / Merienda'],
    'Transporte':      ['Gasolina','Taxi / Uber','Bus','Parking','Peaje','Avión'],
    'Entretenimiento': ['Cine','Conciertos','Teatro','Eventos','Parques'],
    'Salud':           ['Farmacia','Médico','Dentista','Seguro','Gimnasio','Vitaminas'],
    'Hogar':           ['Alquiler','Electricidad','Agua','Internet','Gas','Reparaciones','Muebles'],
    'Servicios':       ['Teléfono','Internet','Cable TV','Seguro hogar'],
    'Suscripciones':   ['Netflix','Spotify','Disney+','HBO Max','Amazon Prime','YouTube Premium'],
    'Ropa':            ['Ropa','Zapatos','Accesorios'],
    'Ocio':            ['Viajes','Deporte','Hobbies','Libros'],
    'Educación':       ['Cursos online','Universidad','Materiales','Idiomas'],
    'Trabajo':         ['Salario','Bono','Horas extra','Viáticos'],
    'Freelance':       ['Diseño','Programación','Consultoría','Contenido','Traducción'],
    'Inversión':       ['Acciones','Crypto','Fondo mutuo','Dividendos','Bienes raíces'],
  },
  presupuestos:  {},
  recurrentes:   [],
  closedMonths:  [],
  metasAhorro:   [],
  fireConfig:    { goal: { meta: 200000, extra: 500, plazo: 20, actual: 0 } },
}

// ── Normalize tipos: DB stores string[] (Vanilla legacy) OR TipoConfig[]
function normalizeTipos(raw: unknown): TipoConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULTS.tipos
  // Already objects with esIngreso
  if (typeof raw[0] === 'object' && raw[0] !== null && 'esIngreso' in raw[0]) {
    return raw as TipoConfig[]
  }
  // Legacy string array → map using DEFAULTS lookup, fallback esIngreso=false
  return (raw as string[]).map(nombre => {
    const def = DEFAULTS.tipos.find(d => d.nombre === nombre)
    return def ?? { nombre, esIngreso: false }
  })
}

// ── Normalize recurrentes: Vanilla shape {dia,desc,amount} → {recDia,descripcion,monto}
function normalizeRecurrentes(raw: unknown): RecurrenteConfig[] {
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[]).map(r => ({
    id:               String(r.id ?? Date.now()),
    descripcion:      String(r.descripcion ?? r.desc ?? ''),
    monto:            parseFloat(String(r.monto ?? r.amount ?? 0)) || 0,
    tipo:             String(r.tipo ?? 'Gasto'),
    cat:              String(r.cat ?? ''),
    recurrencia_dias: parseInt(String(r.recurrencia_dias ?? 30)) || 30,
    recDia:           r.recDia != null
                        ? Number(r.recDia)
                        : r.dia != null ? Number(r.dia) : undefined,
  }))
}

export function useConfig() {
  const userId = useAuthStore(s => s.userId)
  const [config,  setConfig]  = useState<Config>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    supabase
      .from('config_usuario')
      .select('tipos,categorias,subcategorias,presupuestos,recurrentes,closed_months,metas_ahorro,fire_config')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return }
        const cats = (data.categorias  as Record<string,string[]> | null)
        const subs = (data.subcategorias as Record<string,string[]> | null)

        setConfig({
          tipos:         normalizeTipos(data.tipos),
          categorias:    (cats  && Object.keys(cats).length)  ? cats   : DEFAULTS.categorias,
          subcategorias: (subs  && Object.keys(subs).length)  ? subs   : DEFAULTS.subcategorias,
          presupuestos:  (data.presupuestos  as Record<string,number>) ?? DEFAULTS.presupuestos,
          recurrentes:   normalizeRecurrentes(data.recurrentes),
          closedMonths:  (data.closed_months as string[])             ?? [],
          metasAhorro:   (data.metas_ahorro  as MetaAhorro[])         ?? [],
          fireConfig:    (data.fire_config   as FireConfig)            ?? DEFAULTS.fireConfig,
        })
        setLoading(false)
      })
  }, [userId])

  async function updateConfig(campo: string, valor: unknown) {
    if (!userId) return
    // Optimistic local update so UI reflects changes immediately
    const campoMap: Record<string, keyof Config> = {
      tipos:         'tipos',
      categorias:    'categorias',
      subcategorias: 'subcategorias',
      presupuestos:  'presupuestos',
      recurrentes:   'recurrentes',
      closed_months: 'closedMonths',
      metas_ahorro:  'metasAhorro',
      fire_config:   'fireConfig',
    }
    const key = campoMap[campo]
    if (key) setConfig(prev => ({ ...prev, [key]: valor }))
    // Upsert instead of update — creates the row if it doesn't exist yet
    await supabase
      .from('config_usuario')
      .upsert({ user_id: userId, [campo]: valor }, { onConflict: 'user_id' })
  }

  return { config, loading, updateConfig }
}
