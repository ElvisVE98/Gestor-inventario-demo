/**
 * asignacion.service.ts
 *
 * Contiene toda la lógica de negocio relacionada con asignaciones.
 * Una asignación vincula un activo con una persona durante un período.
 *
 * Este módulo coordina tres tablas: asignaciones, activos y personas.
 * Es el más "transaccional" del sistema porque cada operación debe
 * mantener consistencia entre múltiples tablas:
 *   - Crear asignación → activo pasa a 'asignado'
 *   - Devolver activo  → asignación se cierra + activo vuelve a 'disponible'
 *
 * Reglas de negocio críticas:
 *   1. Un activo solo puede tener UNA asignación activa (fecha_fin = null) a la vez
 *   2. Solo se pueden asignar activos en estado 'disponible'
 *   3. Solo se pueden asignar activos a personas 'activas'
 *   4. Dado de baja = nunca se puede asignar (estado 'dado_de_baja')
 */

import { supabase } from '../config/supabaseClient';
import {
  Asignacion,
  AsignacionConDetalle,
  CrearAsignacionDTO,
} from '../types/asignacion.types';
import { notFound, conflict, badRequest } from '../middlewares/errorHandler';
import { registrarHistorial } from './historial.service';

/**
 * Lista asignaciones con sus datos expandidos (persona y activo incluidos).
 * Por defecto devuelve solo las activas (fecha_fin IS NULL).
 *
 * Soporta tres modos de uso:
 *   1. Sin filtros: todas las asignaciones activas del sistema
 *   2. Con persona_id: historial de una persona específica
 *   3. Con activo_id: historial de un activo específico
 *
 * @param soloActivas - Si true (default), solo muestra asignaciones abiertas
 * @param persona_id - Filtrar por persona (opcional)
 * @param activo_id - Filtrar por activo (opcional)
 */
