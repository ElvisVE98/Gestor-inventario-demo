/**
 * asignacion.service.ts
 *
 * Funciones que llaman a los endpoints de asignaciones de la API.
 * Cubre: listar, crear y cerrar asignaciones.
 * Todas usan fetchConAuth para incluir el token JWT automáticamente.
 */

import { fetchConAuth } from './api'
import type { AsignacionConDetalle, CrearAsignacionDTO } from '../types/asignacion.types'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Obtiene todas las asignaciones activas del sistema.
 * El backend excluye las cerradas (fecha_fin != null) por defecto.
 * Se usa para poblar los listados generales de asignaciones.
 */
export async function getAsignaciones(): Promise<AsignacionConDetalle[]> {
  return fetchConAuth<AsignacionConDetalle[]>(`${API_URL}/asignaciones`)
}

/**
 * Obtiene todo el historial de asignaciones de un activo específico.
 * Incluye tanto las activas (fecha_fin=null) como las cerradas (fecha_fin=fecha).
 * Se usa en la página de detalle del activo para mostrar el historial completo.
 *
 * @param activoId - UUID del activo
 */
export async function getAsignacionesPorActivo(activoId: string): Promise<AsignacionConDetalle[]> {
  // soloActivas=false para traer todo el historial, no solo la asignación actual
  return fetchConAuth<AsignacionConDetalle[]>(
    `${API_URL}/asignaciones?activo_id=${activoId}&soloActivas=false`
  )
}

/**
 * Crea una asignación nueva (activo → persona).
 * El backend valida que el activo esté disponible y la persona activa.
 * También cambia el estado del activo a 'asignado'.
 *
 * @param datos - persona_id y activo_id obligatorios; fecha_inicio y observaciones opcionales
 */
export async function crearAsignacion(datos: CrearAsignacionDTO): Promise<AsignacionConDetalle> {
  return fetchConAuth<AsignacionConDetalle>(`${API_URL}/asignaciones`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

/**
 * Cierra una asignación (devuelve el activo).
 * El backend setea fecha_fin = now() y cambia el activo a 'disponible'.
 *
 * @param id           - UUID de la asignación a cerrar
 * @param observaciones - Nota opcional sobre la devolución
 */
export async function devolverActivo(id: string, observaciones?: string): Promise<AsignacionConDetalle> {
  return fetchConAuth<AsignacionConDetalle>(`${API_URL}/asignaciones/${id}/devolver`, {
    method: 'PUT',
    // Solo incluimos el body si hay observaciones — el endpoint no lo requiere
    body: JSON.stringify(observaciones ? { observaciones } : {}),
  })
}
