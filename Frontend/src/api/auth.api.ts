/**
 * auth.api.ts
 *
 * Módulo de autenticación y gestión de sesión en el Frontend.
 *
 * Responsabilidades:
 * 1. Llamadas a los endpoints de autenticación (/auth/*) usando Axios.
 * 2. Manejo seguro del token JWT y los datos del usuario en localStorage.
 * 3. Proveer helpers de sesión (getToken, guardarSesion, limpiarSesion).
 */

import api from './axios.config'
import type {
  UsuarioAuth,
  LoginRespuesta,
  UsuarioAdmin,
} from '../types/auth.types'

// Claves utilizadas para almacenar la sesión en el navegador
const TOKEN_KEY = 'auth_token'
const USUARIO_KEY = 'auth_usuario'

// ── Helpers de LocalStorage ───────────────────────────────────────────────────

/**
 * Obtiene el token JWT almacenado en localStorage.
 * Retorna null si no hay sesión iniciada.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Obtiene los datos del usuario guardados en localStorage.
 * Retorna null si no hay sesión o si el JSON está corrupto.
 */
export function getUsuarioGuardado(): UsuarioAuth | null {
  const raw = localStorage.getItem(USUARIO_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UsuarioAuth
  } catch {
    localStorage.removeItem(USUARIO_KEY)
    return null
  }
}

/**
 * Guarda el token JWT y los datos del usuario en localStorage al iniciar sesión.
 */
export function guardarSesion(token: string, usuario: UsuarioAuth): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
}

/**
 * Elimina el token y los datos del usuario de localStorage al cerrar sesión.
 */
export function limpiarSesion(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USUARIO_KEY)
}

// ── Endpoints de Autenticación ────────────────────────────────────────────────

/**
 * Inicia sesión con email y contraseña.
 * Si las credenciales son válidas, guarda el token y el usuario en localStorage.
 */
export async function login(email: string, password: string): Promise<LoginRespuesta> {
  const data = await api.post<never, LoginRespuesta>('/auth/login', { email, password })
  guardarSesion(data.token, data.usuario)
  return data
}

/**
 * Cierra la sesión activa.
 * Notifica al backend para registrar la auditoría y limpia el localStorage.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch {
    console.warn('[Auth] No se pudo notificar al backend el logout. Limpiando sesión local.')
  } finally {
    limpiarSesion()
  }
}

/**
 * Cambia la contraseña del usuario actualmente autenticado.
 */
export async function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  await api.post('/auth/cambiar-password', {
    passwordActual,
    passwordNueva,
  })
}

/**
 * Solicita el correo de restablecimiento de contraseña para un usuario.
 */
export async function recuperarPassword(email: string): Promise<void> {
  await api.post('/auth/recuperar-password', { email })
}

// ── Endpoints de Administración de Usuarios (Solo ADMIN) ──────────────────────

/**
 * Obtiene el listado de todos los usuarios registrados en el sistema.
 */
export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  return api.get<never, UsuarioAdmin[]>('/auth/usuarios')
}

/**
 * Crea una nueva cuenta de usuario en el sistema.
 */
export async function crearUsuario(email: string, password: string): Promise<UsuarioAdmin> {
  return api.post<never, UsuarioAdmin>('/auth/usuarios', { email, password })
}

/**
 * Elimina un usuario por su ID de Supabase.
 */
export async function eliminarUsuario(id: string): Promise<void> {
  await api.delete(`/auth/usuarios/${id}`)
}
