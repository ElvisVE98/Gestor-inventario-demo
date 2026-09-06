/**
 * activo.api.ts
 *
 * Módulo de llamadas a los endpoints de activos (/activos) usando Axios.
 *
 * Responsabilidades:
 * - Listado de activos con filtros opcionales (categoría, estado).
 * - Obtención de detalle de un activo con su historial y persona asignada.
 * - Creación, edición y baja lógica de equipos.
 */

import api from './axios.config'
import type {
  Activo,
  ActivoDetalle,
  CrearActivoDTO,
  EditarActivoDTO,
  FiltrosActivo,
} from '../types/activo.types'

/**
 * Obtiene la lista de activos del inventario con filtros opcionales.
 */
export async function getActivos(filtros?: FiltrosActivo): Promise<Activo[]> {
  const params = new URLSearchParams()
  if (filtros?.categoria) params.set('categoria', filtros.categoria)
  if (filtros?.estado) params.set('estado', filtros.estado)

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return api.get<never, Activo[]>(`/activos${queryString}`)
}

/**
 * Obtiene todos los activos incluyendo los dados de baja.
 */
export async function getActivosConBaja(): Promise<Activo[]> {
  return api.get<never, Activo[]>('/activos?incluirDadosDeBaja=true')
}

/**
 * Obtiene el detalle de un activo por su ID, incluyendo datos de la persona asignada.
 */
export async function getActivoById(id: string): Promise<ActivoDetalle> {
  return api.get<never, ActivoDetalle>(`/activos/${id}`)
}

/**
 * Crea un nuevo activo en el inventario.
 */
export async function crearActivo(datos: CrearActivoDTO): Promise<Activo> {
  return api.post<never, Activo>('/activos', datos)
}

/**
 * Actualiza los datos de un activo existente.
 */
export async function editarActivo(id: string, datos: EditarActivoDTO): Promise<Activo> {
  return api.put<never, Activo>(`/activos/${id}`, datos)
}

/**
 * Da de baja un activo (borrado lógico: estado -> 'dado_de_baja').
 */
export async function darDeBaja(id: string): Promise<void> {
  await api.delete(`/activos/${id}`)
}
