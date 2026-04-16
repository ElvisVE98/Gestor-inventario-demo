/**
 * persona.routes.ts
 *
 * Define los endpoints de la API relacionados con personas y los conecta
 * con sus controllers correspondientes.
 *
 * Separar las rutas en un archivo propio permite:
 * - Ver de un vistazo todos los endpoints del módulo
 * - Registrar el router completo en app.ts con una sola línea
 * - Mantener app.ts limpio y sin detalles de cada módulo
 *
 * Endpoints de este módulo:
 *   GET    /api/personas          → listar personas (activas por defecto)
 *   GET    /api/personas/:id      → detalle con activos asignados
 *   POST   /api/personas          → crear persona
 *   PUT    /api/personas/:id      → editar persona
 *   DELETE /api/personas/:id      → desactivar persona y liberar activos
 */

import { Router } from 'express';
import {
  getPersonas,
  getPersonaById,
  postPersona,
  putPersona,
  deletePersona,
} from '../controllers/persona.controller';

// Creamos un router de Express para agrupar las rutas del módulo
const router = Router();

// Rutas de colección (sin ID)
router.get('/', getPersonas);
router.post('/', postPersona);

// Rutas de recurso individual (con ID)
router.get('/:id', getPersonaById);
router.put('/:id', putPersona);
router.delete('/:id', deletePersona);

export default router;
