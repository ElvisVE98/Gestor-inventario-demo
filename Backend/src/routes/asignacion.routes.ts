/**
 * asignacion.routes.ts
 *
 * Define los endpoints de la API relacionados con asignaciones y los conecta
 * con sus controllers correspondientes.
 *
 * Separar las rutas en un archivo propio permite:
 * - Ver de un vistazo todos los endpoints del módulo
 * - Registrar el router completo en app.ts con una sola línea
 * - Mantener app.ts limpio y sin detalles de cada módulo
 *
 * Endpoints de este módulo:
 *   GET  /api/asignaciones                → listar asignaciones (activas por defecto)
 *   GET  /api/asignaciones/:id            → detalle de una asignación
 *   POST /api/asignaciones                → crear asignación (asignar activo a persona)
 *   PUT  /api/asignaciones/:id/devolver   → cerrar asignación (devolver activo)
 *
 * Nota sobre el diseño de rutas:
 *   No hay DELETE porque las asignaciones NUNCA se borran — son historial.
 *   La "eliminación" equivalente es /devolver, que cierra el período de uso.
 */

import { Router } from 'express';
import {
  getAsignaciones,
  getAsignacionById,
  postAsignacion,
  putDevolverActivo,
} from '../controllers/asignacion.controller';

// Creamos un router de Express para agrupar las rutas del módulo
const router = Router();

// Rutas de colección (sin ID)
router.get('/', getAsignaciones);
router.post('/', postAsignacion);

// Rutas de recurso individual (con ID)
router.get('/:id', getAsignacionById);

// Acción específica de devolución — usa sub-ruta /devolver para dejar clara la intención
// Va antes de cualquier ruta /:id genérica para que Express no lo confunda con un ID literal
router.put('/:id/devolver', putDevolverActivo);

export default router;
