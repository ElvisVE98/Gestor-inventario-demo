/**
 * auth.service.ts
 *
 * Maneja login, logout, cambio de contraseña, recuperación de contraseña
 * y gestión de usuarios del sistema.
 *
 * El token se guarda en localStorage para que sobreviva recargas de página.
 * El usuario también se guarda en localStorage para que AuthContext pueda
 * restaurar el estado sin hacer una llamada a la API al cargar la app.
 *
 * Claves usadas en localStorage:
 *   ti_token   → el JWT que se envía en cada request al backend
 *   ti_usuario → objeto { id, email } del usuario autenticado
 */

import type { UsuarioAuth, LoginRespuesta, UsuarioAdmin } from '../types/auth.types'
import type { ApiResponse } from '../types/api.types'
import { fetchConAuth } from './api'

// URL base de la API desde la variable de entorno de Vite
const API_URL = import.meta.env.VITE_API_URL as string

// Claves de localStorage — constantes para evitar typos al usarlas en varios archivos
export const TOKEN_KEY   = 'ti_token'
export const USUARIO_KEY = 'ti_usuario'

/**
 * Lee el token JWT desde localStorage.
 * Devuelve null si el usuario no está autenticado o si no hay token guardado.
 * Todos los services usan esta función para construir el header Authorization.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Lee los datos del usuario guardados en localStorage.
 * Se usa al iniciar la app para restaurar la sesión sin llamar a la API.
 * Devuelve null si no hay sesión activa o si el JSON está corrupto.
 */
export function getUsuarioGuardado(): UsuarioAuth | null {
  const raw = localStorage.getItem(USUARIO_KEY)

  if (!raw) return null

  try {
    // Intentamos parsear — puede fallar si el valor fue corrompido
    return JSON.parse(raw) as UsuarioAuth
  } catch {
    // Si el JSON es inválido, lo limpiamos para no quedarnos en estado inconsistente
    localStorage.removeItem(USUARIO_KEY)
    return null
  }
}

/**
 * Autentica al usuario con email y password.
 * Si tiene éxito, guarda el token y los datos del usuario en localStorage.
 *
 * @throws Error con el mensaje del backend si las credenciales son incorrectas
 */
export async function login(email: string, password: string): Promise<LoginRespuesta> {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const json = (await respuesta.json()) as ApiResponse<LoginRespuesta>

  if (!respuesta.ok || !json.success) {
    const errorJson = json as unknown as { error: { message: string } }
    throw new Error(errorJson.error?.message ?? 'Credenciales incorrectas')
  }

  // Persistimos el token y el usuario para que sobrevivan a recargas de página
  localStorage.setItem(TOKEN_KEY, json.data.token)
  localStorage.setItem(USUARIO_KEY, JSON.stringify(json.data.usuario))

  return json.data
}

/**
 * Cierra la sesión del usuario.
 * Llama al backend para invalidar el token en Supabase (aunque falle, limpia localStorage).
 * La limpieza de localStorage siempre ocurre — garantiza que el usuario quede desconectado
 * incluso si la petición al servidor falla por problemas de red.
 */
export async function logout(): Promise<void> {
  const token = getToken()

  // Intentamos invalidar el token en el servidor — no bloqueamos si falla
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Si falla la petición (ej: sin internet), continuamos limpiando localmente
      console.warn('[Auth] No se pudo notificar al servidor el logout. Sesión limpiada localmente.')
    }
  }

  // Limpiamos localStorage siempre — con o sin respuesta del servidor
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USUARIO_KEY)
}

// ── Contraseña y recuperación ──────────────────────────────────────────────────

/**
 * Cambia la contraseña del usuario autenticado.
 * El backend verifica la contraseña actual antes de actualizarla.
 *
 * @param passwordActual - Contraseña actual del usuario
 * @param passwordNueva  - Nueva contraseña deseada (mín 6 caracteres)
 * @throws Error si la contraseña actual es incorrecta o la petición falla
 */
export async function cambiarPassword(
  passwordActual: string,
  passwordNueva: string
): Promise<void> {
  // fetchConAuth no devuelve data en este caso — solo necesitamos que no lance error
  await fetchConAuth<void>(`${API_URL}/auth/cambiar-password`, {
    method: 'POST',
    body: JSON.stringify({ passwordActual, passwordNueva }),
  })
}

/**
 * Envía un email de recuperación de contraseña.
 * Es una llamada pública — no requiere token porque el usuario olvidó su contraseña.
 * Siempre resuelve sin error (el backend no revela si el email existe o no).
 *
 * @param email - Email del usuario que olvidó su contraseña
 */
export async function recuperarPassword(email: string): Promise<void> {
  const respuesta = await fetch(`${API_URL}/auth/recuperar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  const json = await respuesta.json() as ApiResponse<void>

  // Aunque el backend siempre devuelve éxito, manejamos errores de red
  if (!respuesta.ok || !json.success) {
    const err = json as unknown as { error: { message: string } }
    throw new Error(err.error?.message ?? 'Error al enviar el email')
  }
}

// ── Gestión de usuarios (admin) ────────────────────────────────────────────────

/**
 * Obtiene la lista de todos los usuarios del sistema.
 * Usa GET /api/auth/usuarios que llama al admin API de Supabase.
 *
 * @throws Error si la petición falla o el token no tiene permisos
 */
export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  return fetchConAuth<UsuarioAdmin[]>(`${API_URL}/auth/usuarios`)
}

/**
 * Crea un nuevo usuario en el sistema.
 * El usuario queda activo inmediatamente (sin necesidad de confirmar email).
 *
 * @param email    - Email del nuevo usuario
 * @param password - Contraseña inicial (mín 6 caracteres)
 * @throws Error si el email ya existe o los datos son inválidos
 */
export async function crearUsuario(email: string, password: string): Promise<UsuarioAdmin> {
  return fetchConAuth<UsuarioAdmin>(`${API_URL}/auth/usuarios`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/**
 * Elimina un usuario del sistema de forma permanente.
 * No hay borrado lógico para usuarios — la eliminación es definitiva.
 *
 * @param id - UUID del usuario a eliminar
 * @throws Error si el usuario no existe o si intentas eliminarte a ti mismo
 */
export async function eliminarUsuario(id: string): Promise<void> {
  await fetchConAuth<void>(`${API_URL}/auth/usuarios/${id}`, {
    method: 'DELETE',
  })
}
