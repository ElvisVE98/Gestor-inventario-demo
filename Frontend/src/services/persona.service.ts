/**
 * persona.service.ts
 *
 * Funciones que llaman a los endpoints de personas de la API.
 * Todas usan fetchConAuth para incluir el token JWT automáticamente.
 *
 * Ninguna función aquí contiene lógica de negocio — solo traducen
 * la intención del componente en peticiones HTTP al backend.
 */

import { fetchConAuth } from './api'
import type {
  Persona,
  PersonaConActivos,
  CrearPersonaDTO,
  EditarPersonaDTO,
} from '../types/persona.types'

// URL base de la API desde la variable de entorno de Vite
const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Obtiene la lista de personas activas.
 * El backend excluye las inactivas por defecto.
 *
 * @throws Error si la petición falla o el token expiró
 */
export async function getPersonas(): Promise<Persona[]> {
  return fetchConAuth<Persona[]>(`${API_URL}/personas`)
}

/**
 * Obtiene todas las personas, incluyendo las inactivas.
 * Usa el parámetro incluirInactivos=true del backend.
 * Necesario para mostrar el historial completo en PersonasPage.
 *
 * @throws Error si la petición falla o el token expiró
 */
export async function getPersonasTodas(): Promise<Persona[]> {
  return fetchConAuth<Persona[]>(`${API_URL}/personas?incluirInactivos=true`)
}

/**
 * Obtiene el detalle de una persona incluyendo sus activos asignados.
 *
 * @param id - UUID de la persona
 * @throws Error si no existe la persona o la petición falla
 */
export async function getPersonaById(id: string): Promise<PersonaConActivos> {
  return fetchConAuth<PersonaConActivos>(`${API_URL}/personas/${id}`)
}

/**
 * Crea una persona nueva.
 * El backend valida que el RUT no esté duplicado.
 *
 * @param datos - Todos los campos son obligatorios
 * @throws Error si el RUT ya existe o falta algún campo requerido
 */
export async function crearPersona(datos: CrearPersonaDTO): Promise<Persona> {
  return fetchConAuth<Persona>(`${API_URL}/personas`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

/**
 * Edita los campos de una persona existente.
 * Solo se actualiza lo que se envía — los demás campos quedan igual.
 *
 * @param id    - UUID de la persona a editar
 * @param datos - Campos a actualizar (todos opcionales, sin RUT)
 * @throws Error si la persona no existe o la petición falla
 */
export async function editarPersona(id: string, datos: EditarPersonaDTO): Promise<Persona> {
  return fetchConAuth<Persona>(`${API_URL}/personas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

/**
 * Desactiva una persona (borrado lógico: estado → inactivo).
 * El backend también libera todos sus activos asignados.
 *
 * @param id - UUID de la persona a desactivar
 * @throws Error si la persona no existe o ya está inactiva
 */
export async function desactivarPersona(id: string): Promise<void> {
  // El backend responde con { success: true, message: "..." } sin campo data
  // fetchConAuth devuelve json.data que en este caso es undefined — lo ignoramos
  await fetchConAuth<void>(`${API_URL}/personas/${id}`, {
    method: 'DELETE',
  })
}
