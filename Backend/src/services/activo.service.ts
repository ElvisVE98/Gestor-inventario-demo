/**
 * activo.service.ts
 *
 * Contiene toda la lógica de negocio relacionada con activos.
 * Los services son los únicos que hablan con Supabase — los controllers
 * no deben hacer consultas directamente.
 *
 * Un activo es cualquier bien TI: notebook, PC, celular, tablet o licencia.
 * Todos comparten esta misma tabla y service, diferenciados por el campo `categoria`.
 *
 * Operaciones disponibles:
 *   - listarActivos: filtrar por categoría y/o estado
 *   - obtenerActivoPorId: detalle con la persona que lo tiene asignado
 *   - crearActivo: insertar un activo nuevo validando nombre único
 *   - editarActivo: actualizar campos del activo
 *   - darDeBajaActivo: borrado lógico (estado → 'dado_de_baja') + cierre de asignaciones
 */

import { supabase } from '../config/supabaseClient';
import {
  Activo,
  CrearActivoDTO,
  EditarActivoDTO,
  FiltrosActivo,
} from '../types/activo.types';
import { notFound, conflict, badRequest } from '../middlewares/errorHandler';
import { registrarHistorial } from './historial.service';

/**
 * Tipo interno que extiende Activo para incluir quién lo tiene asignado actualmente.
 * Solo se usa en el detalle (obtenerActivoPorId), no en el listado.
 */
interface ActivoDetalle extends Activo {
  persona_asignada: {
    asignacion_id: string;  // ID de la asignación activa
    persona_id: string;     // ID de la persona
    nombre: string;         // Nombre completo de la persona
    rut: string;            // RUT de la persona
    cargo: string | null;   // Cargo de la persona (puede ser null)
    fecha_inicio: string;   // Desde cuándo tiene el activo
  } | null; // null si el activo no está asignado a nadie
}

/**
 * Lista activos con filtros opcionales de categoría y estado.
 * Por defecto excluye los activos dados de baja para no llenar la vista con basura.
 *
 * @param filtros - Filtrar por `categoria` y/o `estado` (ambos opcionales)
 * @param incluirDadosDeBaja - Si es true, incluye activos con estado 'dado_de_baja'
 */
