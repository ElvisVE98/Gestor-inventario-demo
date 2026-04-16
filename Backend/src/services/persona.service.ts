/**
 * persona.service.ts
 *
 * Contiene toda la lógica de negocio relacionada con personas.
 * Los services son los únicos que hablan con Supabase — los controllers
 * no deben hacer consultas directamente.
 *
 * Separar la lógica aquí (y no en el controller) facilita:
 * - Testear la lógica sin depender de HTTP
 * - Reutilizar operaciones en distintos controllers si fuera necesario
 * - Mantener los controllers delgados y legibles
 */

import { supabase } from '../supabaseClient';
import {
  Persona,
  PersonaConActivos,
  CrearPersonaDTO,
  EditarPersonaDTO,
} from '../types/persona.types';
import { notFound, conflict, badRequest } from '../middlewares/errorHandler';
import { registrarHistorial } from './historial.service';

/**
 * Obtiene todas las personas activas.
 * Por defecto filtra solo las activas porque las inactivas (desvinculadas)
 * son historial y no se muestran en las vistas principales.
 *
 * @param incluirInactivos - Si es true, devuelve todas las personas sin filtrar por estado
 */
export async function listarPersonas(incluirInactivos = false): Promise<Persona[]> {
  // Iniciamos la query base
  let query = supabase
    .from('personas')
    .select('*')
    .order('nombre', { ascending: true }); // Ordenamos por nombre para consistencia

  // Solo filtramos por estado activo si no se piden los inactivos
  if (!incluirInactivos) {
    query = query.eq('estado', 'activo');
  }

  const { data, error } = await query;

  if (error) {
    // Re-lanzamos el error de Supabase como error de aplicación
    throw new Error(`Error al listar personas: ${error.message}`);
  }

  return data as Persona[];
}

/**
 * Obtiene el detalle de una persona incluyendo sus activos asignados actualmente.
 * Hace un JOIN manual: primero busca la persona, luego sus asignaciones activas.
 *
 * @param id - UUID de la persona
 */
export async function obtenerPersonaPorId(id: string): Promise<PersonaConActivos> {
  // Paso 1: Buscar la persona
  const { data: persona, error: errorPersona } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single(); // .single() lanza error si no encuentra o encuentra más de uno

  if (errorPersona || !persona) {
    throw notFound(`No se encontró una persona con id: ${id}`);
  }

  // Paso 2: Buscar sus asignaciones activas (fecha_fin IS NULL)
  // Hacemos un select con relaciones para traer los datos del activo en la misma query
  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from('asignaciones')
    .select(`
      id,
      activo_id,
      fecha_inicio,
      activos (
        nombre_equipo,
        categoria,
        modelo
      )
    `)
    .eq('persona_id', id)
    .is('fecha_fin', null); // Solo asignaciones activas

  if (errorAsignaciones) {
    throw new Error(`Error al obtener activos de la persona: ${errorAsignaciones.message}`);
  }

  // Paso 3: Transformamos los datos al formato esperado por PersonaConActivos
  // Supabase devuelve los joins como objetos anidados, los aplanamos aquí
  const activosAsignados = (asignaciones || []).map((asig: any) => ({
    asignacion_id: asig.id,
    activo_id: asig.activo_id,
    nombre_equipo: asig.activos?.nombre_equipo ?? '',
    categoria: asig.activos?.categoria ?? '',
    modelo: asig.activos?.modelo ?? null,
    fecha_inicio: asig.fecha_inicio,
  }));

  return {
    ...(persona as Persona),
    activos_asignados: activosAsignados,
  };
}

/**
 * Crea una persona nueva en la base de datos.
 * Valida que el RUT no esté duplicado antes de insertar.
 *
 * @param datos - Campos para crear la persona (sin id ni timestamps)
 */
