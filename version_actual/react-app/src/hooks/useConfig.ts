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

export interface FireConfig {
  meta: number
  retorno: number
  gastos: number
}

export interface Config {
  tipos:         TipoConfig[]
  categorias:    Record<string, string[]>
  subcategorias: Record<string, string[]>
  presupuestos:  Record<string, number>
  recurrentes:   unknown[]
  closedMonths:  string[]
  metasAhorro:   MetaAhorro[]
  fireConfig:    FireConfig
}

const DEFAULTS: Config = {
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
  fireConfig:    { meta: 200000, retorno: 7, gastos: 15000 },
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
        setConfig({
          tipos:         (data.tipos         as TipoConfig[]          ) ?? DEFAULTS.tipos,
          categorias:    (data.categorias     as Record<string,string[]>) ?? DEFAULTS.categorias,
          subcategorias: (data.subcategorias  as Record<string,string[]>) ?? DEFAULTS.subcategorias,
          presupuestos:  (data.presupuestos   as Record<string,number> ) ?? DEFAULTS.presupuestos,
          recurrentes:   (data.recurrentes    as unknown[]             ) ?? [],
          closedMonths:  (data.closed_months  as string[]              ) ?? [],
          metasAhorro:   (data.metas_ahorro   as MetaAhorro[]          ) ?? [],
          fireConfig:    (data.fire_config    as FireConfig            ) ?? DEFAULTS.fireConfig,
        })
        setLoading(false)
      })
  }, [userId])

  async function updateConfig(campo: string, valor: unknown) {
    if (!userId) return
    await supabase
      .from('config_usuario')
      .update({ [campo]: valor })
      .eq('user_id', userId)
  }

  return { config, loading, updateConfig }
}
