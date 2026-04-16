/**
 * activo.service.ts
 *
 * Funciones que llaman a los endpoints de activos de la API.
 * Todas usan fetchConAuth para incluir el token JWT automáticamente.
 */

import { fetchConAuth } from './api'
import type {
  Activo,
  ActivoDetalle,
  CrearActivoDTO,
  EditarActivoDTO,
  FiltrosActivo,
} from '../types/activo.types'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Obtiene la lista de activos con filtros opcionales.
 * Por defecto excluye los dados de baja (comportamiento del backend).
 *
 * @param filtros - Filtrar por categoria y/o estado
 */
export async function getActivos(filtros?: FiltrosActivo): Promise<Activo[]> {
  // Construimos la query string solo con los filtros que vienen definidos
  const params = new URLSearchParams()
  if (filtros?.categoria) params.set('categoria', filtros.categoria)
  if (filtros?.estado)    params.set('estado', filtros.estado)

  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchConAuth<Activo[]>(`${API_URL}/activos${query}`)
}

/**
 * Obtiene todos los activos incluyendo los dados de baja.
 * Wrapper de getActivos con el parámetro incluirDadosDeBaja=true.
 */
export async function getActivosConBaja(): Promise<Activo[]> {
  return fetchConAuth<Activo[]>(`${API_URL}/activos?incluirDadosDeBaja=true`)
}

/**
 * Obtiene el detalle de un activo con la persona asignada incluida.
 *
 * @param id - UUID del activo
 */
export async function getActivoById(id: string): Promise<ActivoDetalle> {
  return fetchConAuth<ActivoDetalle>(`${API_URL}/activos/${id}`)
}

/**
 * Crea un activo nuevo.
 * El backend valida que nombre_equipo sea único.
 *
 * @param datos - nombre_equipo y categoria son obligatorios, el resto opcional
 */
export async function crearActivo(datos: CrearActivoDTO): Promise<Activo> {
  return fetchConAuth<Activo>(`${API_URL}/activos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

/**
 * Edita los campos de un activo existente.
 * No se puede cambiar la categoría.
 *
 * @param id    - UUID del activo
 * @param datos - Campos a actualizar (todos opcionales)
 */
export async function editarActivo(id: string, datos: EditarActivoDTO): Promise<Activo> {
  return fetchConAuth<Activo>(`${API_URL}/activos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

/**
 * Da de baja un activo (borrado lógico: estado → 'dado_de_baja').
 * El backend cierra la asignación activa si existe.
 *
 * @param id - UUID del activo a dar de baja
 */
export async function darDeBaja(id: string): Promise<void> {
  await fetchConAuth<void>(`${API_URL}/activos/${id}`, {
    method: 'DELETE',
  })
}
