/**
 * dashboard.api.ts
 *
 * Módulo de llamadas al endpoint del dashboard (/dashboard) usando Axios.
 */

import api from './axios.config'
import type { DashboardKPIs } from '../types/dashboard.types'

/**
 * Obtiene las métricas y KPIs generales para la vista del Dashboard.
 */
export async function obtenerDashboard(): Promise<DashboardKPIs> {
  return api.get<never, DashboardKPIs>('/dashboard')
}
