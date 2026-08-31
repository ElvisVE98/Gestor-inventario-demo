/**
 * services/auth.service.ts
 *
 * Contiene toda la lógica de negocio y llamadas a Supabase relacionadas
 * con autenticación y administración de usuarios.
 *
 * Los controllers de auth llaman a este servicio en lugar de hablar
 * directamente con Supabase, manteniendo la misma arquitectura limpia
 * que el resto de los módulos.
 */

import { supabase, supabaseAdmin } from '../config/supabaseClient';
import { badRequest, AppError } from '../middlewares/errorHandler';

/**
 * Autentica un usuario con email y contraseña en Supabase Auth.
 * Devuelve el token JWT y los datos básicos del usuario.
 */
export async function iniciarSesion(email?: string, password?: string) {
  if (!email?.trim()) throw badRequest('El campo email es obligatorio');
  if (!password)       throw badRequest('El campo password es obligatorio');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    throw new AppError('Credenciales incorrectas. Verifica tu email y contraseña.', 401);
  }

  return {
    token:   data.session.access_token,
    usuario: { id: data.user.id, email: data.user.email ?? '' },
  };
}

/**
 * Solicita el envío de un correo para restablecer contraseña.
 * Por seguridad no revela si el email existe o no.
 */
export async function enviarRecuperacionPassword(email?: string): Promise<void> {
  if (!email?.trim()) throw badRequest('El campo email es obligatorio');
  await supabase.auth.resetPasswordForEmail(email.trim());
}

/**
 * Cierra la sesión activa en Supabase Auth.
 */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Error al cerrar sesión: ${error.message}`);
}

/**
 * Cambia la contraseña del usuario autenticado tras validar la contraseña actual.
 */
export async function cambiarPasswordUsuario(
  email: string,
  userId: string,
  passwordActual?: string,
  passwordNueva?: string
): Promise<void> {
  if (!passwordActual) throw badRequest('La contraseña actual es obligatoria');
  if (!passwordNueva)  throw badRequest('La nueva contraseña es obligatoria');
  if (passwordNueva.length < 6) throw badRequest('La nueva contraseña debe tener al menos 6 caracteres');

  // 1. Verificamos la contraseña actual intentando iniciar sesión
  const { error: errorVerificacion } = await supabase.auth.signInWithPassword({
    email,
    password: passwordActual,
  });

  if (errorVerificacion) {
    throw new AppError('La contraseña actual es incorrecta', 401);
  }

  // 2. Actualizamos la contraseña mediante el cliente admin de Supabase
  const { error: errorActualizacion } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: passwordNueva,
  });

  if (errorActualizacion) {
    throw new Error(`Error al actualizar contraseña: ${errorActualizacion.message}`);
  }
}

/**
 * Lista todos los usuarios registrados en Supabase Auth (solo para administradores).
 */
export async function listarUsuariosAdmin() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) throw new Error(`Error al listar usuarios: ${error.message}`);

  return data.users.map(u => ({
    id:                 u.id,
    email:              u.email ?? '',
    created_at:         u.created_at,
    last_sign_in_at:    u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
  }));
}

/**
 * Crea un usuario nuevo en Supabase Auth con confirmación inmediata de email.
 */
export async function crearUsuarioAdmin(email?: string, password?: string) {
  if (!email?.trim()) throw badRequest('El campo email es obligatorio');
  if (!password)       throw badRequest('El campo password es obligatorio');
  if (password.length < 6) throw badRequest('La contraseña debe tener al menos 6 caracteres');

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email:         email.trim(),
    password,
    email_confirm: true,
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already exists')
    ) {
      throw new AppError('Ya existe un usuario con ese email', 409);
    }
    throw new Error(`Error al crear usuario: ${error.message}`);
  }

  return {
    id:         data.user.id,
    email:      data.user.email ?? '',
    created_at: data.user.created_at,
  };
}

/**
 * Elimina un usuario de Supabase Auth permanentemente.
 * Impide que el usuario se elimine a sí mismo.
 */
export async function eliminarUsuarioAdmin(id: string, usuarioActualId?: string): Promise<void> {
  if (!id) throw badRequest('El ID del usuario es obligatorio');

  if (id === usuarioActualId) {
    throw new AppError('No puedes eliminar tu propio usuario', 400);
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    if (error.message.toLowerCase().includes('not found')) {
      throw new AppError('Usuario no encontrado', 404);
    }
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
}
