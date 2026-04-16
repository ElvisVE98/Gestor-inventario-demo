/**
 * activo.routes.ts
 *
 * Define los endpoints de la API relacionados con activos y los conecta
 * con sus controllers correspondientes.
 *
 * Separar las rutas en un archivo propio permite:
 * - Ver de un vistazo todos los endpoints del módulo
 * - Registrar el router completo en app.ts con una sola línea
 * - Mantener app.ts limpio y sin detalles de cada módulo
 *
 * Endpoints de este módulo:
 *   GET    /api/activos          → listar activos (con filtros opcionales por categoria/estado)
 *   GET    /api/activos/:id      → detalle con la persona asignada actualmente
 *   POST   /api/activos          → crear activo
 *   PUT    /api/activos/:id      → editar activo
 *   DELETE /api/activos/:id      → dar de baja activo (borrado lógico)
 */

import { Router } from 'express';
import {
  getActivos,
  getActivoById,
  postActivo,
  putActivo,
  deleteActivo,
} from '../controllers/activo.controller';

// Creamos un router de Express para agrupar las rutas del módulo
const router = Router();

// Rutas de colección (sin ID)
router.get('/', getActivos);
router.post('/', postActivo);

// Rutas de recurso individual (con ID)
router.get('/:id', getActivoById);
router.put('/:id', putActivo);
router.delete('/:id', deleteActivo);

export default router;
