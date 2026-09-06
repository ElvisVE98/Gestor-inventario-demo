/**
 * persona.api.ts
 *
 * Módulo de llamadas a los endpoints de personas (/personas) usando Axios.
 *
 * Responsabilidades:
 * - Listado de personas activas e inactivas.
 * - Obtención de detalle de persona con sus activos asignados.
 * - Creación, edición y desactivación (borrado lógico).
 */

import api from './axios.config'
import type {
  Persona,
  PersonaConActivos,
  CrearPersonaDTO,
  EditarPersonaDTO,
} from '../types/persona.types'

/**
 * Obtiene la lista de personas activas.
 */
export async function getPersonas(): Promise<Persona[]> {
  return api.get<never, Persona[]>('/personas')
}

/**
 * Obtiene todas las personas, incluyendo las inactivas para el historial.
 */
export async function getPersonasTodas(): Promise<Persona[]> {
  return api.get<never, Persona[]>('/personas?incluirInactivos=true')
}

/**
 * Obtiene el detalle de una persona por su ID, incluyendo sus activos asignados.
 */
export async function getPersonaById(id: string): Promise<PersonaConActivos> {
  return api.get<never, PersonaConActivos>(`/personas/${id}`)
}

/**
 * Crea una nueva persona en el sistema.
 */
export async function crearPersona(datos: CrearPersonaDTO): Promise<Persona> {
  return api.post<never, Persona>('/personas', datos)
}

/**
 * Actualiza los datos de una persona existente.
 */
export async function editarPersona(id: string, datos: EditarPersonaDTO): Promise<Persona> {
  return api.put<never, Persona>(`/personas/${id}`, datos)
}

/**
 * Desactiva una persona (borrado lógico) y libera automáticamente sus activos.
 */
export async function desactivarPersona(id: string): Promise<void> {
  await api.delete(`/personas/${id}`)
}
