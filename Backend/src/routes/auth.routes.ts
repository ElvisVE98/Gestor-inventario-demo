/**
 * auth.routes.ts
 *
 * Todos los endpoints de autenticación y gestión de usuarios del sistema.
 * Mezcla rutas públicas (no requieren token) y privadas (requieren token por ruta).
 *
 * Rutas PÚBLICAS (sin token):
 *   POST /api/auth/login              → autentica con email + password
 *   POST /api/auth/recuperar-password → envía email de recuperación de contraseña
 *
 * Rutas PRIVADAS (token requerido por ruta con verificarToken):
 *   POST   /api/auth/logout              → invalida la sesión actual
 *   POST   /api/auth/cambiar-password    → cambia la contraseña del usuario autenticado
 *   GET    /api/auth/usuarios            → lista todos los usuarios del sistema (admin)
 *   POST   /api/auth/usuarios            → crea un usuario nuevo (admin)
 *   DELETE /api/auth/usuarios/:id        → elimina un usuario permanentemente (admin)
 *
 * Todas las operaciones de admin usan supabase con service_role key,
 * que ya tiene privilegios de admin sobre Supabase Auth.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { badRequest, AppError } from '../middlewares/errorHandler';
import { RequestAutenticado, verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// ── Rutas PÚBLICAS ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Autentica un usuario con email y password.
 * Supabase verifica las credenciales y devuelve un JWT de sesión.
 *
 * Body: { email: string, password: string }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    // Validamos que lleguen ambos campos antes de llamar a Supabase
    if (!email?.trim()) throw badRequest('El campo email es obligatorio');
    if (!password)       throw badRequest('El campo password es obligatorio');

    // signInWithPassword verifica las credenciales en Supabase Auth.
    // Si son incorrectas, Supabase devuelve un error (no lanza excepción).
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      // Devolvemos mensaje genérico — no revelamos si el email existe o no
      res.status(401).json({
        success: false,
        error: { message: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        token:   data.session.access_token,
        usuario: { id: data.user.id, email: data.user.email },
      },
      message: 'Sesión iniciada correctamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/recuperar-password
 *
 * Envía un email de recuperación de contraseña al usuario.
 * Es una ruta PÚBLICA porque el usuario no tiene token si olvidó su contraseña.
 *
 * Supabase envía un email con un link que permite al usuario
 * establecer una nueva contraseña sin conocer la actual.
 *
 * Body: { email: string }
 *
 * Importante: siempre devolvemos éxito aunque el email no exista,
 * para no revelar qué emails están registrados en el sistema.
 */
router.post('/recuperar-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email?.trim()) throw badRequest('El campo email es obligatorio');

    // resetPasswordForEmail envía el correo de recuperación.
    // No verificamos si el email existe — siempre respondemos igual por seguridad.
    // Supabase silenciosamente no envía nada si el email no existe.
    await supabase.auth.resetPasswordForEmail(email.trim());

    res.json({
      success: true,
      message: 'Si el email existe en el sistema, recibirás un enlace para restablecer tu contraseña.',
    });
  } catch (error) {
    next(error);
  }
});

// ── Rutas PRIVADAS (requieren token) ───────────────────────────────────────────

/**
 * POST /api/auth/logout
 *
 * Cierra la sesión del usuario autenticado.
 * Invalida el token en Supabase para que no pueda usarse más.
 */