export async function listarActivos(
  filtros: FiltrosActivo = {},
  incluirDadosDeBaja = false
): Promise<Activo[]> {
  // Iniciamos la query base ordenando por nombre_equipo para consistencia
  let query = supabase
    .from('activos')
    .select('*')
    .order('nombre_equipo', { ascending: true });

  // Excluimos los dados de baja a menos que se pidan explícitamente
  // Esto mantiene las listas limpias en el uso normal del sistema
  if (!incluirDadosDeBaja) {
    query = query.neq('estado', 'dado_de_baja');
  }

  // Aplicamos filtros opcionales solo si fueron proporcionados
  if (filtros.categoria) {
    query = query.eq('categoria', filtros.categoria);
  }

  if (filtros.estado) {
    // Si se filtra por un estado específico, anulamos la exclusión de dados de baja
    // porque el usuario pidió explícitamente ver ese estado
    query = query.eq('estado', filtros.estado);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al listar activos: ${error.message}`);
  }

  return data as Activo[];
}

/**
 * Obtiene el detalle de un activo incluyendo la persona que lo tiene asignado.
 * Hace un JOIN manual: primero busca el activo, luego su asignación activa.
 *
 * @param id - UUID del activo
 */
export async function obtenerActivoPorId(id: string): Promise<ActivoDetalle> {
  // Paso 1: Buscar el activo
  const { data: activo, error: errorActivo } = await supabase
    .from('activos')
    .select('*')
    .eq('id', id)
    .single(); // .single() lanza error si no encuentra o encuentra más de uno

  if (errorActivo || !activo) {
    throw notFound(`No se encontró un activo con id: ${id}`);
  }

  // Paso 2: Buscar si tiene una asignación activa (fecha_fin IS NULL)
  // Traemos los datos de la persona en la misma query con un join
  const { data: asignacion, error: errorAsig } = await supabase
    .from('asignaciones')
    .select(`
      id,
      persona_id,
      fecha_inicio,
      personas (
        nombre,
        rut,
        cargo
      )
    `)
    .eq('activo_id', id)
    .is('fecha_fin', null)
    .maybeSingle(); // maybeSingle() devuelve null si no hay asignación activa (no lanza error)

  if (errorAsig) {
    throw new Error(`Error al buscar asignación del activo: ${errorAsig.message}`);
  }

  // Paso 3: Construimos el objeto persona_asignada aplanando los datos del join
  // Si no hay asignación activa, persona_asignada será null
  const persona_asignada = asignacion
    ? {
        asignacion_id: asignacion.id,
        persona_id: asignacion.persona_id,
        nombre: (asignacion.personas as any)?.nombre ?? '',
        rut: (asignacion.personas as any)?.rut ?? '',
        cargo: (asignacion.personas as any)?.cargo ?? null,
        fecha_inicio: asignacion.fecha_inicio,
      }
    : null;

  return {
    ...(activo as Activo),
    persona_asignada,
  };
}

/**
 * Crea un activo nuevo en la base de datos.
 * Valida que nombre_equipo no esté duplicado antes de insertar.
 * El estado inicial siempre es 'disponible' salvo que se especifique otro.
 *
 * @param datos - Campos para crear el activo (nombre_equipo y categoria son obligatorios)
 * @param realizado_por - Email del usuario autenticado que realiza la creación
 */
export async function crearActivo(datos: CrearActivoDTO, realizado_por?: string): Promise<Activo> {
  // Validaciones básicas de campos obligatorios
  if (!datos.nombre_equipo?.trim()) throw badRequest('El campo nombre_equipo es obligatorio');
  if (!datos.categoria) throw badRequest('El campo categoria es obligatorio');

  // Verificamos que no exista otro activo con el mismo nombre
  // nombre_equipo es el identificador visible del activo (ej: "NB-001"), debe ser único
  const { data: existente } = await supabase
    .from('activos')
    .select('id')
    .eq('nombre_equipo', datos.nombre_equipo.trim())
    .maybeSingle(); // maybeSingle() devuelve null si no encuentra (no lanza error)

  if (existente) {
    throw conflict(`Ya existe un activo con el nombre "${datos.nombre_equipo}"`);
  }

  // Insertamos el activo. Estado inicial es 'disponible' si no se especifica otro.
  const { data, error } = await supabase
    .from('activos')
    .insert({
      ...datos,
      nombre_equipo: datos.nombre_equipo.trim(),
      estado: datos.estado ?? 'disponible', // Por defecto disponible al crearlo
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear activo: ${error.message}`);
  }

  const activoCreado = data as Activo;

  // Dejamos registro en el historial de que se creó este activo
  await registrarHistorial({
    accion: 'ACTIVO_CREADO',
    tabla_afectada: 'activos',
    registro_id: activoCreado.id,
    detalle: `Se creó el activo: ${activoCreado.nombre_equipo} (${activoCreado.categoria})`,
    realizado_por,
  });

  return activoCreado;
}

/**
 * Edita los datos de un activo existente.
 * Solo actualiza los campos que vienen en el body (los demás se mantienen igual).
 * No se puede cambiar la categoría (está excluida en EditarActivoDTO).
 *
 * @param id - UUID del activo a editar
 * @param datos - Campos a actualizar (todos opcionales, sin categoria)
 * @param realizado_por - Email del usuario autenticado que realiza la edición
 */
