/**
 * historial.types.ts
 *
 * Define las interfaces para la tabla "historial_actividad".
 * Esta tabla actúa como un log de auditoría: registra cada acción importante
 * que ocurre en el sistema (asignaciones, cambios de estado, desvinculaciones, etc.)
 *
 * Es de solo lectura para los endpoints: se escribe desde los services
 * y se lee desde el endpoint GET /api/historial.
 */

/**
 * Representa una fila completa de la tabla "historial_actividad".
 */
export interface HistorialActividad {
  id: string;
  accion: string;               // Descripción de la acción, ej: "ASIGNACION_CREADA"
  tabla_afectada: string;       // Qué tabla fue modificada: personas | activos | asignaciones
  registro_id: string;          // ID del registro afectado en esa tabla
  detalle: string | null;       // JSON o texto con más información del cambio
  realizado_por: string | null; // Quién hizo la acción (email o nombre del usuario del sistema)
  fecha: string;                // Timestamp ISO 8601 de cuando ocurrió
}

/**
 * Datos para CREAR un registro en el historial.
 * Se usa internamente en los services — no expuesto directamente al cliente.
 */
export interface CrearHistorialDTO {
  accion: string;
  tabla_afectada: string;
  registro_id: string;
  detalle?: string;
  realizado_por?: string;
}

/**
 * Filtros opcionales para el endpoint GET /api/historial.
 * Permiten buscar por tabla, por registro específico, o por rango de fechas.
 */
export interface FiltrosHistorial {
  tabla_afectada?: string;
  registro_id?: string;
  desde?: string;         // Fecha ISO 8601 inicio del rango
  hasta?: string;         // Fecha ISO 8601 fin del rango
}
