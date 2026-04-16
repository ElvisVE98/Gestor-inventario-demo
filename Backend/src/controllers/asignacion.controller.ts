/**
 * asignacion.controller.ts
 *
 * Maneja las peticiones HTTP relacionadas con asignaciones.
 * Su único trabajo es:
 *   1. Extraer los datos del request (params, query, body)
 *   2. Llamar al service correspondiente
 *   3. Devolver la respuesta HTTP con el formato correcto
 *
 * NO contiene lógica de negocio — eso vive en asignacion.service.ts.
 * Si algo falla, llama a next(error) para que el errorHandler lo capture.
 */

import { Request, Response, NextFunction } from 'express';
import {
  listarAsignaciones,
  obtenerAsignacionPorId,
  crearAsignacion,
  devolverActivo,
} from '../services/asignacion.service';
import { CrearAsignacionDTO } from '../types/asignacion.types';

/**
 * GET /api/asignaciones
 * Lista asignaciones con datos de persona y activo expandidos.
 *
 * Query params:
 *   ?soloActivas=false        → incluye historial cerrado (por defecto true = solo activas)
 *   ?persona_id=<uuid>        → filtra por persona (sirve para ver todo lo que tiene asignado)
 *   ?activo_id=<uuid>         → filtra por activo (sirve para ver el historial de un equipo)
 *
 * Los filtros se pueden combinar: ?persona_id=X&soloActivas=false
 * muestra TODO el historial de asignaciones de esa persona.
 */
export async function getAsignaciones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Por defecto solo mostramos las activas para que el listado principal sea útil
    // El frontend puede pedir el historial completo con ?soloActivas=false
    const soloActivas = req.query.soloActivas !== 'false'; // true a menos que se diga false explícitamente

    // Filtros opcionales por persona o activo (ambos vienen como string de UUID)
    const persona_id = req.query.persona_id as string | undefined;
    const activo_id = req.query.activo_id as string | undefined;

    const asignaciones = await listarAsignaciones(soloActivas, persona_id, activo_id);

    res.json({
      success: true,
      data: asignaciones,
      total: asignaciones.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/asignaciones/:id
 * Devuelve el detalle de una asignación con datos completos de persona y activo.
 */
export async function getAsignacionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const asignacion = await obtenerAsignacionPorId(id);

    res.json({
      success: true,
      data: asignacion,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/asignaciones
 * Asigna un activo a una persona.
 * Cambia el estado del activo a 'asignado' automáticamente.
 *
 * Body: { persona_id, activo_id, fecha_inicio?, observaciones? }
 */
export async function postAsignacion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const datos = req.body as CrearAsignacionDTO;

    const nuevaAsignacion = await crearAsignacion(datos);

    // 201 Created es el código correcto para recursos recién creados
    res.status(201).json({
      success: true,
      data: nuevaAsignacion,
      message: 'Activo asignado exitosamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/asignaciones/:id/devolver
 * Cierra una asignación (marca el activo como devuelto).
 * Pone fecha_fin = ahora y cambia el estado del activo a 'disponible'.
 *
 * Usamos /devolver como sub-ruta porque es una acción con nombre específico.
 * Esto hace que la intención sea obvia solo leyendo la URL, sin ambigüedad.
 */
export async function putDevolverActivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const asignacionCerrada = await devolverActivo(id);

    res.json({
      success: true,
      data: asignacionCerrada,
      message: 'Activo devuelto y disponible nuevamente',
    });
  } catch (error) {
    next(error);
  }
}
