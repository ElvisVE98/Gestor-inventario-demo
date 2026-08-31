/**
 * routes/auth.routes.ts
 *
 * Endpoints de autenticación y gestión de cuentas de usuario.
 *
 * Rutas PÚBLICAS (sin token):
 *   POST /api/auth/login              → Inicia sesión con email y contraseña
 *   POST /api/auth/recuperar-password → Solicita email de recuperación
 *
 * Rutas PRIVADAS (requieren token Bearer):
 *   POST   /api/auth/logout           → Cierra la sesión
 *   POST   /api/auth/cambiar-password → Cambia la contraseña del usuario
 *   GET    /api/auth/usuarios         → Lista todos los usuarios del sistema
 *   POST   /api/auth/usuarios         → Crea un nuevo usuario
 *   DELETE /api/auth/usuarios/:id     → Elimina un usuario existente
 */

import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware';
import {
  postLogin,
  postRecuperarPassword,
  postLogout,
  postCambiarPassword,
  getUsuarios,
  postUsuario,
  deleteUsuario,
} from '../controllers/auth.controller';

const router = Router();

// ── Rutas Públicas ────────────────────────────────────────────────────────────
router.post('/login', postLogin);
router.post('/recuperar-password', postRecuperarPassword);

// ── Rutas Privadas (requieren token) ──────────────────────────────────────────
router.post('/logout', verificarToken, postLogout);
router.post('/cambiar-password', verificarToken, postCambiarPassword);
router.get('/usuarios', verificarToken, getUsuarios);
router.post('/usuarios', verificarToken, postUsuario);
router.delete('/usuarios/:id', verificarToken, deleteUsuario);

export default router;
