/**
 * controllers/auth.controller.ts
 *
 * Maneja las peticiones HTTP del módulo de autenticación y gestión de usuarios.
 * Extrae los parámetros de la solicitud y delega la ejecución en auth.service.ts.
 */

import { Request, Response, NextFunction } from 'express';
import { RequestAutenticado } from '../middlewares/auth.middleware';
import {
  iniciarSesion,
  enviarRecuperacionPassword,
  cerrarSesion,
  cambiarPasswordUsuario,
  listarUsuariosAdmin,
  crearUsuarioAdmin,
  eliminarUsuarioAdmin,
} from '../services/auth.service';

/**
 * POST /api/auth/login
 * Inicia sesión con email y password. Devuelve JWT y datos del usuario.
 */
export async function postLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const resultado = await iniciarSesion(email, password);

    res.json({
      success: true,
      data: resultado,
      message: 'Sesión iniciada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/recuperar-password
 * Envía email para recuperación de contraseña olvidada.
 */
export async function postRecuperarPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    await enviarRecuperacionPassword(email);

    res.json({
      success: true,
      message: 'Si el email existe en el sistema, recibirás un enlace para restablecer tu contraseña.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Invalida la sesión actual en Supabase.
 */
export async function postLogout(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  try {
    await cerrarSesion();

    res.json({
      success: true,
      message: `Sesión cerrada correctamente. Hasta luego, ${req.usuario?.email}.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/cambiar-password
 * Cambia la contraseña del usuario autenticado actual.
 */
export async function postCambiarPassword(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  try {
    const { passwordActual, passwordNueva } = req.body as {
      passwordActual?: string;
      passwordNueva?:  string;
    };

    const email  = req.usuario!.email;
    const userId = req.usuario!.id;

    await cambiarPasswordUsuario(email, userId, passwordActual, passwordNueva);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/usuarios
 * Lista los usuarios registrados en Supabase Auth.
 */
export async function getUsuarios(_req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuarios = await listarUsuariosAdmin();

    res.json({
      success: true,
      data:  usuarios,
      total: usuarios.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/usuarios
 * Crea un nuevo usuario en el sistema con confirmación automática.
 */
export async function postUsuario(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const nuevoUsuario = await crearUsuarioAdmin(email, password);

    res.status(201).json({
      success: true,
      data: nuevoUsuario,
      message: 'Usuario creado correctamente',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/usuarios/:id
 * Elimina un usuario permanentemente.
 */
export async function deleteUsuario(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    await eliminarUsuarioAdmin(id, req.usuario?.id);

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
}
