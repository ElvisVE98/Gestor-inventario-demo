/**
 * asignacion.types.ts
 *
 * Define las interfaces para la tabla "asignaciones".
 * Una asignación vincula un activo con una persona durante un período de tiempo.
 *
 * La lógica es:
 * - Cuando se asigna: se crea un registro con fecha_inicio y fecha_fin = null
 * - Cuando se devuelve: se actualiza fecha_fin con la fecha actual
 * - Asignación "activa" = aquella donde fecha_fin IS NULL
 */

/**
 * Representa una fila completa de la tabla "asignaciones".
 */
export interface Asignacion {
  id: string;
  persona_id: string;         // FK hacia la tabla personas
  activo_id: string;          // FK hacia la tabla activos
  fecha_inicio: string;       // Timestamp ISO 8601 de cuando se asignó
  fecha_fin: string | null;   // null = activa, fecha = devuelta/terminada
  observaciones: string | null; // Notas opcionales, ej: "activo con pantalla rayada"
  created_at: string;
}

/**
 * Datos necesarios para CREAR una asignación (asignar activo a persona).
 * fecha_inicio es opcional: si no se envía, se usa la fecha actual.
 */
export interface CrearAsignacionDTO {
  persona_id: string;
  activo_id: string;
  fecha_inicio?: string;      // Si no se envía, se usa new Date().toISOString()
  observaciones?: string;
}

/**
 * Asignación activa con los datos de la persona y el activo expandidos.
 * Se usa para el listado de asignaciones, evitando que el frontend
 * tenga que hacer múltiples llamadas para obtener los nombres.
 */
export interface AsignacionConDetalle extends Asignacion {
  persona: {
    nombre: string;
    rut: string;
    cargo: string;
    sucursal: string;
  };
  activo: {
    nombre_equipo: string;
    categoria: string;
    modelo: string | null;
    marca: string | null;
  };
}
