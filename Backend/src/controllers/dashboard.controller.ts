/**
 * dashboard.controller.ts
 *
 * Maneja la petición HTTP del endpoint de dashboard.
 * Es el controller más simple del proyecto: no recibe parámetros,
 * no modifica datos, solo pide los KPIs al service y los devuelve.
 *
 * Un solo endpoint, un solo handler — sin lógica de negocio aquí.
 */

import { Request, Response, NextFunction } from 'express';
import { obtenerKPIs } from '../services/dashboard.service';

/**
 * GET /api/dashboard
 * Devuelve todos los KPIs del sistema en un único objeto.
 * No recibe parámetros — siempre devuelve el estado actual completo.
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kpis = await obtenerKPIs();

    res.json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    next(error);
  }
}
