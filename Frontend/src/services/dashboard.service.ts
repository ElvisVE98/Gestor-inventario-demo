/**
 * dashboard.service.ts
 *
 * Funciones que llaman a los endpoints de dashboard de la API.
 * Usa fetchConAuth para incluir automáticamente el token JWT en el header,
 * ya que /api/dashboard es una ruta protegida que requiere autenticación.
 */

import type { DashboardKPIs } from '../types/dashboard.types'
import { fetchConAuth } from './api'

// URL base de la API desde la variable de entorno de Vite
const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Obtiene los KPIs del dashboard desde la API.
 * fetchConAuth añade el token JWT automáticamente y parsea la respuesta.
 * Lanza un Error con el mensaje del backend si la petición falla.
 *
 * @throws Error si no hay token, el token expiró, o la API responde con error
 */
export async function obtenerDashboard(): Promise<DashboardKPIs> {
  return fetchConAuth<DashboardKPIs>(`${API_URL}/dashboard`)
}