export async function editarActivo(
  id: string,
  datos: EditarActivoDTO,
  realizado_por?: string
): Promise<Activo> {
  // Verificamos que el activo existe antes de intentar editar
  const { data: existente, error: errorBusqueda } = await supabase
    .from('activos')
    .select('id, nombre_equipo')
    .eq('id', id)
    .single();

  if (errorBusqueda || !existente) {
    throw notFound(`No se encontró un activo con id: ${id}`);
  }

  // Si se está cambiando el nombre_equipo, verificamos que el nuevo nombre no exista ya
  if (datos.nombre_equipo && datos.nombre_equipo.trim() !== existente.nombre_equipo) {
    const { data: nombreDuplicado } = await supabase
      .from('activos')
      .select('id')
      .eq('nombre_equipo', datos.nombre_equipo.trim())
      .maybeSingle();

    if (nombreDuplicado) {
      throw conflict(`Ya existe un activo con el nombre "${datos.nombre_equipo}"`);
    }
  }

  // Realizamos el update con los datos recibidos
  const { data, error } = await supabase
    .from('activos')
    .update(datos)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al editar activo: ${error.message}`);
  }

  const activoEditado = data as Activo;

  await registrarHistorial({
    accion: 'ACTIVO_EDITADO',
    tabla_afectada: 'activos',
    registro_id: id,
    detalle: `Se editaron los datos de: ${activoEditado.nombre_equipo}`,
    realizado_por,
  });

  return activoEditado;
}

/**
 * Da de baja un activo (borrado lógico: estado → 'dado_de_baja').
 * Si el activo está asignado, también cierra la asignación activa.
 *
 * Dar de baja significa que el activo fue retirado del servicio (roto, obsoleto, vendido).
 * NUNCA se borra físicamente — se mantiene el historial de lo que existió.
 *
 * @param id - UUID del activo a dar de baja
 * @param realizado_por - Email del usuario autenticado que realiza la baja
 */
export async function darDeBajaActivo(id: string, realizado_por?: string): Promise<void> {
  // Verificamos que el activo existe
  const { data: activo, error: errorBusqueda } = await supabase
    .from('activos')
    .select('id, nombre_equipo, estado')
    .eq('id', id)
    .single();

  if (errorBusqueda || !activo) {
    throw notFound(`No se encontró un activo con id: ${id}`);
  }

  // Un activo ya dado de baja no puede darse de baja de nuevo
  if (activo.estado === 'dado_de_baja') {
    throw badRequest('El activo ya está dado de baja');
  }

  // Paso 1: Si el activo está asignado, cerramos la asignación activa
  // Un activo puede estar 'asignado' y aun así recibir esta operación
  const { data: asignacion, error: errorAsig } = await supabase
    .from('asignaciones')
    .select('id')
    .eq('activo_id', id)
    .is('fecha_fin', null)
    .maybeSingle();

  if (errorAsig) {
    throw new Error(`Error al buscar asignación del activo: ${errorAsig.message}`);
  }

  if (asignacion) {
    // Cerramos la asignación poniendo fecha_fin = ahora
    const { error: errorCierre } = await supabase
      .from('asignaciones')
      .update({ fecha_fin: new Date().toISOString() })
      .eq('id', asignacion.id);

    if (errorCierre) {
      throw new Error(`Error al cerrar la asignación del activo: ${errorCierre.message}`);
    }
  }

  // Paso 2: Marcamos el activo como dado de baja
  const { error: errorUpdate } = await supabase
    .from('activos')
    .update({ estado: 'dado_de_baja' })
    .eq('id', id);

  if (errorUpdate) {
    throw new Error(`Error al dar de baja el activo: ${errorUpdate.message}`);
  }

  // Registramos en el historial indicando si tenía una asignación que se cerró
  await registrarHistorial({
    accion: 'ACTIVO_DADO_DE_BAJA',
    tabla_afectada: 'activos',
    registro_id: id,
    detalle: `Se dio de baja: ${activo.nombre_equipo}.${asignacion ? ' Se cerró su asignación activa.' : ''}`,
    realizado_por,
  });
}
