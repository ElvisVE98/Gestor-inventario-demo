/**
 * archivo.api.ts
 *
 * Módulo para consultar registros archivados (históricos):
 * - Personas inactivas (desactivadas)
 * - Activos dados de baja
 */

import api from './axios.config'
import type { Persona } from '../types/persona.types'
import type { Activo } from '../types/activo.types'

/**
 * Obtiene la lista de personas inactivas (archivadas).
 */
export async function getPersonasInactivas(): Promise<Persona[]> {
  const todas: Persona[] = await api.get('/personas?incluirInactivos=true')
  return todas.filter((p: Persona) => p.estado === 'inactivo')
}

/**
 * Obtiene la lista de activos dados de baja (archivados).
 */
export async function getActivosDadosDeBaja(): Promise<Activo[]> {
  const todos: Activo[] = await api.get('/activos?incluirDadosDeBaja=true')
  return todos.filter((a: Activo) => a.estado === 'dado_de_baja')
}