export async function crearPersona(datos: CrearPersonaDTO): Promise<Persona> {
  // Validaciones básicas de campos obligatorios
  if (!datos.rut?.trim()) throw badRequest('El campo rut es obligatorio');
  if (!datos.nombre?.trim()) throw badRequest('El campo nombre es obligatorio');
  if (!datos.correo?.trim()) throw badRequest('El campo correo es obligatorio');

  // Verificamos que no exista otra persona con el mismo RUT
  const { data: existente } = await supabase
    .from('personas')
    .select('id')
    .eq('rut', datos.rut.trim())
    .maybeSingle(); // maybeSingle() devuelve null si no encuentra (no lanza error)

  if (existente) {
    throw conflict(`Ya existe una persona con el RUT ${datos.rut}`);
  }

  // Insertamos la persona. Estado inicial siempre es 'activo'.
  const { data, error } = await supabase
    .from('personas')
    .insert({
      ...datos,
      rut: datos.rut.trim(),
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim(),
      estado: 'activo',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear persona: ${error.message}`);
  }

  const personaCreada = data as Persona;

  // Registramos en el historial que se creó una persona
  await registrarHistorial({
    accion: 'PERSONA_CREADA',
    tabla_afectada: 'personas',
    registro_id: personaCreada.id,
    detalle: `Se creó la persona: ${personaCreada.nombre} (${personaCreada.rut})`,
  });

  return personaCreada;
}

/**
 * Edita los datos de una persona existente.
 * Solo actualiza los campos que vienen en el body (los demás se mantienen igual).
 *
 * @param id - UUID de la persona a editar
 * @param datos - Campos a actualizar (todos opcionales)
 */
export async function editarPersona(id: string, datos: EditarPersonaDTO): Promise<Persona> {
  // Verificamos que la persona existe antes de intentar editar
  const { data: existente, error: errorBusqueda } = await supabase
    .from('personas')
    .select('id, nombre')
    .eq('id', id)
    .single();

  if (errorBusqueda || !existente) {
    throw notFound(`No se encontró una persona con id: ${id}`);
  }

  // Realizamos el update con los datos recibidos
  const { data, error } = await supabase
    .from('personas')
    .update(datos)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al editar persona: ${error.message}`);
  }

  const personaEditada = data as Persona;

  await registrarHistorial({
    accion: 'PERSONA_EDITADA',
    tabla_afectada: 'personas',
    registro_id: id,
    detalle: `Se editaron los datos de: ${personaEditada.nombre}`,
  });

  return personaEditada;
}

/**
 * Desactiva una persona (borrado lógico: estado → inactivo).
 * También libera todos sus activos asignados:
 *   1. Cierra las asignaciones activas (fecha_fin = hoy)
 *   2. Cambia el estado de esos activos a 'disponible'
 *
 * Esta operación es importante porque refleja la desvinculación de un trabajador.
 * NUNCA se borra físicamente la persona de la base de datos.
 *
 * @param id - UUID de la persona a desactivar
 */
export async function desactivarPersona(id: string): Promise<void> {
  // Verificamos que la persona existe
  const { data: persona, error: errorBusqueda } = await supabase
    .from('personas')
    .select('id, nombre, estado')
    .eq('id', id)
    .single();

  if (errorBusqueda || !persona) {
    throw notFound(`No se encontró una persona con id: ${id}`);
  }

  if (persona.estado === 'inactivo') {
    throw badRequest('La persona ya está inactiva');
  }

  // Paso 1: Obtener todas las asignaciones activas de esta persona
  const { data: asignaciones, error: errorAsig } = await supabase
    .from('asignaciones')
    .select('id, activo_id')
    .eq('persona_id', id)
    .is('fecha_fin', null);

  if (errorAsig) {
    throw new Error(`Error al buscar asignaciones: ${errorAsig.message}`);
  }

  // Paso 2: Si tiene activos asignados, los liberamos
  if (asignaciones && asignaciones.length > 0) {
    const ahora = new Date().toISOString();

    // IDs de los activos para cambiarles el estado
    const idsActivos = asignaciones.map((a: any) => a.activo_id);
    // IDs de las asignaciones para cerrarlas
    const idsAsignaciones = asignaciones.map((a: any) => a.id);

    // Cerramos las asignaciones activas poniendo fecha_fin = ahora
    const { error: errorCierre } = await supabase
      .from('asignaciones')
      .update({ fecha_fin: ahora })
      .in('id', idsAsignaciones);

    if (errorCierre) {
      throw new Error(`Error al cerrar asignaciones: ${errorCierre.message}`);
    }

    // Cambiamos los activos a 'disponible'
    const { error: errorActivos } = await supabase
      .from('activos')
      .update({ estado: 'disponible' })
      .in('id', idsActivos);

    if (errorActivos) {
      throw new Error(`Error al liberar activos: ${errorActivos.message}`);
    }
  }

  // Paso 3: Marcamos la persona como inactiva
  const { error: errorUpdate } = await supabase
    .from('personas')
    .update({ estado: 'inactivo' })
    .eq('id', id);

  if (errorUpdate) {
    throw new Error(`Error al desactivar persona: ${errorUpdate.message}`);
  }

  // Registramos en el historial
  await registrarHistorial({
    accion: 'PERSONA_DESACTIVADA',
    tabla_afectada: 'personas',
    registro_id: id,
    detalle: `Se desvinculó a ${persona.nombre}. Se liberaron ${asignaciones?.length ?? 0} activos.`,
  });
}
