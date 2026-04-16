/**
 * persona.controller.ts
 *
 * Maneja las peticiones HTTP relacionadas con personas.
 * Su único trabajo es:
 *   1. Extraer los datos del request (params, query, body)
 *   2. Llamar al service correspondiente
 *   3. Devolver la respuesta HTTP con el formato correcto
 *
 * NO contiene lógica de negocio — eso vive en persona.service.ts.
 * Si algo falla, llama a next(error) para que el errorHandler lo capture.
 */

import { Request, Response, NextFunction } from 'express';
import {
  listarPersonas,
  obtenerPersonaPorId,
  crearPersona,
  editarPersona,
  desactivarPersona,
} from '../services/persona.service';
import { CrearPersonaDTO, EditarPersonaDTO } from '../types/persona.types';

/**
 * GET /api/personas
 * Lista todas las personas. Por defecto solo las activas.
 * Query param: ?incluirInactivos=true para ver también las inactivas.
 */
export async function getPersonas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Convertimos el string del query param a boolean
    const incluirInactivos = req.query.incluirInactivos === 'true';

    const personas = await listarPersonas(incluirInactivos);

    res.json({
      success: true,
      data: personas,
      total: personas.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/personas/:id
 * Devuelve el detalle de una persona con sus activos asignados actualmente.
 */
export async function getPersonaById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Casteamos a string porque req.params siempre llega como string en rutas normales
    const id = req.params.id as string;

    const persona = await obtenerPersonaPorId(id);

    res.json({
      success: true,
      data: persona,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/personas
 * Crea una persona nueva.
 * Body: { rut, nombre, correo, cargo, sucursal, centro_costo }
 */
export async function postPersona(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extraemos solo los campos esperados del body para evitar campos extra no deseados
    const { rut, nombre, correo, cargo, sucursal, centro_costo } = req.body as CrearPersonaDTO;

    const nuevaPersona = await crearPersona({ rut, nombre, correo, cargo, sucursal, centro_costo });

    // 201 Created es el código correcto para recursos recién creados
    res.status(201).json({
      success: true,
      data: nuevaPersona,
      message: 'Persona creada exitosamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/personas/:id
 * Edita una persona existente. Acepta cualquier subconjunto de los campos editables.
 */
export async function putPersona(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const datos = req.body as EditarPersonaDTO;

    const personaEditada = await editarPersona(id, datos);

    res.json({
      success: true,
      data: personaEditada,
      message: 'Persona actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/personas/:id
 * "Elimina" (desactiva) una persona y libera sus activos.
 * No borra físicamente — cambia estado a 'inactivo'.
 */
export async function deletePersona(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    await desactivarPersona(id);

    res.json({
      success: true,
      message: 'Persona desactivada y activos liberados exitosamente',
    });
  } catch (error) {
    next(error);
  }
}
