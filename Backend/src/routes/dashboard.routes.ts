/**
 * dashboard.routes.ts
 *
 * Define el único endpoint del módulo de dashboard.
 * Es intencionalmente simple: el dashboard es solo lectura y tiene un solo endpoint.
 *
 * Endpoints de este módulo:
 *   GET /api/dashboard → retorna todos los KPIs del sistema
 */

import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';

// Creamos un router de Express para el módulo
const router = Router();

// Un solo endpoint — el dashboard no necesita más
router.get('/', getDashboard);

export default router;
