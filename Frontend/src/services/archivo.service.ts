/**
 * archivo.service.ts
 *
 * Funciones para obtener los registros históricos del sistema:
 *   - Personas desactivadas (estado = 'inactivo')
 *   - Activos dados de baja (estado = 'dado_de_baja')
 *
 * Reutiliza los parámetros de los endpoints existentes y filtra
 * en cliente para devolver solo los registros archivados.
 */

import { fetchConAuth } from './api'
import type { Persona } from '../types/persona.types'
import type { Activo }  from '../types/activo.types'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Obtiene las personas desactivadas.
 * Llama a /api/personas?incluirInactivos=true y filtra solo estado='inactivo'.
 *
 * @throws Error si la petición falla o el token expiró
 */
export async function getPersonasInactivas(): Promise<Persona[]> {
  const todas = await fetchConAuth<Persona[]>(`${API_URL}/personas?incluirInactivos=true`)
  // El backend devuelve activas + inactivas — nos quedamos solo con las inactivas
  return todas.filter(p => p.estado === 'inactivo')
}

/**
 * Obtiene los activos dados de baja.
 * Llama a /api/activos?incluirDadosDeBaja=true y filtra solo estado='dado_de_baja'.
 *
 * @throws Error si la petición falla o el token expiró
 */
export async function getActivosDadosDeBaja(): Promise<Activo[]> {
  const todos = await fetchConAuth<Activo[]>(`${API_URL}/activos?incluirDadosDeBaja=true`)
  // El backend devuelve activos + dados de baja — nos quedamos solo con los dados de baja
  return todos.filter(a => a.estado === 'dado_de_baja')
}
