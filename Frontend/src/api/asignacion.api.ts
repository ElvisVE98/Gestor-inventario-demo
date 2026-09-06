/**
 * asignacion.api.ts
 *
 * Módulo de llamadas a los endpoints de asignaciones (/asignaciones) usando Axios.
 *
 * Responsabilidades:
 * - Listado de asignaciones activas e historial por activo.
 * - Creación de nueva asignación (persona -> activo).
 * - Devolución de activo (cierre de asignación).
 */

import api from './axios.config'
import type { AsignacionConDetalle, CrearAsignacionDTO } from '../types/asignacion.types'

/**
 * Obtiene todas las asignaciones activas en el sistema.
 */
export async function getAsignaciones(): Promise<AsignacionConDetalle[]> {
  return api.get<never, AsignacionConDetalle[]>('/asignaciones')
}

/**
 * Obtiene el historial completo de asignaciones de un activo específico.
 */
export async function getAsignacionesPorActivo(activoId: string): Promise<AsignacionConDetalle[]> {
  return api.get<never, AsignacionConDetalle[]>(`/asignaciones?activo_id=${activoId}&soloActivas=false`)
}

/**
 * Crea una asignación nueva vinculando un activo con una persona.
 */
export async function crearAsignacion(datos: CrearAsignacionDTO): Promise<AsignacionConDetalle> {
  return api.post<never, AsignacionConDetalle>('/asignaciones', datos)
}

/**
 * Devuelve un activo cerrando su asignación activa.
 */
export async function devolverActivo(id: string, observaciones?: string): Promise<AsignacionConDetalle> {
  return api.put<never, AsignacionConDetalle>(`/asignaciones/${id}/devolver`, {
    observaciones: observaciones || undefined,
  })
}
