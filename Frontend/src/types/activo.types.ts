/**
 * activo.types.ts
 *
 * Interfaces TypeScript para el módulo de activos.
 * Espeja exactamente los tipos del backend — un activo puede ser
 * equipo, celular, tablet o licencia. Todos comparten la misma tabla;
 * el campo `categoria` diferencia cuáles campos aplican a cada uno.
 */

/**
 * Categorías posibles de un activo.
 */
export type CategoriaActivo = 'equipo' | 'celular' | 'tablet' | 'licencia'

/**
 * Estados posibles de un activo.
 * prestamo → asignado temporalmente sin ser una asignación formal
 * robo     → el activo fue reportado como robado (borrado lógico especial)
 */
export type EstadoActivo = 'disponible' | 'asignado' | 'en_mantenimiento' | 'dado_de_baja' | 'prestamo' | 'robo'

/**
 * Activo completo tal como lo devuelve la API.
 * Muchos campos son null porque no aplican a todas las categorías.
 */
export interface Activo {
  id: string
  nombre_equipo: string       // Identificador único, ej: "NB-001"
  categoria: CategoriaActivo
  estado: EstadoActivo

  // Acceso remoto — solo equipos
  teamviewer: string | null
  anydesk: string | null

  // Red — solo equipos
  mac: string | null
  mac_wifi: string | null

  // Sistema operativo y hardware — equipos y tablets
  sistema_operativo: string | null
  arquitectura: string | null
  procesador: string | null
  generacion_procesador: string | null
  anio_procesador: number | null
  ram: string | null
  disco: string | null

  // Identificación del dispositivo
  modelo: string | null
  imei: string | null          // Solo celulares y tablets
  marca: string | null
  anio_lanzamiento: number | null

  // Licencias — solo cuando categoria = 'licencia'
  tipo_suite: string | null
  tipo_licencia: string | null

  // Información de compra
  tipo_documento: string | null
  numero_factura: string | null
  costo: number | null
  fecha_compra: string | null
  fecha_entrega: string | null

  // Accesorios incluidos — principalmente notebooks
  alza_notebook: boolean | null
  monitor_extra: boolean | null
  mochila: boolean | null
  auriculares: boolean | null

  // Otros
  acta_entrega_url: string | null
  especificaciones: string | null

  created_at: string
}

/**
 * Datos resumidos de la persona que tiene asignado el activo actualmente.
 * Solo aparece en el detalle (GET /api/activos/:id).
 */
export interface PersonaAsignadaResumen {
  asignacion_id: string
  persona_id: string
  nombre: string
  rut: string
  cargo: string | null
  fecha_inicio: string
}

/**
 * Activo con la persona asignada incluida.
 * Es lo que devuelve GET /api/activos/:id.
 */
export interface ActivoDetalle extends Activo {
  persona_asignada: PersonaAsignadaResumen | null
}

/**
 * Datos para crear un activo nuevo.
 * Solo nombre_equipo y categoria son obligatorios.
 * El resto depende de la categoría.
 */
export interface CrearActivoDTO {
  nombre_equipo: string
  categoria: CategoriaActivo
  estado?: EstadoActivo
  teamviewer?: string
  anydesk?: string
  mac?: string
  mac_wifi?: string
  sistema_operativo?: string
  arquitectura?: string
  procesador?: string
  generacion_procesador?: string
  anio_procesador?: number
  ram?: string
  disco?: string
  modelo?: string
  imei?: string
  marca?: string
  anio_lanzamiento?: number
  tipo_suite?: string
  tipo_licencia?: string
  tipo_documento?: string
  numero_factura?: string
  costo?: number
  fecha_compra?: string
  fecha_entrega?: string
  alza_notebook?: boolean
  monitor_extra?: boolean
  mochila?: boolean
  auriculares?: boolean
  acta_entrega_url?: string
  especificaciones?: string
}

/**
 * Datos para editar un activo.
 * Todo es opcional. No se puede cambiar la categoria.
 */
export type EditarActivoDTO = Partial<Omit<CrearActivoDTO, 'categoria'>>

/**
 * Filtros para el listado de activos.
 */
export interface FiltrosActivo {
  categoria?: CategoriaActivo
  estado?: EstadoActivo
}
