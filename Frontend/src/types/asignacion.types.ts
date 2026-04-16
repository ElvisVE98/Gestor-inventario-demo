/**
 * asignacion.types.ts
 *
 * Interfaces para el módulo de asignaciones.
 * Una asignación vincula un activo con una persona durante un período.
 * Se usa en el historial del detalle de activos y personas,
 * y en los formularios para crear o cerrar asignaciones.
 */

/**
 * Datos para crear una asignación nueva.
 * persona_id y activo_id son obligatorios.
 * fecha_inicio es opcional — el backend usa ahora() si se omite.
 */
export interface CrearAsignacionDTO {
  persona_id: string
  activo_id: string
  fecha_inicio?: string      // ISO 8601. Si se omite, el backend usa now()
  observaciones?: string
}

/**
 * Asignación con datos de persona y activo expandidos por el backend.
 * Es lo que devuelve GET /api/asignaciones con los joins incluidos.
 */
export interface AsignacionConDetalle {
  id: string
  persona_id: string
  activo_id: string
  fecha_inicio: string
  fecha_fin: string | null    // null = asignación activa, fecha = ya devuelto
  observaciones: string | null
  created_at: string

  // Datos de la persona (join)
  persona: {
    nombre: string
    rut: string
    cargo: string
    sucursal: string
  }

  // Datos del activo (join)
  activo: {
    nombre_equipo: string
    categoria: string
    modelo: string | null
    marca: string | null
  }
}
