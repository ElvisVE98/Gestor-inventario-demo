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

  // ── Distribución geográfica y por centro de costo ──────────────────────
  costo_por_sucursal:   Array<{ sucursal: string; costo_total: number }>;  // Suma de costo de activos asignados por sucursal
  activos_por_sucursal: Array<{ sucursal: string; total: number }>;         // Cantidad de activos asignados por sucursal
  top_centros_costo:    Array<{ centro_costo: string; total: number }>;     // Top 10 centros de costo con más activos asignados
}

// ── Tipos internos de filas Supabase ────────────────────────────────────────

/** Fila retornada al hacer JOIN asignaciones→activos(costo)+personas(sucursal) */
interface FilaCostoPorSucursal {
  activos:  { costo: number | null } | null;
  personas: { sucursal: string }     | null;
}

/** Fila retornada al hacer JOIN asignaciones→personas(sucursal) */
interface FilaActivosPorSucursal {
  personas: { sucursal: string } | null;
}

/** Fila retornada al hacer JOIN asignaciones→personas(centro_costo) */
interface FilaCentrosCosto {
  personas: { centro_costo: string | null } | null;
}

/**
 * Suma el costo de los activos asignados actualmente, agrupado por sucursal de la persona.
 * Solo considera asignaciones activas (fecha_fin IS NULL) y costos > 0.
 * Retorna el array ordenado de mayor a menor costo.
 */
async function getCostoPorSucursal(): Promise<Array<{ sucursal: string; costo_total: number }>> {
  // Traemos persona.sucursal y activo.costo para cada asignación activa.
  // Supabase soporta JOINs implícitos mediante foreign keys con esta sintaxis.
  const { data, error } = await supabase
    .from('asignaciones')
    .select('activos(costo), personas(sucursal)')
    .is('fecha_fin', null);

  if (error) throw new Error(`Error en costo_por_sucursal: ${error.message}`);

  // Agregamos en JS: acumulamos costo por sucursal usando un Map.
  const mapa = new Map<string, number>();

  for (const fila of (data as unknown as FilaCostoPorSucursal[])) {
    const sucursal = fila.personas?.sucursal;
    const costo    = fila.activos?.costo;
    // Ignoramos nulls y ceros (activos sin precio cargado o sin persona)
    if (!sucursal || !costo || costo <= 0) continue;
    mapa.set(sucursal, (mapa.get(sucursal) ?? 0) + costo);
  }

  return Array.from(mapa.entries())
    .map(([sucursal, costo_total]) => ({ sucursal, costo_total }))
    .sort((a, b) => b.costo_total - a.costo_total);
}

/**
 * Cuenta los activos asignados actualmente, agrupado por sucursal de la persona.
 * Solo considera asignaciones activas (fecha_fin IS NULL).
 * Retorna el array ordenado de mayor a menor cantidad.
 */
async function getActivosPorSucursal(): Promise<Array<{ sucursal: string; total: number }>> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('personas(sucursal)')
    .is('fecha_fin', null);

  if (error) throw new Error(`Error en activos_por_sucursal: ${error.message}`);

  const mapa = new Map<string, number>();

  for (const fila of (data as unknown as FilaActivosPorSucursal[])) {
    const sucursal = fila.personas?.sucursal;
    if (!sucursal) continue;
    mapa.set(sucursal, (mapa.get(sucursal) ?? 0) + 1);
  }

  return Array.from(mapa.entries())
    .map(([sucursal, total]) => ({ sucursal, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Cuenta los activos asignados actualmente, agrupado por centro_costo de la persona.
 * Solo considera asignaciones activas (fecha_fin IS NULL).
 * Retorna los top 10 centros de costo con más activos asignados.
 */
async function getTopCentrosCosto(): Promise<Array<{ centro_costo: string; total: number }>> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('personas(centro_costo)')
    .is('fecha_fin', null);

  if (error) throw new Error(`Error en top_centros_costo: ${error.message}`);

  const mapa = new Map<string, number>();

  for (const fila of (data as unknown as FilaCentrosCosto[])) {
    const cc = fila.personas?.centro_costo;
    if (!cc) continue;
    mapa.set(cc, (mapa.get(cc) ?? 0) + 1);
  }

  return Array.from(mapa.entries())
    .map(([centro_costo, total]) => ({ centro_costo, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);  // Top 10
}

/**
 * Obtiene todos los KPIs del dashboard en una sola llamada.
 * Ejecuta las queries en paralelo para minimizar el tiempo de respuesta.
 *
 * Cada query de COUNT usa `head: true` — esto le dice a Supabase que solo queremos
 * el COUNT del header HTTP, sin traer ninguna fila en el body.
 * Las 3 queries de distribución traen filas y agregan en JS.
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
    costoPorSucursal,
    activosPorSucursal,
    topCentrosCosto,
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

    // ── Distribución por sucursal y centro de costo ───────────────────────
    // Estas 3 funciones hacen JOINs y agregan en JS.
    getCostoPorSucursal(),
    getActivosPorSucursal(),
    getTopCentrosCosto(),
  ]);

  // Verificamos errores de las queries de COUNT.
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
  // Las 3 funciones de distribución lanzan sus propios errores internamente.

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
    costo_por_sucursal:         costoPorSucursal,
    activos_por_sucursal:       activosPorSucursal,
    top_centros_costo:          topCentrosCosto,
  };
}