export async function listarAsignaciones(
  soloActivas = true,
  persona_id?: string,
  activo_id?: string
): Promise<AsignacionConDetalle[]> {
  // Usamos el select con joins para traer los datos de persona y activo en una sola query.
  // Supabase expande automáticamente las relaciones por FK definidas en la BD.
  let query = supabase
    .from('asignaciones')
    .select(`
      *,
      personas (nombre, rut, cargo, sucursal),
      activos (nombre_equipo, categoria, modelo, marca)
    `)
    .order('fecha_inicio', { ascending: false }); // Más reciente primero

  // Filtramos solo las activas si se pide (fecha_fin es null → asignación abierta)
  if (soloActivas) {
    query = query.is('fecha_fin', null);
  }

  // Aplicamos filtros de persona o activo si fueron proporcionados
  if (persona_id) {
    query = query.eq('persona_id', persona_id);
  }

  if (activo_id) {
    query = query.eq('activo_id', activo_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al listar asignaciones: ${error.message}`);
  }

  // Transformamos el resultado de Supabase al formato AsignacionConDetalle.
  // Supabase devuelve los joins como objetos anidados con el nombre de la tabla.
  const asignaciones = (data || []).map((row: any) => ({
    // Campos propios de la asignación (spread del row sin los objetos anidados)
    id: row.id,
    persona_id: row.persona_id,
    activo_id: row.activo_id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    observaciones: row.observaciones,
    created_at: row.created_at,
    // Objeto persona aplanado desde el join
    persona: {
      nombre: row.personas?.nombre ?? '',
      rut: row.personas?.rut ?? '',
      cargo: row.personas?.cargo ?? '',
      sucursal: row.personas?.sucursal ?? '',
    },
    // Objeto activo aplanado desde el join
    activo: {
      nombre_equipo: row.activos?.nombre_equipo ?? '',
      categoria: row.activos?.categoria ?? '',
      modelo: row.activos?.modelo ?? null,
      marca: row.activos?.marca ?? null,
    },
  })) as AsignacionConDetalle[];

  return asignaciones;
}

/**
 * Obtiene el detalle de una asignación específica con datos de persona y activo.
 *
 * @param id - UUID de la asignación
 */
export async function obtenerAsignacionPorId(id: string): Promise<AsignacionConDetalle> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select(`
      *,
      personas (nombre, rut, cargo, sucursal),
      activos (nombre_equipo, categoria, modelo, marca)
    `)
    .eq('id', id)
    .single(); // .single() lanza error si no encuentra exactamente uno

  if (error || !data) {
    throw notFound(`No se encontró una asignación con id: ${id}`);
  }

  // Aplanamos el resultado igual que en listarAsignaciones
  const row = data as any;

  return {
    id: row.id,
    persona_id: row.persona_id,
    activo_id: row.activo_id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    observaciones: row.observaciones,
    created_at: row.created_at,
    persona: {
      nombre: row.personas?.nombre ?? '',
      rut: row.personas?.rut ?? '',
      cargo: row.personas?.cargo ?? '',
      sucursal: row.personas?.sucursal ?? '',
    },
    activo: {
      nombre_equipo: row.activos?.nombre_equipo ?? '',
      categoria: row.activos?.categoria ?? '',
      modelo: row.activos?.modelo ?? null,
      marca: row.activos?.marca ?? null,
    },
  };
}

/**
 * Crea una nueva asignación (asigna un activo a una persona).
 *
 * Antes de insertar, verifica todas las reglas de negocio:
 *   1. La persona existe y está activa
 *   2. El activo existe y su estado es 'disponible' (no asignado, no dado de baja)
 *   3. El activo no tiene ya una asignación activa abierta
 *
 * Luego de insertar:
 *   - Cambia el estado del activo a 'asignado'
 *   - Registra la acción en el historial con el usuario responsable
 *
 * @param datos - persona_id, activo_id y opcionalmente fecha_inicio y observaciones
 * @param realizado_por - Email del usuario autenticado que crea la asignación
 */
export async function crearAsignacion(
  datos: CrearAsignacionDTO,
  realizado_por?: string
): Promise<AsignacionConDetalle> {
  // Validamos campos obligatorios
  if (!datos.persona_id) throw badRequest('El campo persona_id es obligatorio');
  if (!datos.activo_id) throw badRequest('El campo activo_id es obligatorio');

  // ── Validación 1: La persona existe y está activa ─────────────────────────
  const { data: persona, error: errorPersona } = await supabase
    .from('personas')
    .select('id, nombre, estado')
    .eq('id', datos.persona_id)
    .single();

  if (errorPersona || !persona) {
    throw notFound(`No se encontró una persona con id: ${datos.persona_id}`);
  }

  // No tiene sentido asignar activos a personas que ya no trabajan en la empresa
  if (persona.estado === 'inactivo') {
    throw badRequest(`La persona "${persona.nombre}" está inactiva y no puede recibir activos`);
  }

  // ── Validación 2: El activo existe y está disponible ─────────────────────
  const { data: activo, error: errorActivo } = await supabase
    .from('activos')
    .select('id, nombre_equipo, estado, categoria')
    .eq('id', datos.activo_id)
    .single();

  if (errorActivo || !activo) {
    throw notFound(`No se encontró un activo con id: ${datos.activo_id}`);
  }

  // Un activo dado de baja fue retirado del servicio — no puede asignarse nunca
  if (activo.estado === 'dado_de_baja') {
    throw badRequest(`El activo "${activo.nombre_equipo}" está dado de baja y no puede asignarse`);
  }

  // Si está en mantenimiento tampoco está disponible
  if (activo.estado === 'en_mantenimiento') {
    throw badRequest(`El activo "${activo.nombre_equipo}" está en mantenimiento y no puede asignarse`);
  }

  // ── Validación 3: El activo no tiene ya una asignación activa ────────────
  // Un activo solo puede tener un dueño a la vez — esta es la regla más importante
  const { data: asignacionExistente } = await supabase
    .from('asignaciones')
    .select('id')
    .eq('activo_id', datos.activo_id)
    .is('fecha_fin', null) // null = asignación activa
    .maybeSingle();

  if (asignacionExistente) {
    throw conflict(
      `El activo "${activo.nombre_equipo}" ya está asignado. Primero debe ser devuelto antes de asignarse a otra persona`
    );
  }

  // ── Inserción de la asignación ────────────────────────────────────────────
  // Si no se envía fecha_inicio, usamos el momento actual
  const fechaInicio = datos.fecha_inicio ?? new Date().toISOString();

  const { data: nuevaAsig, error: errorInsert } = await supabase
    .from('asignaciones')
    .insert({
      persona_id: datos.persona_id,
      activo_id: datos.activo_id,
      fecha_inicio: fechaInicio,
      fecha_fin: null, // null indica que la asignación está activa
      observaciones: datos.observaciones ?? null,
    })
    .select()
    .single();

  if (errorInsert) {
    throw new Error(`Error al crear asignación: ${errorInsert.message}`);
  }

  // ── Cambio de estado del activo ───────────────────────────────────────────
  // El activo deja de estar disponible — ahora está en manos de una persona
  const { error: errorEstado } = await supabase
    .from('activos')
    .update({ estado: 'asignado' })
    .eq('id', datos.activo_id);

  if (errorEstado) {
    throw new Error(`Error al actualizar estado del activo: ${errorEstado.message}`);
  }

  // ── Historial ─────────────────────────────────────────────────────────────
  await registrarHistorial({
    accion: 'ACTIVO_ASIGNADO',
    tabla_afectada: 'asignaciones',
    registro_id: (nuevaAsig as Asignacion).id,
    detalle: `"${activo.nombre_equipo}" asignado a ${persona.nombre}`,
    realizado_por,
  });

  // Devolvemos el detalle completo con datos de persona y activo ya expandidos
  return obtenerAsignacionPorId((nuevaAsig as Asignacion).id);
}

/**
 * Cierra una asignación (devuelve el activo).
 * Establece fecha_fin = ahora, guarda observaciones si se enviaron y cambia el estado del activo a 'disponible'.
 *
 * Esta operación es el inverso de crearAsignacion.
 * Después de esta operación el activo puede volver a asignarse.
 *
 * @param id - UUID de la asignación a cerrar
 * @param observaciones - Nota opcional sobre la devolución del activo
 * @param realizado_por - Email del usuario autenticado que recibe la devolución
 */
export async function devolverActivo(
  id: string,
  observaciones?: string,
  realizado_por?: string
): Promise<AsignacionConDetalle> {
  // Verificamos que la asignación existe
  const { data: asignacion, error: errorBusqueda } = await supabase
    .from('asignaciones')
    .select(`
      id,
      activo_id,
      persona_id,
      fecha_fin,
      observaciones,
      personas (nombre),
      activos (nombre_equipo)
    `)
    .eq('id', id)
    .single();

  if (errorBusqueda || !asignacion) {
    throw notFound(`No se encontró una asignación con id: ${id}`);
  }

  // Solo se puede devolver una asignación que está activa (fecha_fin = null)
  // Si fecha_fin ya tiene valor, el activo ya fue devuelto antes
  if (asignacion.fecha_fin !== null) {
    throw badRequest('Esta asignación ya está cerrada (el activo fue devuelto anteriormente)');
  }

  const ahora = new Date().toISOString();

  // ── Cierre de la asignación ───────────────────────────────────────────────
  // Ponemos fecha_fin para marcar que el período de uso terminó
  // Si se enviaron nuevas observaciones de devolución, las actualizamos
  const payloadActualizacion: { fecha_fin: string; observaciones?: string } = { fecha_fin: ahora };
  if (observaciones?.trim()) {
    payloadActualizacion.observaciones = observaciones.trim();
  }

  const { error: errorCierre } = await supabase
    .from('asignaciones')
    .update(payloadActualizacion)
    .eq('id', id);

  if (errorCierre) {
    throw new Error(`Error al cerrar la asignación: ${errorCierre.message}`);
  }

  // ── Cambio de estado del activo ───────────────────────────────────────────
  // El activo vuelve al pool de disponibles para ser asignado de nuevo
  const { error: errorEstado } = await supabase
    .from('activos')
    .update({ estado: 'disponible' })
    .eq('id', asignacion.activo_id);

  if (errorEstado) {
    throw new Error(`Error al liberar el activo: ${errorEstado.message}`);
  }

  // ── Historial ─────────────────────────────────────────────────────────────
  // Usamos los datos del join para el mensaje sin hacer otra consulta
  const nombreActivo = (asignacion.activos as any)?.nombre_equipo ?? asignacion.activo_id;
  const nombrePersona = (asignacion.personas as any)?.nombre ?? asignacion.persona_id;
  const detalleObs = observaciones?.trim() ? ` (Nota: ${observaciones.trim()})` : '';

  await registrarHistorial({
    accion: 'ACTIVO_DEVUELTO',
    tabla_afectada: 'asignaciones',
    registro_id: id,
    detalle: `"${nombreActivo}" devuelto por ${nombrePersona}${detalleObs}`,
    realizado_por,
  });

  // Devolvemos la asignación ya cerrada con todos sus detalles expandidos
  return obtenerAsignacionPorId(id);
}
