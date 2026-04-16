/**
 * activo.controller.ts
 *
 * Maneja las peticiones HTTP relacionadas con activos.
 * Su único trabajo es:
 *   1. Extraer los datos del request (params, query, body)
 *   2. Llamar al service correspondiente
 *   3. Devolver la respuesta HTTP con el formato correcto
 *
 * NO contiene lógica de negocio — eso vive en activo.service.ts.
 * Si algo falla, llama a next(error) para que el errorHandler lo capture.
 */

import { Request, Response, NextFunction } from 'express';
import {
  listarActivos,
  obtenerActivoPorId,
  crearActivo,
  editarActivo,
  darDeBajaActivo,
} from '../services/activo.service';
import { CrearActivoDTO, EditarActivoDTO, FiltrosActivo, CategoriaActivo, EstadoActivo } from '../types/activo.types';

/**
 * GET /api/activos
 * Lista activos con filtros opcionales por categoría y/o estado.
 * Por defecto excluye los dados de baja.
 *
 * Query params:
 *   ?categoria=equipo|celular|tablet|licencia
 *   ?estado=disponible|asignado|en_mantenimiento|dado_de_baja
 *   ?incluirDadosDeBaja=true  → incluye los activos retirados del servicio
 */
export async function getActivos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Convertimos el string del query param a boolean
    const incluirDadosDeBaja = req.query.incluirDadosDeBaja === 'true';

    // Construimos el objeto de filtros solo con los params que llegaron
    // Casteamos a los tipos literales definidos en activo.types.ts
    const filtros: FiltrosActivo = {};

    if (req.query.categoria) {
      filtros.categoria = req.query.categoria as CategoriaActivo;
    }

    if (req.query.estado) {
      filtros.estado = req.query.estado as EstadoActivo;
    }

    const activos = await listarActivos(filtros, incluirDadosDeBaja);

    res.json({
      success: true,
      data: activos,
      total: activos.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/activos/:id
 * Devuelve el detalle de un activo con la persona que lo tiene asignado actualmente.
 */
export async function getActivoById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.params siempre llega como string en rutas Express
    const id = req.params.id as string;

    const activo = await obtenerActivoPorId(id);

    res.json({
      success: true,
      data: activo,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/activos
 * Crea un activo nuevo.
 * Body mínimo: { nombre_equipo, categoria }
 * El resto de campos son opcionales y dependen de la categoría.
 */
export async function postActivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Pasamos el body completo casteado al DTO.
    // El service valida los campos obligatorios y lanza badRequest si faltan.
    // Usamos el tipo para autocompletar pero no restringimos campos extra aquí —
    // el service solo usa lo que conoce.
    const datos = req.body as CrearActivoDTO;

    const nuevoActivo = await crearActivo(datos);

    // 201 Created es el código correcto para recursos recién creados
    res.status(201).json({
      success: true,
      data: nuevoActivo,
      message: 'Activo creado exitosamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/activos/:id
 * Edita un activo existente. Acepta cualquier subconjunto de los campos editables.
 * No se puede cambiar la categoría (el service lo ignora por diseño).
 */
export async function putActivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const datos = req.body as EditarActivoDTO;

    const activoEditado = await editarActivo(id, datos);

    res.json({
      success: true,
      data: activoEditado,
      message: 'Activo actualizado exitosamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/activos/:id
 * Da de baja un activo (borrado lógico: estado → 'dado_de_baja').
 * Si tenía una asignación activa, la cierra automáticamente.
 * No borra físicamente el registro.
 */
export async function deleteActivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    await darDeBajaActivo(id);

    res.json({
      success: true,
      message: 'Activo dado de baja exitosamente',
    });
  } catch (error) {
    next(error);
  }
}
