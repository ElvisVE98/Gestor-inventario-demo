/**
 * activo.types.ts
 *
 * Define las interfaces TypeScript para la tabla "activos".
 * Un activo puede ser un equipo (notebook/PC), celular, tablet o licencia de software.
 * Todos viven en la misma tabla — usamos el campo `categoria` para diferenciarlos.
 *
 * Muchos campos son opcionales (null) porque no todos aplican a todas las categorías.
 * Por ejemplo: `imei` solo aplica a celulares y tablets, `tipo_licencia` solo a licencias.
 */

/**
 * Representa una fila completa de la tabla "activos" en Supabase.
 */
export interface Activo {
  id: string;                        // UUID generado por Supabase
  nombre_equipo: string;             // Nombre identificador del activo, ej: "NB-001"
  categoria: CategoriaActivo;        // Tipo de activo
  estado: EstadoActivo;              // Estado actual del activo

  // Campos de acceso remoto (solo aplican a equipos)
  teamviewer: string | null;
  anydesk: string | null;

  // Identificadores de red (solo aplican a equipos)
  mac: string | null;                // MAC dirección ethernet
  mac_wifi: string | null;          // MAC dirección WiFi

  // Specs del sistema operativo y hardware (equipos y tablets)
  sistema_operativo: string | null;
  arquitectura: string | null;       // 32-bit | 64-bit
  procesador: string | null;
  generacion_procesador: string | null;
  anio_procesador: number | null;
  ram: string | null;                // ej: "8 GB", "16 GB"
  disco: string | null;              // ej: "512 GB SSD"

  // Identificación del dispositivo
  modelo: string | null;
  imei: string | null;               // Solo celulares y tablets
  marca: string | null;
  anio_lanzamiento: number | null;

  // Información de licencia (solo aplica cuando categoria = 'licencia')
  tipo_suite: string | null;         // ej: "Microsoft 365", "Adobe Creative Cloud"
  tipo_licencia: string | null;      // ej: "perpetua", "suscripción anual"

  // Información de compra y documentación
  tipo_documento: string | null;     // ej: "factura", "boleta"
  numero_factura: string | null;
  costo: number | null;              // Costo en pesos chilenos
  fecha_compra: string | null;       // Fecha ISO 8601
  fecha_entrega: string | null;      // Cuándo fue entregado al inventario

  // Accesorios incluidos con el activo (principalmente para notebooks)
  alza_notebook: boolean | null;     // ¿Tiene alzador?
  monitor_extra: boolean | null;     // ¿Tiene monitor adicional?
  mochila: boolean | null;           // ¿Tiene mochila/maletín?
  auriculares: boolean | null;       // ¿Tiene auriculares?

  // URL del acta de entrega firmada (se sube a Supabase Storage)
  acta_entrega_url: string | null;

  // Campo libre para anotaciones adicionales
  especificaciones: string | null;

  created_at: string;
}

/**
 * Categorías posibles de un activo.
 * Definidas como tipo literal para evitar valores inválidos.
 */
export type CategoriaActivo = 'equipo' | 'celular' | 'tablet' | 'licencia';

/**
 * Estados posibles de un activo.
 * - disponible: listo para ser asignado
 * - asignado: actualmente en uso por una persona
 * - en_mantenimiento: en reparación o revisión, no disponible
 * - dado_de_baja: retirado del servicio (equivale al "borrado lógico")
 */
export type EstadoActivo = 'disponible' | 'asignado' | 'en_mantenimiento' | 'dado_de_baja';

/**
 * Datos para CREAR un activo nuevo.
 * Solo los campos verdaderamente obligatorios son requeridos.
 * El resto es opcional porque depende de la categoría.
 */
export interface CrearActivoDTO {
  nombre_equipo: string;
  categoria: CategoriaActivo;
  // Estado inicial siempre es 'disponible', pero se puede especificar
  estado?: EstadoActivo;
  teamviewer?: string;
  anydesk?: string;
  mac?: string;
  mac_wifi?: string;
  sistema_operativo?: string;
  arquitectura?: string;
  procesador?: string;
  generacion_procesador?: string;
  anio_procesador?: number;
  ram?: string;
  disco?: string;
  modelo?: string;
  imei?: string;
  marca?: string;
  anio_lanzamiento?: number;
  tipo_suite?: string;
  tipo_licencia?: string;
  tipo_documento?: string;
  numero_factura?: string;
  costo?: number;
  fecha_compra?: string;
  fecha_entrega?: string;
  alza_notebook?: boolean;
  monitor_extra?: boolean;
  mochila?: boolean;
  auriculares?: boolean;
  acta_entrega_url?: string;
  especificaciones?: string;
}

/**
 * Datos para EDITAR un activo. Todos los campos son opcionales.
 * No se puede cambiar la categoría de un activo una vez creado
 * para evitar inconsistencias en el historial.
 */
export type EditarActivoDTO = Partial<Omit<CrearActivoDTO, 'categoria'>>;

/**
 * Filtros disponibles para el listado de activos (GET /api/activos).
 * Permiten al frontend filtrar por categoría y/o estado sin traer todo.
 */
export interface FiltrosActivo {
  categoria?: CategoriaActivo;
  estado?: EstadoActivo;
}
