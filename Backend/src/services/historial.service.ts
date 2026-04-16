/**
 * historial.service.ts
 *
 * Maneja la escritura y lectura de la tabla "historial_actividad".
 * Es el servicio más usado internamente porque todos los demás services
 * lo llaman para dejar registro de sus operaciones importantes.
 *
 * La función principal `registrarHistorial` está diseñada para ser silenciosa:
 * si falla al escribir el log, no interrumpe el flujo principal de la operación
 * (loguea en consola pero no lanza error). Esto es intencional — es preferible
 * que la operación real se complete aunque el log falle.
 */

import { supabase } from '../supabaseClient';
import {
  HistorialActividad,
  CrearHistorialDTO,
  FiltrosHistorial,
} from '../types/historial.types';

/**
 * Registra una acción en el historial de actividad.
 * Se llama al final de cada operación importante (crear, editar, desactivar, asignar, etc.)
 *
 * No lanza error si falla — el historial es importante pero no crítico para el negocio.
 * Si falla un registro de log, la operación que lo desencadenó ya fue exitosa.
 *
 * @param datos - Información de la acción a registrar
 */
export async function registrarHistorial(datos: CrearHistorialDTO): Promise<void> {
  const { error } = await supabase
    .from('historial_actividad')
    .insert({
      accion: datos.accion,
      tabla_afectada: datos.tabla_afectada,
      registro_id: datos.registro_id,
      detalle: datos.detalle ?? null,
      realizado_por: datos.realizado_por ?? 'sistema', // "sistema" cuando no hay usuario autenticado
      fecha: new Date().toISOString(),
    });

  // Si falla el log, lo anotamos en consola pero no interrumpimos el flujo
  if (error) {
    console.error('[Historial] Error al registrar actividad:', error.message);
  }
}

/**
 * Obtiene el historial de actividad con filtros opcionales.
 * Devuelve los registros ordenados del más reciente al más antiguo.
 *
 * @param filtros - Opciones para filtrar por tabla, registro o rango de fechas
 */
export async function listarHistorial(filtros: FiltrosHistorial = {}): Promise<HistorialActividad[]> {
  let query = supabase
    .from('historial_actividad')
    .select('*')
    .order('fecha', { ascending: false }) // Más reciente primero
    .limit(500); // Limitamos a 500 para no sobrecargar la respuesta

  // Aplicamos filtros opcionales solo si fueron proporcionados
  if (filtros.tabla_afectada) {
    query = query.eq('tabla_afectada', filtros.tabla_afectada);
  }

  if (filtros.registro_id) {
    query = query.eq('registro_id', filtros.registro_id);
  }

  if (filtros.desde) {
    query = query.gte('fecha', filtros.desde);
  }

  if (filtros.hasta) {
    query = query.lte('fecha', filtros.hasta);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al listar historial: ${error.message}`);
  }

  return data as HistorialActividad[];
}
