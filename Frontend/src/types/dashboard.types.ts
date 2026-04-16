/**
 * dashboard.types.ts
 *
 * Tipos para el módulo de dashboard.
 * Espeja exactamente la interfaz DashboardKPIs del backend
 * para que TypeScript pueda validar que estamos usando los campos correctos.
 */

/**
 * Forma del objeto que devuelve GET /api/dashboard.
 * Todos los campos son números (conteos de registros en la BD).
 */
export interface DashboardKPIs {
  // ── Activos por estado ──────────────────────────────────────────────────
  total_activos: number;
  activos_disponibles: number;
  activos_asignados: number;
  activos_en_mantenimiento: number;
  activos_dados_de_baja: number;

  // ── Activos por categoría ───────────────────────────────────────────────
  total_equipos: number;
  total_celulares: number;
  total_tablets: number;
  total_licencias: number;

  // ── Personas y asignaciones ─────────────────────────────────────────────
  personas_activas: number;
  asignaciones_activas: number;
}
