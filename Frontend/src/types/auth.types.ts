/**
 * auth.types.ts
 *
 * Tipos relacionados con autenticación y gestión de usuarios.
 * Espeja las formas de respuesta de los endpoints en auth.routes.ts.
 */

/**
 * Datos del usuario autenticado que guardamos en contexto y localStorage.
 */
export interface UsuarioAuth {
  id: string     // UUID de Supabase Auth
  email: string  // Email con el que inició sesión
}

/**
 * Datos que devuelve el backend al hacer login correctamente.
 * Vive dentro del campo `data` de la respuesta estándar.
 */
export interface LoginRespuesta {
  token: string          // JWT para incluir en Authorization: Bearer <token>
  usuario: UsuarioAuth
}

/**
 * Represeta un usuario del sistema tal como lo devuelve GET /api/auth/usuarios.
 * Son usuarios de Supabase Auth, no de la tabla personas.
 */
export interface UsuarioAdmin {
  id:                 string        // UUID de Supabase Auth
  email:              string        // Email de acceso al sistema
  created_at:         string        // ISO 8601 — cuándo se creó la cuenta
  last_sign_in_at:    string | null // ISO 8601 — último inicio de sesión (null si nunca)
  email_confirmed_at: string | null // null si el email no está confirmado
}
