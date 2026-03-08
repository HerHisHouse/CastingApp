import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      castings: {
        Row: Casting
        Insert: Omit<Casting, 'id' | 'created_at'>
        Update: Partial<Omit<Casting, 'id' | 'created_at'>>
      }
      proyectos: {
        Row: Proyecto
        Insert: Omit<Proyecto, 'id' | 'created_at'>
        Update: Partial<Omit<Proyecto, 'id' | 'created_at'>>
      }
      finanzas: {
        Row: Finanza
        Insert: Omit<Finanza, 'id' | 'created_at'>
        Update: Partial<Omit<Finanza, 'id' | 'created_at'>>
      }
      contactos: {
        Row: Contacto
        Insert: Omit<Contacto, 'id' | 'created_at'>
        Update: Partial<Omit<Contacto, 'id' | 'created_at'>>
      }
    }
  }
}

export type TipoProyecto = 'serie' | 'cine' | 'publicidad' | 'teatro' | 'doblaje' | 'tv' | 'evento'
export type TipoCasting = 'self_tape' | 'presencial' | 'callback_presencial' | 'callback_zoom'
export type EstadoCasting = 'enviado' | 'callback' | 'opcionado' | 'seleccionado' | 'descartado'
export type FuenteCasting = 'representante' | 'director_casting' | 'autocasting' | 'contacto' | 'agencia'
export type TipoIngreso = 'nomina' | 'derechos_imagen' | 'buyout' | 'royalties' | 'callback'
export type EstadoPago = 'pendiente' | 'pagado' | 'parcial'
export type TipoContacto = 'director_casting' | 'representante' | 'productor' | 'director'

export interface Casting {
  id: string
  created_at: string
  proyecto: string
  personaje: string
  tipo_proyecto: TipoProyecto
  director_casting: string | null
  productora: string | null
  plataforma_cliente: string | null
  fecha_casting: string
  tipo_casting: TipoCasting
  estado: EstadoCasting
  // ── Milestones de progresión (acumulativos, no se borran) ──
  fue_opcionado: boolean
  tuvo_callback: boolean
  tipo_callback: 'presencial' | 'zoom' | null
  // ──────────────────────────────────────────────────────────
  resultado_final: string | null
  actor_seleccionado: string | null
  enlace_self_tape: string | null
  enlace_guion: string | null
  notas: string | null
  fuente_casting: FuenteCasting
  nombre_agencia: string | null
  // ── Callback cobrable (si hay callback pero no te seleccionan) ──
  cobra_callback: boolean
  tarifa_callback: number | null
}

export type RolActorPublicidad = 'ocp' | 'secundario' | 'fe'

export interface Proyecto {
  id: string
  created_at: string
  casting_id: string | null
  proyecto: string
  personaje: string
  tipo_proyecto: TipoProyecto
  productora: string | null
  director: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_rodaje: string | null
  notas: string | null
  // ── Datos económicos ──────────────────────────────────────────────
  rol: RolActorPublicidad | null          // OCP / Secundario / FE
  tarifa_jornada: number | null           // importe bruto por jornada
  num_jornadas: number | null             // número de días de rodaje
  // Fitting
  horas_fitting_extra: number | null      // horas de fitting por encima de las 2h incluidas
  tarifa_hora_extra: number | null        // tarifa por hora extra (fitting + horas extra convenio)
  // Travel day
  num_travel_days: number | null          // días de viaje (se cobran al 50% de tarifa)
  // Horas extra convenio
  horas_extra_convenio: number | null     // horas extra al terminar el proyecto
  // Derechos de imagen
  derechos_imagen: number | null          // importe bruto derechos de imagen
  comision_pct: number | null             // % comisión agencia/representante
  facturado_via: string | null            // agencia / representante / etc.
  // ── Campos específicos de Evento ────────────────────────────────────────
  empresa: string | null                  // empresa organizadora del evento
  tarifa_neta_jornada: number | null      // tarifa neta por jornada (evento / doblaje)
  tarifa_traslado: number | null          // tarifa por traslado/viaje (evento)
  horas_extra_evento: number | null       // horas extra (evento)
  // ── Campos específicos de Doblaje ──────────────────────────────────────
  estudio_doblaje: string | null          // estudio donde se graba el doblaje
  num_takes: number | null                // número de takes del doblaje
  // ── Finanzas ───────────────────────────────────────────────────────────
  fecha_limite_cobro: string | null       // fecha límite de cobro calculada
}

export interface Finanza {
  id: string
  created_at: string
  proyecto_id: string | null
  proyecto_nombre: string
  tipo_ingreso: TipoIngreso
  cantidad: number
  fecha_factura: string | null
  fecha_pago: string | null
  estado_pago: EstadoPago
  comision_representante: number | null
  impuestos_estimados: number | null
  notas: string | null
  fecha_limite_cobro: string | null       // fecha máxima de reclamación (90 días)
}

export interface Contacto {
  id: string
  created_at: string
  nombre: string
  tipo_contacto: TipoContacto
  empresa: string | null
  email: string | null
  telefono: string | null
  notas: string | null
}
