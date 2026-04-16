/**
 * persona.types.ts
 *
 * Interfaces TypeScript para el módulo de personas.
 * Espeja exactamente los tipos del backend para que TypeScript
 * valide que usamos los campos correctos en services, páginas y modales.
 */

/**
 * Estados posibles de una persona.
 */
export type EstadoPersona = 'activo' | 'inactivo'

/**
 * Representa una persona completa tal como la devuelve la API.
 */
export interface Persona {
  id: string
  rut: string
  nombre: string
  correo: string
  cargo: string
  sucursal: string
  centro_costo: string
  estado: EstadoPersona
  created_at: string
}

/**
 * Resumen de un activo que aparece en el detalle de una persona.
 * Solo trae los campos necesarios para mostrar en la lista de asignados.
 */
export interface ActivoAsignado {
  asignacion_id: string    // ID de la asignación (para hacer devolución en el futuro)
  activo_id: string
  nombre_equipo: string
  categoria: string        // equipo | celular | tablet | licencia
  modelo: string | null
  fecha_inicio: string     // ISO 8601 — cuándo se asignó
}

/**
 * Persona con sus activos asignados actualmente.
 * Es lo que devuelve GET /api/personas/:id.
 */
export interface PersonaConActivos extends Persona {
  activos_asignados: ActivoAsignado[]
}

/**
 * Datos para crear una persona nueva.
 * Todos los campos son obligatorios al crear.
 */
export interface CrearPersonaDTO {
  rut: string
  nombre: string
  correo: string
  cargo: string
  sucursal: string
  centro_costo: string
}

/**
 * Datos para editar una persona.
 * Todos los campos son opcionales (solo se envían los que cambian).
 * El RUT no se puede editar — por eso se excluye.
 */
export type EditarPersonaDTO = Partial<Omit<CrearPersonaDTO, 'rut'>>
