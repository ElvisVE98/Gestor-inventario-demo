/**
 * dashboard.service.ts
 *
 * Calcula los KPIs que se muestran en la pantalla principal del sistema.
 * Solo contiene lógica de lectura — no modifica ningún dato.
 *
 * Diseño de las queries:
 *   Supabase permite usar `.select('*', { count: 'exact', head: true })` para
 *   obtener el COUNT de una tabla sin traer las filas al servidor Node.
 *   Esto es mucho más eficiente que traer todos los registros y contar en JS.
 *
 * Todas las queries se ejecutan en paralelo con Promise.all para que el
 * endpoint sea rápido aunque haya muchos KPIs — en vez de esperar cada
 * query en secuencia, todas corren al mismo tiempo.
 */

import { supabase } from '../supabaseClient';

/**
 * Forma del objeto que devuelve obtenerKPIs.
 * Está definido aquí (y no en un archivo de types separado) porque solo
 * lo usa este módulo — no tiene sentido crear un archivo types/dashboard.types.ts
 * para una única interfaz que nadie más importa.
 */
export interface DashboardKPIs {
  // ── Totales de activos ──────────────────────────────────────────────────
  total_activos: number;           // Activos en servicio (excluye dados de baja)

  // Desglose por estado — suman al total de activos
  activos_disponibles: number;     // Listos para asignar
  activos_asignados: number;       // Actualmente en uso por una persona
  activos_en_mantenimiento: number;// En reparación o revisión
  activos_dados_de_baja: number;   // Retirados del servicio (borrado lógico)

  // Desglose por categoría — también suman al total de activos
  total_equipos: number;           // Notebooks y PCs de escritorio
  total_celulares: number;
  total_tablets: number;
  total_licencias: number;         // Licencias de software

  // ── Totales de personas y asignaciones ─────────────────────────────────
  personas_activas: number;        // Personas que actualmente trabajan en la empresa
  asignaciones_activas: number;    // Asignaciones abiertas (fecha_fin IS NULL)
}

/**
 * Obtiene todos los KPIs del dashboard en una sola llamada.
 * Ejecuta las queries en paralelo para minimizar el tiempo de respuesta.
 *
 * Cada query usa `head: true` — esto le dice a Supabase que solo queremos
 * el COUNT del header HTTP, sin traer ninguna fila en el body.
 * Es equivalente a `SELECT COUNT(*) FROM tabla WHERE ...` pero sin overhead.
 */
export async function obtenerKPIs(): Promise<DashboardKPIs> {
  // Lanzamos todas las queries al mismo tiempo.
  // Promise.all espera a que terminen todas antes de continuar.
  // Si alguna falla, Promise.all lanza el error de esa query.
  const [
    resTotal,
    resDisponibles,
    resAsignados,
    resMantenimiento,
    resBaja,
    resEquipos,
    resCelulares,
    resTablets,
    resLicencias,
    resPersonas,
    resAsignaciones,
  ] = await Promise.all([
    // ── Total de activos en servicio (excluye dados de baja) ─────────────
    // Los dados de baja son un estado retirado — no deben sumarse al inventario activo.
    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .neq('estado', 'dado_de_baja'),

    // ── Activos por estado ────────────────────────────────────────────────
    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'disponible'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'asignado'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'en_mantenimiento'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'dado_de_baja'),

    // ── Activos por categoría (también excluyen dados de baja) ───────────
    // Mismo criterio que total_activos: mostrar solo los activos en servicio.
    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', 'equipo')
      .neq('estado', 'dado_de_baja'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', 'celular')
      .neq('estado', 'dado_de_baja'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', 'tablet')
      .neq('estado', 'dado_de_baja'),

    supabase
      .from('activos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', 'licencia')
      .neq('estado', 'dado_de_baja'),

    // ── Personas activas ──────────────────────────────────────────────────
    supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo'),

    // ── Asignaciones activas (fecha_fin IS NULL) ───────────────────────────
    supabase
      .from('asignaciones')
      .select('*', { count: 'exact', head: true })
      .is('fecha_fin', null),
  ]);

  // Verificamos errores. Revisamos cada resultado individualmente para poder
  // dar un mensaje descriptivo de qué query falló.
  if (resTotal.error)        throw new Error(`Error contando activos: ${resTotal.error.message}`);
  if (resDisponibles.error)  throw new Error(`Error contando disponibles: ${resDisponibles.error.message}`);
  if (resAsignados.error)    throw new Error(`Error contando asignados: ${resAsignados.error.message}`);
  if (resMantenimiento.error)throw new Error(`Error contando en mantenimiento: ${resMantenimiento.error.message}`);
  if (resBaja.error)         throw new Error(`Error contando dados de baja: ${resBaja.error.message}`);
  if (resEquipos.error)      throw new Error(`Error contando equipos: ${resEquipos.error.message}`);
  if (resCelulares.error)    throw new Error(`Error contando celulares: ${resCelulares.error.message}`);
  if (resTablets.error)      throw new Error(`Error contando tablets: ${resTablets.error.message}`);
  if (resLicencias.error)    throw new Error(`Error contando licencias: ${resLicencias.error.message}`);
  if (resPersonas.error)     throw new Error(`Error contando personas: ${resPersonas.error.message}`);
  if (resAsignaciones.error) throw new Error(`Error contando asignaciones: ${resAsignaciones.error.message}`);

  // Supabase devuelve el count en la propiedad `.count` del resultado.
  // Usamos `?? 0` como fallback por si count llega null (tabla vacía u otro edge case).
  return {
    total_activos:              resTotal.count          ?? 0,
    activos_disponibles:        resDisponibles.count    ?? 0,
    activos_asignados:          resAsignados.count      ?? 0,
    activos_en_mantenimiento:   resMantenimiento.count  ?? 0,
    activos_dados_de_baja:      resBaja.count           ?? 0,
    total_equipos:              resEquipos.count        ?? 0,
    total_celulares:            resCelulares.count      ?? 0,
    total_tablets:              resTablets.count        ?? 0,
    total_licencias:            resLicencias.count      ?? 0,
    personas_activas:           resPersonas.count       ?? 0,
    asignaciones_activas:       resAsignaciones.count   ?? 0,
  };
}
