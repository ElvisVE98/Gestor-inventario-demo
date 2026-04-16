/**
 * persona.types.ts
 *
 * Define las interfaces TypeScript para la tabla "personas".
 * Separar los tipos en su propio archivo permite reutilizarlos en services,
 * controllers y routes sin duplicar definiciones.
 */

/**
 * Representa una fila completa de la tabla "personas" en Supabase.
 * Todos los campos son los que vienen de la base de datos.
 */
export interface Persona {
  id: string;                  // UUID generado por Supabase
  rut: string;                 // RUT chileno, ej: "12.345.678-9"
  nombre: string;              // Nombre completo de la persona
  correo: string;              // Correo corporativo
  cargo: string;               // Cargo o puesto dentro de la empresa
  sucursal: string;            // Oficina o sucursal donde trabaja
  centro_costo: string;        // Centro de costo al que pertenece (para contabilidad)
  estado: EstadoPersona;       // Si está activo o inactivo en la empresa
  created_at: string;          // Timestamp ISO 8601, lo maneja Supabase automáticamente
}

/**
 * Estados posibles de una persona.
 * Usamos un tipo literal en vez de enum para que sea más simple y compatible con JSON.
 * - activo: trabaja actualmente en la empresa
 * - inactivo: ya no trabaja (se fue, fue desvinculado, etc.)
 */
export type EstadoPersona = 'activo' | 'inactivo';

/**
 * Datos necesarios para CREAR una persona nueva.
 * No incluye `id` ni `created_at` porque los genera Supabase automáticamente.
 * No incluye `estado` porque siempre se crea como "activo".
 */
export interface CrearPersonaDTO {
  rut: string;
  nombre: string;
  correo: string;
  cargo: string;
  sucursal: string;
  centro_costo: string;
}

/**
 * Datos para EDITAR una persona existente.
 * Todos los campos son opcionales (Partial) porque el usuario puede querer
 * cambiar solo el cargo, o solo el correo, sin tener que enviar todo.
 * No se permite cambiar el RUT (es el identificador natural de la persona).
 */
export type EditarPersonaDTO = Partial<Omit<CrearPersonaDTO, 'rut'>>;

/**
 * Detalle de una persona que incluye sus activos asignados actualmente.
 * Se usa en el endpoint GET /api/personas/:id para devolver la info completa.
 * El campo `activos_asignados` viene de un JOIN con asignaciones + activos.
 */
export interface PersonaConActivos extends Persona {
  activos_asignados: ActivoAsignado[];
}

/**
 * Resumen de un activo asignado que se incluye en el detalle de una persona.
 * No necesitamos todos los campos del activo, solo los relevantes para mostrar.
 */
export interface ActivoAsignado {
  asignacion_id: string;       // ID de la asignación (para poder hacer devolución)
  activo_id: string;
  nombre_equipo: string;
  categoria: string;           // equipo | celular | tablet | licencia
  modelo: string | null;
  fecha_inicio: string;        // Desde cuándo está asignado
}
