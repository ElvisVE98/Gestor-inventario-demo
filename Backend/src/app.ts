/**
 * app.ts
 *
 * Configura y exporta la instancia de Express con todos sus middlewares y rutas.
 * Está separado de server.ts para poder importar la app en tests sin levantar
 * el servidor real (en este proyecto no tenemos tests aún, pero es buena práctica).
 *
 * El orden de registro en Express importa:
 *   1. Middlewares globales (cors, json parser)
 *   2. Rutas PÚBLICAS (health, auth) — sin token requerido
 *   3. Middleware de autenticación — protege todo lo que viene después
 *   4. Rutas PRIVADAS (personas, activos, asignaciones, dashboard)
 *   5. Middleware de errores (siempre al último)
 */

import express from 'express';
import cors from 'cors';
import personaRoutes from './routes/persona.routes';
import activoRoutes from './routes/activo.routes';
import asignacionRoutes from './routes/asignacion.routes';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { verificarToken } from './middlewares/auth.middleware';

const app = express();

// ─── Middlewares globales ──────────────────────────────────────────────────

// cors: permite que el frontend (en otro origen/puerto) pueda llamar a esta API
// En producción deberíamos restringir origin a la URL real del frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL  // Solo el frontend en producción
    : '*',                       // Cualquier origen en desarrollo (cómodo para pruebas)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// express.json: permite recibir y parsear bodies en formato JSON
// limit: '10mb' es suficiente para este sistema (no manejamos archivos grandes aquí)
app.use(express.json({ limit: '10mb' }));

// ─── Rutas PÚBLICAS ────────────────────────────────────────────────────────
// Estas rutas responden ANTES de que se aplique el middleware de autenticación.
// No requieren token porque son precisamente para obtenerlo o verificar el estado.

// Endpoint de salud — útil para health checks en deployment
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API de TI Inventario funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de autenticación: login y logout
// /login es pública porque es donde el usuario obtiene su token
// /logout está aquí pero internamente requiere token (el middleware está dentro de la ruta)
app.use('/api/auth', authRoutes);

// ─── Middleware de autenticación ───────────────────────────────────────────
// Todo lo que se registre DESPUÉS de esta línea requiere un token válido.
// Express aplica los middlewares en orden, así que las rutas públicas de arriba
// ya respondieron antes de llegar aquí.
app.use(verificarToken);

// ─── Rutas PRIVADAS ────────────────────────────────────────────────────────
// Estas rutas solo son accesibles con un token JWT válido en el header:
//   Authorization: Bearer <token>

// Módulo de personas
app.use('/api/personas', personaRoutes);

// Módulo de activos (equipos, celulares, tablets, licencias)
app.use('/api/activos', activoRoutes);

// Módulo de asignaciones (vincula activos con personas)
app.use('/api/asignaciones', asignacionRoutes);

// Módulo de dashboard (KPIs de solo lectura)
app.use('/api/dashboard', dashboardRoutes);

// ─── Manejo de rutas no encontradas ─────────────────────────────────────────

// Si ninguna ruta coincidió, respondemos con 404
// Esto debe ir DESPUÉS de las rutas pero ANTES del errorHandler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Ruta no encontrada' },
  });
});

// ─── Middleware de errores ───────────────────────────────────────────────────

// SIEMPRE al final — Express lo reconoce como error handler por los 4 parámetros
app.use(errorHandler);

export default app;