router.post('/logout', verificarToken, async (req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw new Error(`Error al cerrar sesión: ${error.message}`);

    res.json({
      success: true,
      message: `Sesión cerrada correctamente. Hasta luego, ${req.usuario?.email}.`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/cambiar-password
 *
 * Permite al usuario autenticado cambiar su propia contraseña.
 * Verifica la contraseña actual antes de cambiarla para evitar
 * que alguien con una sesión robada pueda cambiar la contraseña.
 *
 * Flujo:
 *   1. Verifica passwordActual haciendo signInWithPassword con el email del usuario
 *   2. Si falla → 401 "Contraseña actual incorrecta"
 *   3. Si pasa → usa admin API para actualizar la contraseña
 *
 * Body: { passwordActual: string, passwordNueva: string }
 */
router.post('/cambiar-password', verificarToken, async (req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { passwordActual, passwordNueva } = req.body as {
      passwordActual?: string;
      passwordNueva?:  string;
    };

    if (!passwordActual) throw badRequest('La contraseña actual es obligatoria');
    if (!passwordNueva)  throw badRequest('La nueva contraseña es obligatoria');
    if (passwordNueva.length < 6) throw badRequest('La nueva contraseña debe tener al menos 6 caracteres');

    const email = req.usuario!.email;
    const userId = req.usuario!.id;

    // Verificamos la contraseña actual intentando autenticar con ella.
    // Es la única forma segura de confirmar que el usuario conoce su contraseña actual.
    const { error: errorVerificacion } = await supabase.auth.signInWithPassword({
      email,
      password: passwordActual,
    });

    if (errorVerificacion) {
      // Contraseña actual incorrecta — respondemos con 401
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    // Contraseña actual verificada → actualizamos usando el admin API.
    // Requiere supabaseAdmin (service_role key) — con anon key devuelve "User not allowed"
    const { error: errorActualizacion } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: passwordNueva,
    });

    if (errorActualizacion) {
      throw new Error(`Error al actualizar contraseña: ${errorActualizacion.message}`);
    }

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/usuarios
 *
 * Lista todos los usuarios registrados en Supabase Auth.
 * Solo accesible por usuarios autenticados (cualquier usuario del sistema puede verlos).
 * En un sistema productivo restringiríamos esto a un rol de administrador.
 *
 * Usa el admin API de Supabase que requiere el service_role key (ya configurado).
 */
router.get('/usuarios', verificarToken, async (_req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
  try {
    // listUsers devuelve todos los usuarios de Supabase Auth (no de la tabla personas).
    // Requiere supabaseAdmin (service_role key) — con anon key devuelve "User not allowed"
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw new Error(`Error al listar usuarios: ${error.message}`);

    // Enviamos solo los campos necesarios para la tabla del frontend
    const usuarios = data.users.map(u => ({
      id:                 u.id,
      email:              u.email ?? '',
      created_at:         u.created_at,
      last_sign_in_at:    u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
    }));

    res.json({
      success: true,
      data:    usuarios,
      total:   usuarios.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/usuarios
 *
 * Crea un nuevo usuario en Supabase Auth.
 * Usa createUser (admin) que no envía email de confirmación si email_confirm=true.
 * Así el usuario puede iniciar sesión de inmediato sin verificar su correo —
 * apropiado para un sistema interno donde los usuarios son creados por el admin.
 *
 * Body: { email: string, password: string }
 */
router.post('/usuarios', verificarToken, async (_req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = _req.body as { email?: string; password?: string };

    if (!email?.trim()) throw badRequest('El campo email es obligatorio');
    if (!password)       throw badRequest('El campo password es obligatorio');
    if (password.length < 6) throw badRequest('La contraseña debe tener al menos 6 caracteres');

    // email_confirm: true → el usuario queda confirmado de inmediato
    // En un sistema interno no queremos que el admin espere a que el usuario confirme su email.
    // Requiere supabaseAdmin (service_role key) — con anon key devuelve "User not allowed"
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim(),
      password,
      email_confirm: true,
    });

    if (error) {
      // Supabase devuelve error si el email ya está registrado
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')) {
        throw new AppError('Ya existe un usuario con ese email', 409);
      }
      throw new Error(`Error al crear usuario: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      data: {
        id:         data.user.id,
        email:      data.user.email ?? '',
        created_at: data.user.created_at,
      },
      message: 'Usuario creado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/usuarios/:id
 *
 * Elimina un usuario de Supabase Auth de forma permanente.
 * Esta operación NO tiene borrado lógico — el usuario desaparece del sistema.
 * Solo usar cuando realmente se quiere eliminar el acceso.
 *
 * Nota: no permitimos que un usuario se elimine a sí mismo para evitar
 * quedarse sin acceso al sistema accidentalmente.
 */
router.delete('/usuarios/:id', verificarToken, async (req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.params puede tiparse como string | string[] en Express — casteamos a string
    const id = req.params.id as string;

    if (!id) throw badRequest('El ID del usuario es obligatorio');

    // Evitamos que el usuario autenticado se elimine a sí mismo
    if (id === req.usuario?.id) {
      throw new AppError('No puedes eliminar tu propio usuario', 400);
    }

    // Requiere supabaseAdmin (service_role key) — con anon key devuelve "User not allowed"
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      if (error.message.toLowerCase().includes('not found')) {
        throw new AppError('Usuario no encontrado', 404);
      }
      throw new Error(`Error al eliminar usuario: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
